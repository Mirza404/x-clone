import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    content:{
        type: String,
        required: true,
        minLength: 1,
        maxLength: 380,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
    }
})

export default mongoose.model('Post', PostSchema);