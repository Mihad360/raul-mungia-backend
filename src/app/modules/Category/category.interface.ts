import { Model, Types } from "mongoose";

export interface ICategory {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryInterface extends Model<ICategory> {
  isCategoryExistByName(name: string): Promise<ICategory | null>;
  isCategoryExistById(id: string | Types.ObjectId): Promise<ICategory | null>;
}
