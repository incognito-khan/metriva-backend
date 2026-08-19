import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({
    required: [true, "Role name is required"],
    trim: true,
    minlength: [2, "Role name must be at least 2 characters"],
    maxlength: [50, "Role name cannot exceed 50 characters"],
  })
  name!: string;

  @Prop({
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
  })
  description?: string;

  @Prop({
    type: "ObjectId",
    ref: "Organization",
    required: [true, "Organization is required"],
  })
  organization!: string;

  @Prop({
    type: [String],
    required: [true, "Permissions are required"],
  })
  permissions!: string[];

  @Prop({
    default: false,
  })
  isSystem!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Compound unique index: organization + name
RoleSchema.index({ organization: 1, name: 1 }, { unique: true });
