import Elysia from "elysia";
import { isAuthenticated } from "../../middleware/auth";
import { prisma } from "../..";

type WSResponse =
    | {
          type: "announceMessage";
          data: {};
      }
    | {
          type: "error";
          message: string;
      }
    | {
          type: "subscribed";
          userId: string;
          channel: string;
      };

export const wsRoutes = new Elysia({
    prefix: "/ws",
    websocket: { idleTimeout: 60 * 60, publishToSelf: true },
})
    .use(isAuthenticated)
    .ws("/", {
        open(ws) {
            const userId = ws.data.user.id;

            ws.subscribe("message");

            const response: WSResponse = {
                type: "subscribed",
                userId,
                channel: "message",
            };
            ws.send(response);
        },
        close(ws) {},
        async message(ws, body) {
            const { user } = ws.data;

            console.log(body);
            if (!(typeof body === "string")) {
                const response: WSResponse = {
                    type: "error",
                    message: "Body must be string",
                };
                ws.send(response);
                return;
            }

            const dbMessage = await prisma.message.create({
                data: {
                    userId: user.id,
                    messageContents: body,
                },
            });

            const commMessage = {
                id: dbMessage.id,
                userId: dbMessage.userId,
                createdAt: dbMessage.createdAt,
                updatedAt: dbMessage.updatedAt,
                messageContents: dbMessage.messageContents,
            };

            let response: WSResponse = {
                type: "announceMessage",
                data: commMessage,
            };

            ws.publish("message", response);
        },
    });
