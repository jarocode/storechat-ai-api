import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';

import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // grab ConfigService from Nest’s DI container
  const configService = app.get(ConfigService);

  // 1. Enable CORS if any front-end is on a different origin
  app.enableCors({
    origin: configService.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.use(cookieParser());

  app.use(
    session({
      secret: configService.get<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true, httpOnly: true, sameSite: 'lax' },
    }),
  );
  const PORT = configService.getOrThrow<number>('PORT');
  await app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
}
bootstrap();
