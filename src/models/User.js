const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Never include password in normal queries
    },
    emailVerified: {
      type: Boolean,
      default: false, // New users start with unverified email
    },
    passwordResetToken: {
      type: String,
      select: false, // Never include reset token in normal queries
    },
    passwordResetExpires: {
      type: Date,
      select: false, // Never include reset expiration in normal queries
    },
    otpHash: {
      type: String,
      select: false, // Never include OTP hash in normal queries
    },
    otpExpiresAt: {
      type: Date,
      select: false, // Never include OTP expiration in normal queries
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Method to return user data without sensitive information
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.otpHash;
  delete user.otpExpiresAt;
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
