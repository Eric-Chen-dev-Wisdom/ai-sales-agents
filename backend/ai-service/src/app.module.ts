import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [ConfigModule.forRoot(), AiModule],
})
export class AppModule {}
