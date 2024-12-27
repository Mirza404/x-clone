import { Router } from "express";
import {
  allPosts,
  createPost,
  deletePost,
  getPost,
} from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.get("/", allPosts);
postRoutes.get("/:id", getPost);
postRoutes.post("/new", createPost);
postRoutes.delete("/delete", deletePost);

export default postRoutes;
