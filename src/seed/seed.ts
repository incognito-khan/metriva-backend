import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { getConnectionToken } from "@nestjs/mongoose";
import { Model, Connection } from "mongoose";
import { UserDocument } from "../users/schemas/user.schema";
import { UserRole } from "../users/schemas/user.schema";
import { OrganizationStatus } from "../organizations/schemas/organization.schema";
import { AVAILABLE_PERMISSIONS } from "../roles/permissions";

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get the Mongoose connection
  const connection = app.get(getConnectionToken()) as Connection;

  // Get the User model
  const userModel = connection.model("User") as Model<UserDocument>;

  // Get the Organization model
  const organizationModel = connection.model("Organization");

  // Get the Role model
  const roleModel = connection.model("Role");

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

  // Create demo organization and admin (idempotent)
  const demoOrgEmail = "demo@agency.com";
  const demoAdminEmail = "admin@demo.com";
  const demoAdminPassword = "DemoAdmin@123!";

  const existingDemoOrg = await organizationModel.findOne({
    email: demoOrgEmail.toLowerCase(),
  });

  if (existingDemoOrg) {
    console.log("Demo organization already exists, skipping creation");

    // Create default system roles for the demo org if they don't exist (idempotent)
    const existingAdminRole = await roleModel.findOne({
      organization: existingDemoOrg._id.toString(),
      name: "Admin",
    });

    if (!existingAdminRole) {
      await roleModel.create({
        name: "Admin",
        description: "Full access (system role)",
        organization: existingDemoOrg._id.toString(),
        permissions: [...AVAILABLE_PERMISSIONS],
        isSystem: true,
      });
      console.log("Default 'Admin' role created for demo org");
    }

    const existingViewerRole = await roleModel.findOne({
      organization: existingDemoOrg._id.toString(),
      name: "Viewer",
    });

    if (!existingViewerRole) {
      await roleModel.create({
        name: "Viewer",
        description: "Read-only (system role)",
        organization: existingDemoOrg._id.toString(),
        permissions: [
          "clients:read",
          "leads:read",
          "revenue:read",
          "reports:read",
          "seo:read",
          "settings:read",
        ],
        isSystem: true,
      });
      console.log("Default 'Viewer' role created for demo org");
    }
  } else {
    // Check if demo admin email already exists
    const existingDemoAdmin = await userModel.findOne({
      email: demoAdminEmail.toLowerCase(),
    });

    if (existingDemoAdmin) {
      console.log(
        "Demo admin email already exists, skipping demo org creation",
      );
    } else {
      // Start a MongoDB transaction
      const session = await connection.startSession();
      session.startTransaction();

      try {
        // Create the AGENCY_ADMIN user first
        const createdAdmin = (
          await userModel.create(
            [
              {
                name: "Demo Admin",
                email: demoAdminEmail.toLowerCase(),
                password: demoAdminPassword,
                role: UserRole.AGENCY_ADMIN,
                emailVerified: true,
              },
            ],
            { session },
          )
        )[0] as UserDocument;

        // Create the organization with the admin as owner
        const createdOrg = (
          await organizationModel.create(
            [
              {
                name: "Demo Agency",
                email: demoOrgEmail.toLowerCase(),
                phone: "+1-555-0123",
                website: "https://demo-agency.com",
                address: "123 Demo Street, Demo City, DC 12345",
                owner: createdAdmin._id.toString(),
                status: OrganizationStatus.ACTIVE,
              },
            ],
            { session },
          )
        )[0];

        // Update the admin with the organization reference
        createdAdmin.organization = createdOrg._id.toString();
        await createdAdmin.save({ session });

        // Commit the transaction
        await session.commitTransaction();

        console.log("Demo organization and admin created successfully");
        console.log(`Demo Admin Email: ${demoAdminEmail}`);
        console.log(`Demo Admin Password: ${demoAdminPassword}`);

        // Create default system roles for the demo org (idempotent)
        const existingAdminRole = await roleModel.findOne({
          organization: createdOrg._id.toString(),
          name: "Admin",
        });

        if (!existingAdminRole) {
          await roleModel.create({
            name: "Admin",
            description: "Full access (system role)",
            organization: createdOrg._id.toString(),
            permissions: [...AVAILABLE_PERMISSIONS],
            isSystem: true,
          });
          console.log("Default 'Admin' role created for demo org");
        }

        const existingViewerRole = await roleModel.findOne({
          organization: createdOrg._id.toString(),
          name: "Viewer",
        });

        if (!existingViewerRole) {
          await roleModel.create({
            name: "Viewer",
            description: "Read-only (system role)",
            organization: createdOrg._id.toString(),
            permissions: [
              "clients:read",
              "leads:read",
              "revenue:read",
              "reports:read",
              "seo:read",
              "settings:read",
            ],
            isSystem: true,
          });
          console.log("Default 'Viewer' role created for demo org");
        }
      } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        console.error("Error creating demo organization:", error);
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
    }
  }

  console.log("Seeding completed");

  await app.close();
}

seed();
