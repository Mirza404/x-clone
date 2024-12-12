import { Router } from "express";
import { createPost } from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.post("/new", createPost); // Define the route for creating a post

export default postRoutes;
