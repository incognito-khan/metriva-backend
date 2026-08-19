import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ClientDocument = Client & Document;

export enum ClientStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Schema({ timestamps: true })
export class Client {
  @Prop({
    required: [true, "Business name is required"],
    trim: true,
    minlength: [2, "Business name must be at least 2 characters"],
    maxlength: [200, "Business name cannot exceed 200 characters"],
  })
  businessName!: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  businessCategory?: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({
    trim: true,
    lowercase: true,
  })
  email?: string;

  @Prop({
    trim: true,
    default: "UTC",
  })
  timezone!: string;

  @Prop({
    type: "ObjectId",
    ref: "Organization",
    required: [true, "Organization is required"],
    index: true,
  })
  organization!: string;

  @Prop({
    type: String,
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  status!: ClientStatus;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Create indexes
ClientSchema.index({ organization: 1 });
ClientSchema.index({ organization: 1, status: 1 });
