// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Res,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendURL = this.config.getOrThrow('FRONTEND_URL');
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  @Get('shopify')
  redirectToShopify(
    @Query('shop') shop: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const state = randomBytes(16).toString('hex');
    session.shopifyState = state;

    // make sure the session is written before we redirect
    session.save((err: any) => {
      if (err) {
        // handle error… perhaps log and return a 500
        throw err;
      }
      const params = new URLSearchParams({
        client_id: this.config.getOrThrow('SHOPIFY_CLIENT_ID'),
        scope: this.config.getOrThrow('SHOPIFY_SCOPES'),
        redirect_uri: this.config.getOrThrow('SHOPIFY_REDIRECT_URI'),
        state,
      }).toString();

      res.redirect(`https://${shop}/admin/oauth/authorize?${params}`);
    });
  }

  @Post('shopify/callback-proxy')
  async handleShopifyCallbackProxy(
    @Body() params: Record<string, string>,
  ): Promise<{ jwt: string }> {
    const { hmac, state, shop, code, timestamp } = params;
    // 1. Clone & drop the signature fields
    const map = { ...params };
    delete map.hmac;
    delete map.signature;

    this.logger.log(`state: ${state}`);
    this.logger.log(`timestamp: ${timestamp}`);

    // 1. Verify HMAC & state exactly as before (no session)
    this.logger.log(`Verifying HMAC for ${shop}`);

    // 2. Build the “key=val” string
    const message = Object.keys(map)
      .sort()
      .map((k) => `${k}=${map[k]}`)
      .join('&');

    this.logger.log('HMAC payload:', message);
    this.logger.log('Incoming hmac:', hmac);

    const generated = this.auth.computeHmac(message);
    if (!this.auth.timingSafeEqual(generated, hmac)) {
      throw new UnauthorizedException('HMAC validation failed');
    }
    this.logger.log('HMAC validated successfully');

    // 3. Exchange and persist
    const accessToken = await this.auth.fetchAccessToken(shop, code);
    await this.auth.saveShop(shop, accessToken);

    // 4. Sign & return JWT
    const jwt = this.auth.signJwt({ shop });
    return { jwt };
  }

  // --- logout endpoint ---
  @Post('logout')
  logout(@Res() res: Response) {
    // clear the cookie on the client
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    return res.json({ message: 'Logged out' });
  }
}
