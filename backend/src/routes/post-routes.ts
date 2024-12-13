import { Router } from "express";
import { createPost, deletePost } from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.post("/new", createPost); // Define the route for creating a post
postRoutes.delete("/delete", deletePost);

export default postRoutes;
