// src/auth/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const token = this.extractToken(req);
    this.logger.log('jwt cookie token:', token);
    if (!token) throw new UnauthorizedException('Not authenticated');

    try {
      this.logger.log('verifying jwt token...');
      // await the async verify
      const payload = await this.jwtService.verifyAsync<{ shop: string }>(
        token,
        { secret: this.configService.getOrThrow('JWT_SECRET') },
      );
      (req as any).shop = payload.shop;
      this.logger.log('jwt token verified successfully');
      return true;
    } catch (err) {
      // If it’s an expired token, clear the cookie so the client stops sending it
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Session expired, please log in again');
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(req: Request): string {
    // 1) Try the cookie (httpOnly, set by your Next.js BFF)
    if (req.cookies?.jwt) {
      return req.cookies.jwt;
    }
    // 2) Fallback to Authorization header (optional)
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.split(' ')[1];
    }
    throw new UnauthorizedException('Authentication token not found');
  }
}
