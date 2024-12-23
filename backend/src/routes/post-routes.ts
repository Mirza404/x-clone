import { Router } from "express";
import {
  allPosts,
  createPost,
  deletePost,
} from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.get("/allposts", allPosts);
postRoutes.post("/new", createPost); 
postRoutes.delete("/delete", deletePost);

export default postRoutes;
