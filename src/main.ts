import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = new ConfigService().getOrThrow<number>('PORT');
  await app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
}
bootstrap();
