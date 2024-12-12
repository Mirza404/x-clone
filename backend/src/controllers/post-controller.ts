import mongoose from "mongoose";
import Post from "../models/Post";
import { Request, Response } from "express";
import { getUserIdByEmail } from "./user-controllers";
import { connectToDatabase } from "../db/connection";

const createPost = async (postData: string) => {
  const token = await fetch("/api/auth/session").then((res) => res.json());

  const response = await fetch("http://localhost:5000/api/posts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token?.accessToken}`, // Pass JWT in header
    },
    body: JSON.stringify(postData),
  });

  const result = await response.json();
  return result;
};

export { createPost };
