import { NextFunction, Response, Request, Router } from "express";
import { handleEmail } from "../controllers/user-controllers";

const userRoutes = Router();

userRoutes.post("/endpoint", handleEmail);

export default userRoutes;
