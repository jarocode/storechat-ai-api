import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './entities/shop.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly repo: Repository<Shop>,
  ) {}

  /**
   * Retrieve the stored access token for a given shop domain.
   * Throws if the shop is not found.
   */
  async getToken(shop: string): Promise<string> {
    const shopData = await this.repo.findOneBy({ shop });
    if (!shopData) {
      throw new NotFoundException(`Shop ${shop} not found`);
    }
    return shopData.accessToken;
  }
}
