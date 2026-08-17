const z = require("zod");

// Password complexity regex
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Registration validation schema
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name cannot exceed 50 characters")
      .trim(),
    email: z.string().email("Invalid email format").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordComplexityRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
  })
  .strict(); // Reject unknown fields

// Login validation schema (for future use)
const loginSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
  })
  .strict(); // Reject unknown fields

// Forgot password validation schema (for future use)
const forgotPasswordSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
  })
  .strict(); // Reject unknown fields

// Reset password validation schema (for future use)
const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordComplexityRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
  })
  .strict(); // Reject unknown fields

// Send OTP validation schema
const sendOTPSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
  })
  .strict(); // Reject unknown fields

// Verify OTP validation schema
const verifyOTPSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  })
  .strict(); // Reject unknown fields

// Resend OTP validation schema
const resendOTPSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
  })
  .strict(); // Reject unknown fields

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOTPSchema,
  verifyOTPSchema,
  resendOTPSchema,
  validate,
};
