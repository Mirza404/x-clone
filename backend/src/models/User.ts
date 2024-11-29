import mongoose, { Mongoose } from "mongoose";
import Email from "next-auth/providers/email";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props: { value: string }) =>
        `${props.value} is not a valid email address`,
    },
  },
  name: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(v);
      },
      message: (props: { value: string }) =>
        `${props.value} is not a valid URL`,
    },
  },
  bio: {
    type: String,
    required: false,
    maxLength: 160,
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followerCount: {
    type: Number,
    required: true,
    default: 0,
  },
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followingCount: {
    type: Number,
    required: true,
    default: 0,
  },
});

export default mongoose.model("User", userSchema);
