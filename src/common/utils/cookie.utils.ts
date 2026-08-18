import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
}

export class CookieUtils {
  static getBaseCookieOptions(configService: ConfigService): CookieOptions {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    };
  }

  static setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    configService: ConfigService,
  ): void {
    const baseOptions = this.getBaseCookieOptions(configService);

    // Set access token cookie (15 minutes)
    res.cookie('accessToken', accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    // Set refresh token cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
  }

  static setAccessTokenCookie(
    res: Response,
    accessToken: string,
    configService: ConfigService,
  ): void {
    const baseOptions = this.getBaseCookieOptions(configService);

    res.cookie('accessToken', accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });
  }

  static clearAuthCookies(res: Response, configService: ConfigService): void {
    const baseOptions = this.getBaseCookieOptions(configService);

    res.clearCookie('accessToken', baseOptions);
    res.clearCookie('refreshToken', baseOptions);
  }
}
