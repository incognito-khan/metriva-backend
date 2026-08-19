import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { getConnectionToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "../users/schemas/user.schema";
import { UserRole } from "../users/schemas/user.schema";

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get the Mongoose connection
  const connection = app.get(getConnectionToken());

  // Get the User model
  const userModel = connection.model("User") as Model<UserDocument>;

  console.log("Seeding database...");

  // Check if SUPER_ADMIN already exists
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@metriva.com";
  const existingSuperAdmin = await userModel.findOne({
    email: superAdminEmail.toLowerCase(),
    role: UserRole.SUPER_ADMIN,
  });

  if (existingSuperAdmin) {
    console.log("SUPER_ADMIN already exists, skipping creation");
  } else {
    // Create SUPER_ADMIN
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123!";

    const superAdmin = await userModel.create({
      name: "Super Admin",
      email: superAdminEmail.toLowerCase(),
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    });

    console.log("SUPER_ADMIN created successfully");
    console.log(`Email: ${(superAdmin as any).email}`);
    console.log(`Password: ${superAdminPassword}`);
  }

  console.log("Seeding completed");

  await app.close();
}

seed();
