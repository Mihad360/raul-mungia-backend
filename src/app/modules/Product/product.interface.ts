import { Model, Types } from "mongoose";

export interface IProductVariant {
  _id?: Types.ObjectId;
  size: string;
  price: number;
  originalPrice?: number | null;
  stock: number;
}

export interface IProduct {
  _id?: Types.ObjectId;
  title: string;
  productCode: string;
  category: Types.ObjectId;
  variants: IProductVariant[];
  description: string;
  additionalInformation?: string;
  compliance?: string;
  mainImage: string;
  images?: string[];
  lowStockThreshold?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductInterface extends Model<IProduct> {
  isProductExistById(id: string | Types.ObjectId): Promise<IProduct | null>;
  isProductExistByCode(productCode: string): Promise<IProduct | null>;
  generateProductCode(): Promise<string>;
}
