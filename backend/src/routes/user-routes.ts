import { Router } from "express";
import { handleEmail } from "../controllers/user-controllers";

const userRoutes = Router();

userRoutes.post('/api/endpoint', handleEmail);

export default userRoutes;
