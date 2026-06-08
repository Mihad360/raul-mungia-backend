import { Model, Types } from "mongoose";

export interface ICertification {
  _id?: Types.ObjectId;
  title: string;
  size: string;
  image: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CertificationInterface extends Model<ICertification> {
  isCertificationExistById(
    id: string | Types.ObjectId,
  ): Promise<ICertification | null>;
}
