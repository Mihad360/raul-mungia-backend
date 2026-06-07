import { Model, Types } from "mongoose";

interface ProfileImage {
  path: string; // e.g., "images/1234567890-profile.jpg"
  url: string; // e.g., "http://localhost:5000/images/1234567890-profile.jpg"
}

export interface IUser {
  _id?: Types.ObjectId; // roleId can either be populated (IRole) or an ObjectId reference
  email: string;
  password: string;
  name?: string;
  phone?: string;
  profileImage?: ProfileImage | string;
  role: "user" | "admin" | "super_admin";
  fcmToken?: string[];
  isActive?: boolean;
  otp?: string;
  expiresAt?: Date;
  isVerified?: boolean;
  isDeleted?: boolean;
  passwordChangedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserInterface extends Model<IUser> {
  isUserExistByEmail(email: string): Promise<IUser>;
  compareUserPassword(
    payloadPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  newHashedPassword(newPassword: string): Promise<string>;
  isOldTokenValid: (
    passwordChangedTime: Date,
    jwtIssuedTime: number,
  ) => Promise<boolean>;
  isJwtIssuedBeforePasswordChange(
    passwordChangeTimeStamp: Date,
    jwtIssuedTimeStamp: number,
  ): boolean;
  isUserExistByCustomId(email: string): Promise<IUser>;
}
