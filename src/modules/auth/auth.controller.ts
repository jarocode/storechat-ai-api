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

    // 1. Validate state
    // this.logger.log(
    //   `Validating state… sent=${state} saved=${session.shopifyState}`,
    // );
    // if (state !== session.shopifyState) {
    //   throw new UnauthorizedException('Invalid OAuth state');
    // }

    // 2. Verify HMAC
    this.logger.log('Verifying HMAC…');
    const params = { shop, code, state };
    const message = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const generated = this.auth.computeHmac(message);
    if (!this.auth.timingSafeEqual(generated, hmac)) {
      throw new UnauthorizedException('HMAC validation failed');
    }

    // 3. Exchange code → access token
    this.logger.log('Exchanging code for access token…');
    const accessToken = await this.auth.fetchAccessToken(shop, code);

    // 4. Persist shop + token
    this.logger.log('Saving shop token to DB…');
    await this.auth.saveShop(shop, accessToken);

    // 5. Sign & return JWT
    const jwt = this.auth.signJwt({ shop });
    this.logger.log('Callback-proxy completed, issuing JWT');
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
