import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument } from "../users/schemas/user.schema";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Generate secure 6-digit OTP
  private generateOTP(): string {
    const randomBytes = crypto.randomBytes(3); // 3 bytes = 24 bits = up to 16777216
    const randomValue = randomBytes.readUIntBE(0, 3);
    const otp = randomValue % 1000000; // Ensure 6 digits
    return otp.toString().padStart(6, "0"); // Pad with leading zeros if needed
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: normalizedEmail,
    });
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    // Create new user (password will be hashed by User model pre-save middleware)
    const user = await this.userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    // Automatically send OTP for email verification
    const otp = this.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresInMinutes =
      this.configService.get<number>("otp.expiresIn") || 5;
    const otpExpiresAt = new Date(Date.now() + otpExpiresInMinutes * 60 * 1000);

    // Store OTP hash and expiration
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await this.emailService.sendOTPEmail(
      user.email,
      otp,
      user.name,
      otpExpiresInMinutes,
    );

    // Return safe user data (password is excluded by toJSON method)
    return {
      success: true,
      message:
        "Account created successfully. Please check your email for verification code.",
      data: {
        user: user.toJSON(),
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email and explicitly select password field
    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select("+password");

    // If user doesn't exist or password doesn't match, return generic error
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Compare password using the User model's comparePassword method
    const isPasswordValid = await (user as any).comparePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "Please verify your email before logging in.",
      );
    }

    // Generate access and refresh tokens
    const accessToken = this.jwtService.sign(
      { sub: user._id.toString(), type: "access" },
      {
        secret: this.configService.get<string>("jwt.accessSecret"),
        expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m") as any,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user._id.toString(), type: "refresh" },
      {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: (this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") || "7d") as any,
      },
    );

    // Return safe user data and tokens
    return {
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token required");
    }

    try {
      // Verify the refresh token
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      // Ensure the token is of the correct type
      if (decoded.type !== "refresh") {
        throw new UnauthorizedException("Invalid or expired refresh token");
      }

      // Extract user ID from the token's sub claim
      const userId = decoded.sub;

      // Generate a new access token
      const newAccessToken = this.jwtService.sign(
        { sub: userId, type: "access" },
        {
          secret: this.configService.get<string>("jwt.accessSecret"),
          expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m") as any,
        },
      );

      return {
        success: true,
        message: "Access token refreshed successfully",
        data: {
          accessToken: newAccessToken,
        },
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  async getCurrentUser(userId: string) {
    // Validate user ID format - ensure it's a valid MongoDB ObjectId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user identifier");
    }

    // Find user by ID
    const user = await this.userModel.findById(userId);

    // If user doesn't exist, return 404
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Return safe user data using the toJSON method
    return {
      success: true,
      data: {
        user: user.toJSON(),
      },
    };
  }

  logout() {
    return {
      success: true,
      message: "Logout successful",
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.userModel.findOne({ email: normalizedEmail });

    // Always return the same generic response to prevent account enumeration
    if (!user) {
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      };
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
    const frontendUrl =
      this.configService.get<string>("frontend.url") || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.name,
    );

    // Return generic success response
    return {
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Find users that have a password reset token set
    const usersWithResetToken = await this.userModel
      .find({
        passwordResetToken: { $exists: true, $ne: null },
      })
      .select("+passwordResetToken +passwordResetExpires");

    // Find the user whose reset token matches the provided token
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
      throw new BadRequestException("Invalid or expired password reset token.");
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      throw new BadRequestException("Invalid or expired password reset token.");
    }

    // Update password
    user.password = password;

    // Clear reset token fields to make token single-use
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Return success response
    return {
      success: true,
      message: "Password reset successfully.",
    };
  }

  async sendOTP(sendOtpDto: SendOtpDto) {
    const { email } = sendOtpDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.userModel.findOne({ email: normalizedEmail });

    // If user doesn't exist, return generic error to prevent account enumeration
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified");
    }

    // Generate secure 6-digit OTP
    const otp = this.generateOTP();

    // Hash the OTP before storing
    const otpHash = await bcrypt.hash(otp, 10);

    // Set OTP expiration (configurable, default 5 minutes)
    const otpExpiresInMinutes =
      this.configService.get<number>("otp.expiresIn") || 5;
    const otpExpiresAt = new Date(Date.now() + otpExpiresInMinutes * 60 * 1000);

    // Store OTP hash and expiration
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await this.emailService.sendOTPEmail(
      user.email,
      otp,
      user.name,
      otpExpiresInMinutes,
    );

    // Return success response
    return {
      success: true,
      message: "OTP sent successfully",
    };
  }

  async verifyOTP(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email and explicitly select OTP fields
    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select("+otpHash +otpExpiresAt");

    // If user doesn't exist, return generic error
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified");
    }

    // Check if OTP exists
    if (!user.otpHash || !user.otpExpiresAt) {
      throw new BadRequestException(
        "No valid OTP found. Please request a new OTP.",
      );
    }

    // Check if OTP has expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      // Clear expired OTP
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      throw new BadRequestException(
        "OTP has expired. Please request a new OTP.",
      );
    }

    // Compare the submitted OTP against the stored hash
    const isOTPValid = await bcrypt.compare(otp, user.otpHash);

    if (!isOTPValid) {
      throw new BadRequestException("Invalid OTP");
    }

    // Mark email as verified
    user.emailVerified = true;

    // Clear OTP fields to make OTP single-use
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    // Return success response
    return {
      success: true,
      message: "Email verified successfully",
    };
  }

  async resendOTP(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.userModel.findOne({ email: normalizedEmail });

    // If user doesn't exist, return generic error to prevent account enumeration
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If email is already verified, return appropriate response
    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified");
    }

    // Generate new secure 6-digit OTP
    const otp = this.generateOTP();

    // Hash the new OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // Set new OTP expiration (configurable, default 5 minutes)
    const otpExpiresInMinutes =
      this.configService.get<number>("otp.expiresIn") || 5;
    const otpExpiresAt = new Date(Date.now() + otpExpiresInMinutes * 60 * 1000);

    // Store new OTP hash and expiration (invalidates previous OTP)
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send new OTP email
    await this.emailService.sendOTPEmail(
      user.email,
      otp,
      user.name,
      otpExpiresInMinutes,
    );

    // Return success response
    return {
      success: true,
      message: "New OTP sent successfully",
    };
  }
}
