import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { ShopModule } from './shop/shop.module';

import { Shop } from './shop/entities/shop.entity';

import { AppController } from './app.controller';
import { ShopifyModule } from './shopify/shopify.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // only load .env files when NOT in production
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: ['.env.local', '.env.development', '.env.production'],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule], // make sure ConfigService is in scope
      inject: [ConfigService], // inject the service
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.getOrThrow('REDIS_HOST'),
          port: config.getOrThrow('REDIS_PORT'),
        },
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: new ConfigService().getOrThrow('SUPABASE_URL'),
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      entities: [Shop],
      synchronize: true, // turn off in production
    }),
    ShopModule,
    ShopifyModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
