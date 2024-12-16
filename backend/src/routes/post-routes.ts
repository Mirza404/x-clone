import { Router } from "express";
import { allPosts, createPost, deletePost } from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.get('/', allPosts);
postRoutes.post("/new", createPost); // Define the route for creating a post
postRoutes.delete("/delete", deletePost);

export default postRoutes;
