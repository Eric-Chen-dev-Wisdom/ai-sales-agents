import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { ConversationsService } from '../conversations/conversations.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class WebsocketService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private conversationsService: ConversationsService,
    private campaignsService: CampaignsService,
    private analyticsService: AnalyticsService,
  ) {}

  async notifyNewMessage(organizationId: string, conversationId: string, message: any) {
    this.websocketGateway.emitNewMessage(organizationId, conversationId, message);
    
    // Update real-time dashboard
    const dashboardData = await this.analyticsService.getRealTimeDashboard(organizationId);
    this.websocketGateway.emitDashboardUpdate(organizationId, dashboardData);
  }

  async notifyConversationUpdated(organizationId: string, conversation: any) {
    this.websocketGateway.emitConversationUpdated(organizationId, conversation);
  }

  async notifyCampaignProgress(organizationId: string, campaignId: string) {
    const campaign = await this.campaignsService.findOne(organizationId, campaignId);
    const progress = await this.campaignsService.getCampaignProgress(campaignId);
    
    this.websocketGateway.emitCampaignProgress(organizationId, campaignId, {
      campaign: campaign,
      progress: progress,
    });
  }

  async notifyLeadConverted(organizationId: string, leadId: string) {
    this.websocketGateway.emitLeadStatusChanged(organizationId, leadId, 'converted');
    
    // Update dashboard
    const dashboardData = await this.analyticsService.getRealTimeDashboard(organizationId);
    this.websocketGateway.emitDashboardUpdate(organizationId, dashboardData);
  }

  async broadcastDashboardUpdate(organizationId: string) {
    const dashboardData = await this.analyticsService.getRealTimeDashboard(organizationId);
    this.websocketGateway.emitDashboardUpdate(organizationId, dashboardData);
  }
}