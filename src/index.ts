import { PrismaClient } from "@prisma/client";
import { Elysia } from "elysia";
import { apiRoutes } from "./routes/api";
import { wsRoutes } from "./routes/ws";
import cors from "@elysiajs/cors";

export const prisma = new PrismaClient();
const app = new Elysia()
    .use(apiRoutes)
    .use(wsRoutes)
    .use(cors({
        origin: "http://localhost:3000"
    }))
    .listen(process.env.PORT ?? 3000);

async function main() {
    console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
