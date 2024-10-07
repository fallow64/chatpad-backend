import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import { randomUUID } from "node:crypto";
import { prisma } from "..";
import {
    JWT_ACCESS_DURATION_SECONDS,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_DURATION_SECONDS,
    JWT_REFRESH_SECRET,
} from "../util";

/** Provides the JWT token providers and utilities. */
export const chatpadJwt = new Elysia()
    .use(
        jwt({
            name: "jwtAccess",
            secret: JWT_ACCESS_SECRET,
            exp: "30m",
        })
    )
    .use(
        jwt({
            name: "jwtRefresh",
            secret: JWT_REFRESH_SECRET,
            exp: "20160m",
        })
    )
    .derive(
        { as: "scoped" },
        ({
            cookie: { jwtAccessCookie, jwtRefreshCookie },
            jwtAccess,
            jwtRefresh,
        }) => {
            return {
                jwtUtils: {
                    /**
                     * Generates an access token for a provided user ID.
                     * @param userId user id to generate access token for
                     * @returns access token string
                     */
                    generateAccessToken: async (
                        userId: string
                    ): Promise<string> => {
                        return await jwtAccess.sign({
                            sub: userId,
                            tokenType: "access",
                        });
                    },
                    /**
                     * Generates a refresh token for a provided user ID. Also reflects this in the database.
                     * @param userId user id to generate refresh token for
                     * @returns refresh token string
                     */
                    generateRefreshToken: async (
                        userId: string
                    ): Promise<string> => {
                        const tokenId = randomUUID();
                        const refreshToken = await jwtRefresh.sign({
                            sub: userId,
                            tokenType: "refresh",
                            refreshId: tokenId,
                        });

                        await prisma.refreshToken.create({
                            data: {
                                id: tokenId,
                                userId: userId,
                            },
                        });

                        return refreshToken;
                    },
                    /**
                     * Sends an access token to the client as a cookie.
                     * @param accessToken access token string
                     */
                    sendAccessCookie: (accessToken: string) => {
                        jwtAccessCookie.remove();
                        jwtAccessCookie.httpOnly = true;
                        jwtAccessCookie.sameSite = true;
                        jwtAccessCookie.value = accessToken;
                        jwtAccessCookie.maxAge = JWT_ACCESS_DURATION_SECONDS;
                    },
                    /**
                     * Sends a refresh token to the client as a cookie.
                     * @param refreshToken refresh token string
                     */
                    sendRefreshCookie: (refreshToken: string) => {
                        jwtRefreshCookie.remove();
                        jwtRefreshCookie.httpOnly = true;
                        jwtRefreshCookie.sameSite = true;
                        jwtRefreshCookie.value = refreshToken;
                        jwtRefreshCookie.maxAge = JWT_REFRESH_DURATION_SECONDS;
                    },
                    /**
                     * Removes the access cookie from the client.
                     */
                    removeAccessCookie: () => {
                        jwtAccessCookie.remove();
                    },
                    /**
                     * Removes the refresh cookie from the client.
                     */
                    removeRefreshCookie: () => {
                        jwtRefreshCookie.remove();
                    },
                },
            };
        }
    );

/**
 * Auth middleware that prevents unauthorized clients from proceeding in the control flow.
 */
export const isAuthenticated = new Elysia()
    .use(chatpadJwt)
    .derive(
        { as: "scoped" },
        async ({ jwtAccess, set, error, cookie: { jwtAccessCookie } }) => {
            // todo: gotos the best option? lmao
            goodPath: {
                const token = jwtAccessCookie.value;
                // if no access cookie
                if (!token) {
                    return error("Unauthorized", {
                        success: false,
                        message: "Unauthorized",
                    });
                }

                const payload = await jwtAccess.verify(token);
                // if not a valid jwt cookie
                if (!payload) break goodPath;

                // make sure refresh token can't be passed off as access token (redundant?)
                if (payload?.tokenType !== "access") break goodPath;

                const sub = payload.sub as string;
                const user = await prisma.user.findUnique({
                    where: { id: sub },
                });

                // if no user found with id
                if (!user) break goodPath;

                return {
                    user,
                };
            }

            // "bad" path

            return error("Forbidden", { success: false, message: "Forbidden" });
        }
    );

/**
 * An auth middleware that adds the user to the context if they are logged in, but otherwise null.
 */
export const traceUser = new Elysia()
    .use(chatpadJwt)
    .derive(
        { as: "scoped" },
        async ({
            jwtAccess,
            cookie: { jwtAccessCookie, jwtRefreshCookie },
        }) => {
            // todo: gotos the best option? lmao
            goodPath: {
                const token = jwtAccessCookie.value;
                // if no access cookie
                if (!token) break goodPath;

                const payload = await jwtAccess.verify(token);
                // if not a valid jwt cookie
                if (!payload) break goodPath;

                // make sure refresh token can't be passed off as access token (redundant?)
                if (payload?.tokenType !== "access") break goodPath;

                const sub = payload.sub as string;
                const user = await prisma.user.findUnique({
                    where: { id: sub },
                });

                // if no user found with id
                if (!user) break goodPath;

                return {
                    user,
                };
            }

            // "bad" path (or just no user logged in)

            return {
                user: null,
            };
        }
    );
