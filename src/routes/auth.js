const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refresh,
  getCurrentUser,
  logout,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  resendOTP,
} = require("../controllers/authController");
const {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
} = require("../validators/auth");
const authenticate = require("../middleware/auth");

// Register route
router.post("/register", validate(registerSchema), register);

// Login route
router.post("/login", validate(loginSchema), login);

// Refresh token route
router.post("/refresh", refresh);

// Logout route - does not require authentication
// Users should be able to clear cookies even if their access token is expired
router.post("/logout", logout);

// Forgot password route
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// Reset password route - does not require authentication
// Users must be able to reset password using the reset token without being logged in
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Send OTP route - does not require authentication
router.post("/send-otp", validate(sendOTPSchema), sendOTP);

// Verify OTP route - does not require authentication
router.post("/verify-otp", validate(verifyOTPSchema), verifyOTP);

// Resend OTP route - does not require authentication
router.post("/resend-otp", validate(resendOTPSchema), resendOTP);

// Get current authenticated user
router.get("/me", authenticate, getCurrentUser);

module.exports = router;
