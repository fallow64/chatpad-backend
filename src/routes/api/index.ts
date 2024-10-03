import Elysia from "elysia";
import { authRoutes } from "./auth";

export const apiRoutes = new Elysia({ prefix: "/api" }).use(authRoutes);
