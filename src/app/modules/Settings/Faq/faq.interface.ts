import { Model, Types } from "mongoose";

export interface IFaq {
  _id?: Types.ObjectId;
  question: string;
  answer: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FaqInterface extends Model<IFaq> {
  isFaqExistById(id: string | Types.ObjectId): Promise<IFaq | null>;
}
