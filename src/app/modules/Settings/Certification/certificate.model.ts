import { Schema, model, Types } from "mongoose";
import {
  CertificationInterface,
  ICertification,
} from "./certificate.interface";

const certificationSchema = new Schema<ICertification, CertificationInterface>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
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

certificationSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });

certificationSchema.statics.isCertificationExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false });
};

export const CertificationModel = model<ICertification, CertificationInterface>(
  "Certification",
  certificationSchema,
);
