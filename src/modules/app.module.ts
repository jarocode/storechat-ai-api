import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { ShopModule } from './shop/shop.module';

import { Shop } from './shop/entities/shop.entity';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.development', '.env.production'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: new ConfigService().getOrThrow('SUPABASE_URL'),
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      entities: [Shop],
      synchronize: true, // turn off in production
    }),
    ShopModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
