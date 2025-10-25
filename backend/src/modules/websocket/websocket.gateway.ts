import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, Set<string>>(); // organizationId -> clientIds

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.user = payload;
      
      // Add client to organization room
      const organizationId = payload.organizationId;
      client.join(organizationId);
      
      // Track connected clients
      if (!this.connectedClients.has(organizationId)) {
        this.connectedClients.set(organizationId, new Set());
      }
      this.connectedClients.get(organizationId).add(client.id);

      this.logger.log(`Client connected: ${client.id}, Organization: ${organizationId}`);
      
      // Send initial real-time data
      this.sendInitialData(client, organizationId);
      
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const organizationId = client.user.organizationId;
      const orgClients = this.connectedClients.get(organizationId);
      if (orgClients) {
        orgClients.delete(client.id);
        if (orgClients.size === 0) {
          this.connectedClients.delete(organizationId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async sendInitialData(client: AuthenticatedSocket, organizationId: string) {
    // Send current active conversations count
    const activeConversations = await this.getActiveConversationsCount(organizationId);
    client.emit('conversations:active-count', { count: activeConversations });

    // Send recent activities
    const recentActivities = await this.getRecentActivities(organizationId);
    client.emit('activities:recent', recentActivities);
  }

  @SubscribeMessage('conversation:subscribe')
  handleSubscribeToConversation(client: AuthenticatedSocket, conversationId: string) {
    client.join(`conversation:${conversationId}`);
    this.logger.log(`Client ${client.id} subscribed to conversation ${conversationId}`);
  }

  @SubscribeMessage('conversation:unsubscribe')
  handleUnsubscribeFromConversation(client: AuthenticatedSocket, conversationId: string) {
    client.leave(`conversation:${conversationId}`);
    this.logger.log(`Client ${client.id} unsubscribed from conversation ${conversationId}`);
  }

  @SubscribeMessage('campaign:subscribe')
  handleSubscribeToCampaign(client: AuthenticatedSocket, campaignId: string) {
    client.join(`campaign:${campaignId}`);
    this.logger.log(`Client ${client.id} subscribed to campaign ${campaignId}`);
  }

  // Methods to emit events to clients
  emitNewMessage(organizationId: string, conversationId: string, message: any) {
    this.server.to(organizationId).emit('conversation:new-message', {
      conversationId,
      message,
    });
    
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);
  }

  emitConversationUpdated(organizationId: string, conversation: any) {
    this.server.to(organizationId).emit('conversation:updated', conversation);
  }

  emitCampaignProgress(organizationId: string, campaignId: string, progress: any) {
    this.server.to(organizationId).emit('campaign:progress', {
      campaignId,
      progress,
    });
    
    this.server.to(`campaign:${campaignId}`).emit('progress:update', progress);
  }

  emitLeadStatusChanged(organizationId: string, leadId: string, newStatus: string) {
    this.server.to(organizationId).emit('lead:status-changed', {
      leadId,
      newStatus,
    });
  }

  emitDashboardUpdate(organizationId: string, data: any) {
    this.server.to(organizationId).emit('dashboard:update', data);
  }

  // Helper methods
  private async getActiveConversationsCount(organizationId: string): Promise<number> {
    // This would be implemented with your conversations service
    return 0; // Placeholder
  }

  private async getRecentActivities(organizationId: string): Promise<any[]> {
    // This would be implemented with your activities service
    return []; // Placeholder
  }

  getConnectedClientsCount(organizationId: string): number {
    return this.connectedClients.get(organizationId)?.size || 0;
  }
}