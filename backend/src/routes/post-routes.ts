import { Router } from "express";
import {
  allPosts,
  createPost,
  deletePost,
  getPost,
  editPost,
} from "../controllers/post-controller";

const postRoutes = Router();

postRoutes.get("/", allPosts);
postRoutes.get("/:id", getPost);
postRoutes.post("/new", createPost);
postRoutes.delete("/delete", deletePost);
postRoutes.patch("/edit", editPost);

export default postRoutes;
