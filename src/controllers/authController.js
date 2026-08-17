const User = require("../models/User");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokens");
const config = require("../config/env");
const {
  sendPasswordResetEmail,
  sendOTPEmail,
} = require("../services/emailService");

// Register a new user
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Create new user (password will be hashed by User model pre-save middleware)
    // New users start with emailVerified: false by default
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    // Automatically send OTP for email verification
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(
      Date.now() + config.otp.expiresInMinutes * 60 * 1000,
    );

    // Store OTP hash and expiration
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, user.name, config.otp.expiresInMinutes);

    // Return safe user data (password is excluded by toJSON method)
    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email for verification code.",
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Pass other errors to the error handling middleware
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email and explicitly select password field
    // Password is normally excluded by select: false in the User model
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    // If user doesn't exist or password doesn't match, return generic error
    // This prevents account enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password using the User model's comparePassword method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Determine cookie settings based on environment
    const isProduction = config.nodeEnv === "production";
    const baseCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
    };

    // Set access token cookie (15 minutes)
    res.cookie("accessToken", accessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    // Set refresh token cookie (7 days)
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return safe user data (password is excluded by toJSON method)
    // Tokens are NOT included in the JSON response - they're in HttpOnly cookies
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

// Refresh access token
const refresh = async (req, res, next) => {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    // If refresh token is missing, return 401 Unauthorized
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Verify the refresh token using the existing utility
    const decoded = verifyRefreshToken(refreshToken);

    // Extract user ID from the token's sub claim
    const userId = decoded.sub;

    // Generate a new access token using the existing utility
    const newAccessToken = generateAccessToken(userId);

    // Determine cookie settings based on environment
    const isProduction = config.nodeEnv === "production";
    const baseCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
    };

    // Set the new access token in the HttpOnly cookie (15 minutes)
    res.cookie("accessToken", newAccessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    // Return minimal success response - token is NOT in JSON response
    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    // Invalid, malformed, expired, or incorrectly signed refresh tokens result in 401
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// Get current authenticated user
const getCurrentUser = async (req, res, next) => {
  try {
    // User ID is attached to req.user by the authenticate middleware
    const userId = req.user.id;

    // Validate user ID format - ensure it's a valid MongoDB ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user identifier",
      });
    }

    // Find user by ID
    // Password is automatically excluded by select: false in the User model
    const user = await User.findById(userId);

    // If user doesn't exist, return 404
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return safe user data using the toJSON method
    // This ensures password and other sensitive fields are never exposed
    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    // Pass database/server errors to the error handling middleware
    next(error);
  }
};

// Logout user - clear authentication cookies
const logout = async (req, res) => {
  // Determine cookie settings based on environment
  // Must match the options used when cookies were originally set
  const isProduction = config.nodeEnv === "production";
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
  };

  // Clear access token cookie by setting it with maxAge: 0
  res.clearCookie("accessToken", baseCookieOptions);

  // Clear refresh token cookie by setting it with maxAge: 0
  res.clearCookie("refreshToken", baseCookieOptions);

  // Return minimal success response
  // Tokens are NOT included in the JSON response
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// Forgot password - send password reset email
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Always return the same generic response to prevent account enumeration
    // Even if user doesn't exist, we return success
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate cryptographically secure random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the reset token before storing in database
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    // Set reset token expiration (1 hour from now)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token and expiration in user document
    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Generate reset URL
    const resetUrl = `${config.frontendUrl}/reset-password/${resetToken}`;

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetUrl, user.name);

    // Return generic success response
    // Do not expose the reset token in the response
    res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

// Reset password - consume reset token and set new password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Find users that have a password reset token set
    // We need to explicitly select the reset token fields since they have select: false
    const usersWithResetToken = await User.find({
      passwordResetToken: { $exists: true, $ne: null },
    }).select("+passwordResetToken +passwordResetExpires");

    // Find the user whose reset token matches the provided token
    // We use bcrypt.compare() to verify the raw token against the stored hash
    let user = null;
    for (const candidateUser of usersWithResetToken) {
      const isTokenValid = await bcrypt.compare(
        token,
        candidateUser.passwordResetToken,
      );
      if (isTokenValid) {
        user = candidateUser;
        break;
      }
    }

    // If no user found with matching token, return generic error
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    // Check if token has expired
    if (user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    // Update password
    // The User model's pre-save middleware will automatically hash the new password
    user.password = password;

    // Clear reset token fields to make token single-use
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Return success response
    // Do not return password, token, or any sensitive information
    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

// Generate secure 6-digit OTP
const generateOTP = () => {
  // Use crypto.randomBytes for cryptographically secure random number
  const randomBytes = crypto.randomBytes(3); // 3 bytes = 24 bits = up to 16777216
  const randomValue = randomBytes.readUIntBE(0, 3);
  const otp = randomValue % 1000000; // Ensure 6 digits
  return otp.toString().padStart(6, "0"); // Pad with leading zeros if needed
};

// Send OTP for email verification
const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // If user doesn't exist, return generic error to prevent account enumeration
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate secure 6-digit OTP
    const otp = generateOTP();

    // Hash the OTP before storing
    const otpHash = await bcrypt.hash(otp, 10);

    // Set OTP expiration (configurable, default 5 minutes)
    const otpExpiresAt = new Date(
      Date.now() + config.otp.expiresInMinutes * 60 * 1000,
    );

    // Store OTP hash and expiration
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, user.name, config.otp.expiresInMinutes);

    // Return success response
    // Do not return the OTP in the response
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

// Verify OTP for email verification
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email and explicitly select OTP fields
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpHash +otpExpiresAt",
    );

    // If user doesn't exist, return generic error
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Check if OTP exists
    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No valid OTP found. Please request a new OTP.",
      });
    }

    // Check if OTP has expired
    if (user.otpExpiresAt < new Date()) {
      // Clear expired OTP
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Compare the submitted OTP against the stored hash
    const isOTPValid = await bcrypt.compare(otp, user.otpHash);

    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Mark email as verified
    user.emailVerified = true;

    // Clear OTP fields to make OTP single-use
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

// Resend OTP for email verification
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // If user doesn't exist, return generic error to prevent account enumeration
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new secure 6-digit OTP
    const otp = generateOTP();

    // Hash the new OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // Set new OTP expiration (configurable, default 5 minutes)
    const otpExpiresAt = new Date(
      Date.now() + config.otp.expiresInMinutes * 60 * 1000,
    );

    // Store new OTP hash and expiration (invalidates previous OTP)
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send new OTP email
    await sendOTPEmail(user.email, otp, user.name, config.otp.expiresInMinutes);

    // Return success response
    // Do not return the OTP in the response
    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error) {
    // Pass errors to the error handling middleware
    next(error);
  }
};

module.exports = {
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
};
