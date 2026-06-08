import { Schema, model, Types } from "mongoose";
import { FaqInterface, IFaq } from "./faq.interface";

const faqSchema = new Schema<IFaq, FaqInterface>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
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

faqSchema.index({ isDeleted: 1, isActive: 1 });

faqSchema.statics.isFaqExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false });
};

export const FaqModel = model<IFaq, FaqInterface>("Faq", faqSchema);
