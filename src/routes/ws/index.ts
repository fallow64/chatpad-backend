import Elysia from "elysia";
import { isAuthenticated } from "../../middleware/auth";
import { prisma } from "../..";

export const wsRoutes = new Elysia({
    prefix: "/ws",
    websocket: { idleTimeout: 60 * 60 },
})
    .use(isAuthenticated)
    .ws("/", {
        open(ws) {
            const { user } = ws.data;

            ws.subscribe("message");
        },
        close(ws) {},
        async message(ws, body) {
            const { user } = ws.data;
            const message = JSON.stringify(body);

            const dbMessage = await prisma.message.create({
                data: {
                    userId: user.id,
                    messageContents: message,
                },
            });

            const commMessage = {
                id: dbMessage.id,
                userId: dbMessage.userId,
                createdAt: dbMessage.createdAt,
                updatedAt: dbMessage.updatedAt,
                messageContents: dbMessage.messageContents,
            };

            ws.publish("message", commMessage);
        },
    });
