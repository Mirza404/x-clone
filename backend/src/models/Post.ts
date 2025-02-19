import mongoose, { Document } from "mongoose";
const PostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 380,
  },
  images: {
    type: [String],
    maxLength: 8,
    minLength: 0,
    required: false,
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
  likes: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  comments: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  }
});

PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("Post", PostSchema);
