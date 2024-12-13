import { NextFunction, Response, Request, Router } from "express";
import { handleEmail } from "../controllers/user-controllers";
import { deletePost } from "../controllers/post-controller";

const userRoutes = Router();

userRoutes.post("/endpoint", handleEmail);
userRoutes.delete("/delete", deletePost);

export default userRoutes;
