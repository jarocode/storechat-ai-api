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
import { ShopifyCallbackDto } from './dtos/shopify-callback.dto';

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
    @Body() dto: ShopifyCallbackDto,
  ): Promise<{ jwt: string }> {
    const { shop, code, state, hmac } = dto;

    this.logger.log(`state: ${state}`);

    // 1. Verify HMAC & state exactly as before (no session)
    this.logger.log(`Verifying HMAC for ${shop}`);
    const message = [`code=${code}`, `shop=${shop}`, `state=${state}`]
      .sort()
      .join('&');
    if (!this.auth.timingSafeEqual(this.auth.computeHmac(message), hmac)) {
      throw new UnauthorizedException('Invalid HMAC');
    }

    // 2. Exchange and persist
    const accessToken = await this.auth.fetchAccessToken(shop, code);
    await this.auth.saveShop(shop, accessToken);

    // 3. Sign & return JWT
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
