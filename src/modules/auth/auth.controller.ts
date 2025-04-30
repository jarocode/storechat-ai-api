// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth/shopify')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  @Get('health-check')
  healthCheck() {
    return {
      status: true,
      message: 'server works fine!',
    };
  }

  @Get()
  redirectToShopify(
    @Query('shop') shop: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    // 1. generate & store state
    const state = randomBytes(16).toString('hex');
    session.shopifyState = state;

    // 2. build auth URL
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow('SHOPIFY_CLIENT_ID'),
      scope: this.config.getOrThrow('SHOPIFY_SCOPES'),
      redirect_uri: this.config.getOrThrow('SHOPIFY_REDIRECT_URI'),
      state,
    }).toString();

    res.redirect(`https://${shop}/admin/oauth/authorize?${params}`);
  }

  @Get('callback')
  async handleCallback(
    @Query('shop') shop: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('hmac') hmac: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    // 3. validate state
    if (state !== session.shopifyState) {
      throw new UnauthorizedException('Invalid state');
    }

    // 4. verify HMAC
    const map = { ...res.req.query };
    delete map.hmac;
    delete map.signature;
    const message = Object.keys(map)
      .sort()
      .map((key) => `${key}=${map[key]}`)
      .join('&');

    const generated = this.auth.computeHmac(message);
    if (!this.auth.timingSafeEqual(generated, hmac)) {
      throw new UnauthorizedException('HMAC validation failed');
    }

    // 5. exchange code for access token
    const accessToken = await this.auth.fetchAccessToken(shop, code);

    // 6. persist shop + token in your DB
    await this.auth.saveShop(shop, accessToken);

    // 7. set a session or JWT cookie for your own auth
    const jwt = this.auth.signJwt({ shop });
    res.cookie('jwt', jwt, { httpOnly: true, secure: true });

    // 8. redirect back to your Next.js dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?shop=${shop}`);
  }
}
