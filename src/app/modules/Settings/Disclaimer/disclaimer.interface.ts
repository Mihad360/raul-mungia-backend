import { Model, Types } from "mongoose";

export interface IDisclaimer {
  _id?: Types.ObjectId;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// export interface DisclaimerInterface extends Model<IDisclaimer> {}
export type DisclaimerInterface = Model<IDisclaimer>;
