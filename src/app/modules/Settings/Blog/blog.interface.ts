import { Model, Types } from "mongoose";

export interface IBlog {
  _id?: Types.ObjectId;
  title: string;
  content: string;
  image?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogInterface extends Model<IBlog> {
  isBlogExistById(id: string | Types.ObjectId): Promise<IBlog | null>;
}
