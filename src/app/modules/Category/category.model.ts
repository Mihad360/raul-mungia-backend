import { Schema, model, Types } from "mongoose";
import { CategoryInterface, ICategory } from "./category.interface";

const categorySchema = new Schema<ICategory, CategoryInterface>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
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

// Statics
categorySchema.statics.isCategoryExistByName = async function (name: string) {
  return this.findOne({ name, isDeleted: false });
};

categorySchema.statics.isCategoryExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false });
};

export const CategoryModel = model<ICategory, CategoryInterface>(
  "Category",
  categorySchema,
);
