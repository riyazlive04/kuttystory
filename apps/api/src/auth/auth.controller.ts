import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UnauthorizedException,
  ConflictException,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Resolve the current session's guest user id, if it belongs to a guest. */
  private async resolveGuestUserId(req: Request): Promise<string | undefined> {
    const token = req.cookies?.session_token;
    if (!token) return undefined;
    const user = await this.authService.validateSession(token);
    return user?.isGuest ? user.id : undefined;
  }

  /**
   * Mint an anonymous guest session so a visitor can upload, generate and store
   * a book without signing up. Idempotent: if a valid session already exists
   * (guest or real) it is reused rather than creating duplicate guests.
   */
  @Post('guest')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  async guest(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const existing = req.cookies?.session_token;
    if (existing) {
      const current = await this.authService.validateSession(existing);
      if (current) {
        return {
          success: true,
          data: {
            id: current.id,
            isGuest: current.isGuest,
            role: current.role,
          },
        };
      }
    }

    const { user, token } = await this.authService.createGuest();
    res.cookie('session_token', token, SESSION_COOKIE_OPTS);
    return {
      success: true,
      data: { id: user.id, isGuest: true, role: user.role },
    };
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async signup(
    @Req() req: Request,
    @Body() body: { email: string; password: string; name: string; phone?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const guestUserId = await this.resolveGuestUserId(req);
      const { user, token } = await this.authService.signup(
        body.email,
        body.password,
        body.name,
        body.phone,
        guestUserId,
      );

      res.cookie('session_token', token, SESSION_COOKIE_OPTS);

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      if (message === 'Email already registered') {
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(
    @Req() req: Request,
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const guestUserId = await this.resolveGuestUserId(req);
      const { user, token } = await this.authService.login(
        body.email,
        body.password,
        guestUserId,
      );

      res.cookie('session_token', token, SESSION_COOKIE_OPTS);

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.session_token;
    if (token) {
      await this.authService.deleteSession(token);
    }
    res.clearCookie('session_token');
    return { success: true };
  }

  /**
   * "Who am I" — returns the current user, or `data: null` when there is no
   * valid session. Anonymous visitors are normal here, so this returns 200 with
   * null rather than a 401 (which the browser logs as a red console error).
   */
  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.session_token;
    const user = token
      ? await this.authService.validateSession(token)
      : null;

    if (!user) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isGuest: user.isGuest,
      },
    };
  }
}
