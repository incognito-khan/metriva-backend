import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Model } from "mongoose";
import * as bcrypt from "bcrypt";

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  AGENCY_ADMIN = "AGENCY_ADMIN",
  CLIENT_USER = "CLIENT_USER",
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  })
  name: string;

  @Prop({
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  email: string;

  @Prop({
    required: [true, "Password is required"],
    select: false,
  })
  password: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ select: false })
  passwordResetToken: string;

  @Prop({ select: false })
  passwordResetExpires: Date;

  @Prop({ select: false })
  otpHash: string;

  @Prop({ select: false })
  otpExpiresAt: Date;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.CLIENT_USER,
  })
  role: UserRole;

  @Prop({ type: "ObjectId", ref: "Organization", default: null })
  organization: string;

  @Prop({ type: "ObjectId", ref: "Role", default: null })
  assignedRole: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  const user = this as UserDocument;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Method to return user data without sensitive information
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.otpHash;
  delete user.otpExpiresAt;
  return user;
};
