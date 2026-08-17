require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT) || 1025,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.SMTP_FROM || "noreply@metriva.com",
  },
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN) || 5, // Default 5 minutes
  },
};

module.exports = config;
