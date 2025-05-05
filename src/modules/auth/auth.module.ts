// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Shop]),
    JwtModule.registerAsync({
      imports: [ConfigModule], // import ConfigModule so you can inject ConfigService
      inject: [ConfigService], // inject ConfigService into the factory
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
