// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Logger,
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
    // // 1. generate & store state
    // const state = randomBytes(16).toString('hex');
    // session.shopifyState = state;

    // // 2. build auth URL
    // const params = new URLSearchParams({
    //   client_id: this.config.getOrThrow('SHOPIFY_CLIENT_ID'),
    //   scope: this.config.getOrThrow('SHOPIFY_SCOPES'),
    //   redirect_uri: this.config.getOrThrow('SHOPIFY_REDIRECT_URI'),
    //   state,
    // }).toString();

    // res.redirect(`https://${shop}/admin/oauth/authorize?${params}`);

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

  @Get('shopify/callback')
  async handleShopifyCallback(
    @Query('shop') shop: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('hmac') hmac: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    // 3. validate state
    this.logger.log('validating state...');
    this.logger.log('passed state:', state);
    this.logger.log('saved session state:', session?.shopifyState);
    if (state !== session?.shopifyState) {
      throw new UnauthorizedException('Invalid state');
    }
    this.logger.log('state validated successfully');

    // 4. verify HMAC
    this.logger.log('validating HMAC...');
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
    this.logger.log('HMAC validated successfully');

    // 5. exchange code for access token
    const accessToken = await this.auth.fetchAccessToken(shop, code);

    // 6. persist shop + token in your DB
    this.logger.log('saving shop token data to DB...');
    await this.auth.saveShop(shop, accessToken);
    this.logger.log('Shop token data successfully saved to DB');

    // 7. set a session or JWT cookie for your own auth
    this.logger.log('setting jwt cookie to auth...');
    const jwt = this.auth.signJwt({ shop });
    res.cookie('jwt', jwt, { httpOnly: true, secure: true });

    // 8. redirect back to your Next.js onboarding page
    res.redirect(`${this.frontendURL}/onboarding`);
    this.logger.log('shopify authentication flow completed successfully');
  }
}
