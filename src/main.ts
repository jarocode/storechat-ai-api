import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';

import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // grab ConfigService from Nest’s DI container
  const configService = app.get(ConfigService);

  // these will throw an error and crash the app if missing:
  const nodeEnv = configService.getOrThrow<'development' | 'production'>(
    'NODE_ENV',
  );

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
      cookie: {
        httpOnly: true,
        secure: configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15,
      },
    }),
  );

  // trust proxy only if behind one (e.g. Railway)
  if (nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  // Read PORT (Railway injects this automatically)
  const PORT = configService.getOrThrow<number>('PORT');

  // Optionally, read HOST if you need to override binding interface
  const HOST = configService.get<string>('HOST', '0.0.0.0');

  console.log(`▶︎ ENV PORT: ${configService.get('PORT')}`); // for debugging
  console.log(`✔︎ Server will bind to: ${HOST}:${PORT}`);
  console.log(`current environment: ${nodeEnv}`);

  await app.listen(PORT, HOST);
  console.log(`✔︎ Nest application listening on ${HOST}:${PORT}`);
}
bootstrap();
