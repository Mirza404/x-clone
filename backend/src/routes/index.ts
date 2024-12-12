import { Router } from "express";
import userRoutes from "./user-routes";
import postRoutes from "./post-routes";
// import authenticateJWT from "../utils/authMiddleware";

const appRouter = Router();

appRouter.use("api/user", userRoutes);

appRouter.use("api/post", postRoutes);

export default appRouter;
