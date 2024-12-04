import { connectToDatabase } from "../db/connection";
import User from "../models/User";
// import { NextResponse } from "next/server";
import { Response, Request } from "express";

export async function createUser(req: Request, res: Response) {
  try {
    console.log("createUser called");
    const {
      name,
      email,
      profilePicture,
      bio,
      followers,
      followerCount,
      following,
      followingCount,
    } = req.body;
    console.log("Request body:", req.body); // Log the request body

    await connectToDatabase();
    console.log("this line runs before user.create");
    const newUser = await User.create({
      name,
      email,
      profilePicture,
      bio,
      followers,
      followerCount,
      following,
      followingCount,
    });
    console.log("New user created:", newUser); // Log the created user

    res.status(201).json({ message: "User Created!", user: { name, email } });
  } catch (error) {
    console.log("Error creating user:", error); // Log the error
    if (typeof error === "string") {
      res.status(400).json({ message: error });
    } else {
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
}
