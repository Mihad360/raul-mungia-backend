import { Schema, model, Types } from "mongoose";
import { IProduct, ProductInterface } from "./product.interface";

const productSchema = new Schema<IProduct, ProductInterface>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    productCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    variants: [
      {
        size: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        originalPrice: { type: Number, min: 0, default: null },
        stock: { type: Number, required: true, min: 0, default: 0 },
        // NEW: Weight in pounds for FedEx shipping calculation
        weight: {
          type: Number,
          required: true,
          default: 0.5, // Default 0.5 lbs (typical peptide vial weight)
          min: 0,
        },
      },
    ],
    description: {
      type: String,
      required: true,
    },
    additionalInformation: {
      type: String,
      default: null,
    },
    compliance: {
      type: String,
      default: null,
    },
    mainImage: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
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

// Indexes for faster queries
productSchema.index({ category: 1, isDeleted: 1 });
productSchema.index({ productCode: 1 });
productSchema.index({ title: "text", description: "text" });

// Statics
productSchema.statics.isProductExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false }).populate("category");
};

productSchema.statics.isProductExistByCode = async function (
  productCode: string,
) {
  return this.findOne({
    productCode: productCode.toUpperCase(),
    isDeleted: false,
  });
};

// Auto-generate product code like PRD-001, PRD-002, ...
productSchema.statics.generateProductCode = async function () {
  const lastProduct = await this.findOne({}, { productCode: 1 })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastProduct || !lastProduct.productCode) {
    return "PRD-001";
  }

  // Extract number part from "PRD-XXX"
  const match = lastProduct.productCode.match(/PRD-(\d+)/);
  const lastNumber = match ? parseInt(match[1], 10) : 0;
  const nextNumber = lastNumber + 1;

  return `PRD-${String(nextNumber).padStart(3, "0")}`;
};

export const ProductModel = model<IProduct, ProductInterface>(
  "Product",
  productSchema,
);
