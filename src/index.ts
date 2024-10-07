import { PrismaClient } from "@prisma/client";
import { Elysia } from "elysia";
import { apiRoutes } from "./routes/api";
import { wsRoutes } from "./routes/ws";

export const prisma = new PrismaClient();
const app = new Elysia()
    .get("/", () => Bun.file("src/index.html"))
    .use(apiRoutes)
    .use(wsRoutes)
    .listen(3000);

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
