import mongoose from 'mongoose';

const MediaAssetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    format: {
      type: String,
      required: true,
    },
    secureUrl: {
      type: String,
      required: true,
      unique: true,
      maxLength: 2048,
    },
  },
  { timestamps: true }
);

MediaAssetSchema.index({ owner: 1, secureUrl: 1 });

export default mongoose.model('MediaAsset', MediaAssetSchema);
