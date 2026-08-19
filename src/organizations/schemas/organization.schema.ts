import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type OrganizationDocument = Organization & Document;

export enum OrganizationStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

@Schema({ timestamps: true })
export class Organization {
  @Prop({
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [100, "Name cannot exceed 100 characters"],
  })
  name!: string;

  @Prop({
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  email!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({
    type: "ObjectId",
    ref: "User",
    required: [true, "Owner is required"],
  })
  owner!: string;

  @Prop({
    type: String,
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status!: OrganizationStatus;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
