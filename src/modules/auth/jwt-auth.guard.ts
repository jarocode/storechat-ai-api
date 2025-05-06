// src/auth/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const token = req.cookies?.jwt;
    this.logger.log('jwt cookie token:', token);
    if (!token) throw new UnauthorizedException('Not authenticated');

    try {
      this.logger.log('verifying jwt token...');
      const payload = this.jwtService.verify<{ shop: string }>(token);
      (req as any).shop = payload.shop;
      this.logger.log('jwt token verified successfully');
      return true;
    } catch (err) {
      // If it’s an expired token, clear the cookie so the client stops sending it
      if (err instanceof TokenExpiredError) {
        res.clearCookie('jwt', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        });
        throw new UnauthorizedException('Session expired, please log in again');
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
