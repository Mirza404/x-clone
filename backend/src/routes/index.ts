import { Router } from "express";
import userRoutes from "./user-routes";

const appRouter = Router();

appRouter.use("/user", userRoutes);


export default appRouter;
