import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, UserInterface } from "./user.interface";

const profileImageSchema = new Schema(
  {
    path: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  { _id: false },
);

const userSchema = new Schema<IUser, UserInterface>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
      default: null,
    },
    profileImage: {
      type: profileImageSchema || String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    fcmToken: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.statics.isUserExistByEmail = async function (email: string) {
  return this.findOne({ email, isDeleted: false }).select("+password");
};

userSchema.statics.isUserExistByCustomId = async function (email: string) {
  return this.findOne({ email });
};

userSchema.statics.compareUserPassword = async function (
  payloadPassword: string,
  hashedPassword: string,
) {
  return bcrypt.compare(payloadPassword, hashedPassword);
};

userSchema.statics.newHashedPassword = async function (newPassword: string) {
  return bcrypt.hash(newPassword, 10);
};

userSchema.statics.isOldTokenValid = async function (
  passwordChangedTime: Date,
  jwtIssuedTime: number,
) {
  const passwordChangedTimestamp = passwordChangedTime?.getTime() / 1000;

  return passwordChangedTimestamp < jwtIssuedTime;
};

userSchema.statics.isJwtIssuedBeforePasswordChange = function (
  passwordChangeTimeStamp: Date,
  jwtIssuedTimeStamp: number,
) {
  if (!passwordChangeTimeStamp) return false;

  const passwordChangedTime =
    new Date(passwordChangeTimeStamp).getTime() / 1000;

  return passwordChangedTime > jwtIssuedTimeStamp;
};

export const UserModel = model<IUser, UserInterface>("User", userSchema);
