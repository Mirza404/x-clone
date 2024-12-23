import mongoose, { Document } from "mongoose";

const PostSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 20,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("Post", PostSchema);
