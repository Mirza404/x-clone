//model based on the mongoDB schema from next-auth
import mongoose, { Schema, Document } from "mongoose";

interface IUser extends Document {
  name?: string;
  email: string;
  image?: string;
  emailVerified?: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  image: { type: String, required: false },
  emailVerified: { type: Date, required: false },
});

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
