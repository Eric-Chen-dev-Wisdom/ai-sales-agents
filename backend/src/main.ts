import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGlobalGuard } from './common/guards/jwt-auth.global.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global JWT guard (all routes protected by default)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGlobalGuard(reflector));
  
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Sales Agents API')
    .setDescription('Backend API for AI Sales Agents Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();