const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config/env");
const connectDatabase = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const authenticate = require("./middleware/auth");

const app = express();

// Connect to MongoDB
connectDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (config.nodeEnv === "development") {
      // In development, allow any origin
      // When credentials are enabled, we need to handle the origin properly
      if (!origin) {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        callback(null, true);
      } else {
        callback(null, origin);
      }
    } else {
      // In production, restrict to specific frontend URL
      if (!origin || origin === config.frontendUrl) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true, // Important for HttpOnly cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// API Routes
app.use("/api/auth", authRoutes);

// Protected test route for middleware demonstration
app.get("/api/protected", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Access granted to protected resource",
    user: req.user,
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Metriva API is running",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
});

module.exports = app;
