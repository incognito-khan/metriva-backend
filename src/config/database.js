const mongoose = require("mongoose");
const config = require("./env");

const connectDatabase = async () => {
  if (!config.mongodbUri) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    const options = {
      // These options help with connection stability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongodbUri, options);
    console.log("MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
