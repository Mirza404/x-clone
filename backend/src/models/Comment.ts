import mongoose, { Document } from "mongoose";

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 380,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  }
});

export default mongoose.model("Comment", CommentSchema);