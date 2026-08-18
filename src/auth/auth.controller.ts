import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Public } from "../common/decorators/public.decorator";
import { CookieUtils } from "../common/utils/cookie.utils";
import { ConfigService } from "@nestjs/config";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set cookies
    CookieUtils.setAuthCookies(
      res,
      result.data.accessToken,
      result.data.refreshToken,
      this.configService,
    );

    // Remove tokens from response body (they're in cookies)
    const { accessToken, refreshToken, ...dataWithoutTokens } = result.data;

    return {
      success: result.success,
      message: result.message,
      data: dataWithoutTokens,
    };
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refreshToken;
    const result = await this.authService.refresh(refreshToken);

    // Set new access token cookie
    CookieUtils.setAccessTokenCookie(
      res,
      result.data.accessToken,
      this.configService,
    );

    // Remove token from response body (it's in cookie)
    const { accessToken, ...dataWithoutToken } = result.data;

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Public()
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookies
    CookieUtils.clearAuthCookies(res, this.configService);

    return this.authService.logout();
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post("send-otp")
  async sendOTP(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOTP(sendOtpDto);
  }

  @Public()
  @Post("verify-otp")
  async verifyOTP(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyOtpDto);
  }

  @Public()
  @Post("resend-otp")
  async resendOTP(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOTP(resendOtpDto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req) {
    return this.authService.getCurrentUser(req.user.id);
  }
}
