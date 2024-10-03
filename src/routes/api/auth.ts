import Elysia, { t } from "elysia";
import { prisma } from "../..";
import { chatpadJwt, traceUser } from "../../middleware/auth";
import { sanitizeUser } from "../../util";

export const authRoutes = new Elysia({ prefix: "/auth" })
    .use(chatpadJwt)
    .use(traceUser)
    .post("/logout", async ({ jwtUtils }) => {
        jwtUtils.removeAccessCookie();
        jwtUtils.removeRefreshCookie();
    })
    .post(
        "/refresh",
        async ({ set, cookie: { jwtRefreshCookie }, jwtRefresh, jwtUtils }) => {
            goodPath: {
                // if no refresh cookie value
                if (!jwtRefreshCookie.value) break goodPath;

                const refreshToken = await jwtRefresh.verify(
                    jwtRefreshCookie.value
                );

                // if invalid token
                if (!refreshToken) break goodPath;

                // ensure access cookie can't be passed off as refresh cookie (redundant?)
                if (refreshToken.tokenType !== "refresh") break goodPath;

                // ensure refresh token id exists and is still valid
                const tokenInDB = await prisma.refreshToken.findUnique({
                    where: {
                        id: refreshToken.refreshId as string, // should be safe assumption
                        revoked: false,
                    },
                });

                // token does not exist or is revoked
                if (!tokenInDB) break goodPath;

                // fully authenticated, now send over new access token

                const accessToken = await jwtUtils.generateAccessToken(
                    refreshToken.sub as string // should be safe assumption
                );
                jwtUtils.sendAccessCookie(accessToken);

                return {
                    success: true,
                };
            }

            set.status = "Unauthorized";
            return {
                success: false,
                message: "Unauthorized",
            };
        }
    )
    .post(
        "/login",
        async ({ set, body: { username, password }, jwtUtils }) => {
            const potentialUser = await prisma.user.findUnique({
                where: { username },
            });

            const passwordCorrect =
                potentialUser != null &&
                (await Bun.password.verify(password, potentialUser.hashedPass));
            if (!passwordCorrect) {
                set.status = "Unauthorized";
                return {
                    success: false,
                    message: "Unauthorized",
                };
            }

            // create tokens
            const accessToken = await jwtUtils.generateAccessToken(
                potentialUser.id
            );
            const refreshToken = await jwtUtils.generateRefreshToken(
                potentialUser.id
            );

            // send tokens
            jwtUtils.sendAccessCookie(accessToken);
            jwtUtils.sendRefreshCookie(refreshToken);

            const sanitizedUser = sanitizeUser(potentialUser);
            return {
                success: true,
                data: sanitizedUser,
            };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
            }),
        }
    )
    .post(
        "register",
        async ({ set, body: { username, password }, jwtUtils }) => {
            // check that nobody else uses the same username
            const existingUser = await prisma.user.findUnique({
                where: { username },
            });
            if (existingUser) {
                set.status = "Bad Request";
                return {
                    success: false,
                    message: "Account with username already exists",
                };
            }

            // hash the password
            const hashedPassword = await Bun.password.hash(password);

            // create user
            const newUser = await prisma.user.create({
                data: {
                    username: username,
                    hashedPass: hashedPassword,
                },
            });

            // create tokens
            const accessToken = await jwtUtils.generateAccessToken(newUser.id);
            const refreshToken = await jwtUtils.generateRefreshToken(
                newUser.id
            );

            // send tokens
            jwtUtils.sendAccessCookie(accessToken);
            jwtUtils.sendRefreshCookie(refreshToken);

            const sanitizedUser = sanitizeUser(newUser);
            return { success: true, data: sanitizedUser };
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String({ minLength: 8 }),
            }),
        }
    )
    .get("/me", ({ set, user }) => {
        if (user) {
            const sanitizedUser = sanitizeUser(user);
            return {
                success: true,
                message: "Successfully retrieved account",
                data: sanitizedUser,
            };
        } else {
            set.status = "Not Found";
            return {
                success: false,
                message: "No account found",
            };
        }
    });
