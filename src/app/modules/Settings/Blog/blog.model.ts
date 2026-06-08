import { Schema, model, Types } from "mongoose";
import { BlogInterface, IBlog } from "./blog.interface";

const blogSchema = new Schema<IBlog, BlogInterface>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

blogSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });

blogSchema.statics.isBlogExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false });
};

export const BlogModel = model<IBlog, BlogInterface>("Blog", blogSchema);
