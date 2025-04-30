// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';

import { Shop } from '../shop/entities/shop.entity';

@Injectable()
export class AuthService {
  private readonly shopifyClientId =
    this.configService.getOrThrow('SHOPIFY_CLIENT_ID');
  private readonly shopifyClientSecret = this.configService.getOrThrow(
    'SHOPIFY_CLIENT_SECRET',
  );
  constructor(
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  computeHmac(message: string) {
    return createHmac('sha256', this.shopifyClientSecret)
      .update(message)
      .digest('hex');
  }

  timingSafeEqual(a: string, b: string) {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  async fetchAccessToken(shop: string, code: string): Promise<string> {
    const resp = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: this.shopifyClientId,
      client_secret: this.shopifyClientSecret,
      code,
    });
    return resp.data.access_token;
  }

  async saveShop(shop: string, token: string) {
    // Upsert: save will INSERT or UPDATE on PK conflict
    await this.shopsRepo.save({ shop, accessToken: token });
  }

  signJwt(payload: any) {
    return this.jwtService.sign(payload);
  }
}
