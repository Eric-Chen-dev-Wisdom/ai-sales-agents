import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    JwtModule,
    ConfigModule,
    ConversationsModule,
    CampaignsModule,
    AnalyticsModule,
  ],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}