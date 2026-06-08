import { Model, Types } from "mongoose";

export interface IExplorePurity {
  _id?: Types.ObjectId;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// export interface ExplorePurityInterface extends Model<IExplorePurity> {}
export type ExplorePurityInterface = Model<IExplorePurity>;
