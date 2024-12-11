import { Router } from "express";
import { createPost } from "src/controllers/post-controller";

const postRoutes = Router();

postRoutes.post("/new", createPost); // Define the route for creating a post

export default postRoutes;