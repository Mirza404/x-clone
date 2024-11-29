import { Router } from "express";
import { createUser } from "../controllers/user-controllers";

const userRoutes = Router();

userRoutes.post("/new", createUser);

export default userRoutes;
