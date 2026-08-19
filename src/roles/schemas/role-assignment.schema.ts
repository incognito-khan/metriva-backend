import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type RoleAssignmentDocument = RoleAssignment & Document;

@Schema({ timestamps: true })
export class RoleAssignment {
  @Prop({
    type: "ObjectId",
    ref: "User",
    required: [true, "User is required"],
  })
  user!: string;

  @Prop({
    type: "ObjectId",
    ref: "Role",
    required: [true, "Role is required"],
  })
  role!: string;

  @Prop({
    type: "ObjectId",
    ref: "Organization",
    required: [true, "Organization is required"],
  })
  organization!: string;

  @Prop({
    type: "ObjectId",
    ref: "Client",
    default: null,
  })
  client?: string;
}

export const RoleAssignmentSchema = SchemaFactory.createForClass(RoleAssignment);

// Compound index: user + organization
RoleAssignmentSchema.index({ user: 1, organization: 1 });
