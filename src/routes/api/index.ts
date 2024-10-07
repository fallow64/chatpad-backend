import Elysia from "elysia";
import { authRoutes } from "./auth";
import { messageRoutes } from "./messages";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .use(messageRoutes);
