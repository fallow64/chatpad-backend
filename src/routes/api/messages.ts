import Elysia, { t } from "elysia";
import { prisma } from "../..";
import { isAuthenticated } from "../../middleware/auth";

export const messageRoutes = new Elysia()
    .use(isAuthenticated)
    .post(
        "/messages",
        async ({ body, user }) => {
            const message = await prisma.message.create({
                data: {
                    userId: user.id,
                    messageContents: body.contents,
                },
            });

            return {
                success: true,
                data: message,
            };
        },
        {
            body: t.Object({
                contents: t.String(),
            }),
        }
    )
    .get(
        "/messages",
        async ({ query: { limit } }) => {
            if (!limit) limit = 50;

            const messages = await prisma.message.findMany({
                orderBy: { createdAt: "asc" },
                take: limit,
            });

            return {
                success: true,
                data: messages,
            };
        },
        {
            query: t.Object({
                limit: t.Number({ minimum: 1, maximum: 100, default: 50 }),
            }),
        }
    );
