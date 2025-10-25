import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { Conversation, ConversationStatus } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { CampaignLead, CampaignLeadStatus } from '../campaigns/entities/campaign-lead.entity';
import { AiAgent, AgentStatus } from '../ai-agents/entities/ai-agent.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(CampaignLead)
    private campaignLeadsRepository: Repository<CampaignLead>,
    @InjectRepository(AiAgent)
    private aiAgentsRepository: Repository<AiAgent>,
  ) {}

  async getDashboardOverview(organizationId: string) {
    const [
      totalLeads,
      activeCampaigns,
      activeConversations,
      leadsContested,
      agentInvestsBooked,
      aiAgents
    ] = await Promise.all([
      this.leadsRepository.count({ where: { organization: { id: organizationId } } }),
      this.campaignsRepository.count({ 
        where: { 
          organization: { id: organizationId },
          status: CampaignStatus.ACTIVE 
        } 
      }),
      this.conversationsRepository.count({
        where: { 
          lead: { organization: { id: organizationId } },
          status: ConversationStatus.ACTIVE 
        }
      }),
      this.leadsRepository.count({
        where: { 
          organization: { id: organizationId },
          status: LeadStatus.CONTESTED 
        }
      }),
      this.getAgentInvestsBooked(organizationId),
      this.aiAgentsRepository.find({ 
        where: { organization: { id: organizationId } },
        select: ['id', 'name', 'type', 'status', 'activeConversations']
      })
    ]);

    const responseRate = await this.calculateResponseRate(organizationId);

    return {
      totalLeads,
      activeCampaigns,
      activeConversations,
      leadsContested,
      agentInvestsBooked,
      responseRate: Math.round(responseRate * 100),
      aiAgents: aiAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        activeConversations: agent.activeConversations,
        online: agent.status === AgentStatus.ONLINE
      }))
    };
  }

  async getRealTimeDashboard(organizationId: string) {
    const overview = await this.getDashboardOverview(organizationId);
    
    // Get recent activities
    const recentActivities = await this.getRecentActivities(organizationId, 10);
    
    // Get campaign performance
    const campaignPerformance = await this.getCampaignPerformance(organizationId);
    
    // Get conversion funnel
    const conversionFunnel = await this.getConversionFunnel(organizationId);

    return {
      ...overview,
      recentActivities,
      campaignPerformance,
      conversionFunnel,
      lastUpdated: new Date()
    };
  }

  async getCampaignPerformance(organizationId: string, period?: string) {
    const campaigns = await this.campaignsRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['campaignLeads', 'campaignLeads.lead']
    });

    return campaigns.map(campaign => {
      const totalLeads = campaign.campaignLeads.length;
      const contactedLeads = campaign.campaignLeads.filter(cl => 
        cl.status !== CampaignLeadStatus.PENDING
      ).length;
      const respondedLeads = campaign.campaignLeads.filter(cl => 
        cl.status === CampaignLeadStatus.RESPONDED
      ).length;
      const convertedLeads = campaign.campaignLeads.filter(cl => 
        cl.lead.status === LeadStatus.CONVERTED
      ).length;

      const responseRate = totalLeads > 0 ? (respondedLeads / totalLeads) * 100 : 0;
      const conversionRate = respondedLeads > 0 ? (convertedLeads / respondedLeads) * 100 : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        leads: totalLeads,
        contacted: contactedLeads,
        responded: respondedLeads,
        converted: convertedLeads,
        responseRate: Math.round(responseRate),
        conversionRate: Math.round(conversionRate),
        avgResponseTime: this.calculateAverageResponseTime(campaign.campaignLeads)
      };
    });
  }

  async getLeadAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const whereConditions: any = { organization: { id: organizationId } };
    
    if (dateRange) {
      whereConditions.createdAt = Between(dateRange.start, dateRange.end);
    }

    const leads = await this.leadsRepository.find({ where: whereConditions });
    
    const statusDistribution = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    const sourceDistribution = leads.reduce((acc, lead) => {
      const source = lead.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const dailyAcquisition = await this.getDailyLeadAcquisition(organizationId, dateRange);

    return {
      total: leads.length,
      statusDistribution,
      sourceDistribution,
      dailyAcquisition,
      averageResponseCount: leads.reduce((sum, lead) => sum + lead.responseCount, 0) / leads.length || 0,
      conversionRate: (leads.filter(lead => lead.status === LeadStatus.CONVERTED).length / leads.length) * 100 || 0
    };
  }

  async getConversationAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const whereConditions: any = { lead: { organization: { id: organizationId } } };
    
    if (dateRange) {
      whereConditions.createdAt = Between(dateRange.start, dateRange.end);
    }

    const conversations = await this.conversationsRepository.find({
      where: whereConditions,
      relations: ['messages', 'lead']
    });

    const channelDistribution = conversations.reduce((acc, conv) => {
      acc[conv.channel] = (acc[conv.channel] || 0) + 1;
      return acc;
    }, {});

    const messageCounts = conversations.map(conv => conv.messageCount);
    const avgMessagesPerConversation = messageCounts.reduce((a, b) => a + b, 0) / messageCounts.length || 0;

    const responseTimes = await this.calculateAverageResponseTimes(organizationId, dateRange);

    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === ConversationStatus.ACTIVE).length,
      channelDistribution,
      avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100,
      averageResponseTimes: responseTimes,
      resolutionRate: (conversations.filter(c => c.status === ConversationStatus.CLOSED).length / conversations.length) * 100 || 0
    };
  }

  async getPerformanceReport(organizationId: string, period: string = '7d') {
    const dateRange = this.getDateRangeFromPeriod(period);
    
    const [leadAnalytics, conversationAnalytics, campaignPerformance] = await Promise.all([
      this.getLeadAnalytics(organizationId, dateRange),
      this.getConversationAnalytics(organizationId, dateRange),
      this.getCampaignPerformance(organizationId)
    ]);

    const agentPerformance = await this.getAgentPerformance(organizationId, dateRange);

    return {
      period,
      dateRange,
      leadAnalytics,
      conversationAnalytics,
      campaignPerformance,
      agentPerformance,
      summary: {
        totalLeads: leadAnalytics.total,
        totalConversations: conversationAnalytics.totalConversations,
        overallResponseRate: await this.calculateResponseRate(organizationId, dateRange),
        overallConversionRate: leadAnalytics.conversionRate,
        averageResponseTime: conversationAnalytics.averageResponseTimes.overall
      }
    };
  }

  async getConversionFunnel(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const whereConditions: any = { organization: { id: organizationId } };
    
    if (dateRange) {
      whereConditions.createdAt = Between(dateRange.start, dateRange.end);
    }

    const leads = await this.leadsRepository.find({ where: whereConditions });

    const funnel = {
      total: leads.length,
      contacted: leads.filter(lead => lead.status !== LeadStatus.NEW).length,
      engaged: leads.filter(lead => lead.responseCount > 0).length,
      qualified: leads.filter(lead => lead.status === LeadStatus.QUALIFIED).length,
      converted: leads.filter(lead => lead.status === LeadStatus.CONVERTED).length
    };

    const conversionRates = {
      contactRate: (funnel.contacted / funnel.total) * 100,
      engagementRate: (funnel.engaged / funnel.contacted) * 100 || 0,
      qualificationRate: (funnel.qualified / funnel.engaged) * 100 || 0,
      conversionRate: (funnel.converted / funnel.qualified) * 100 || 0,
      overallConversion: (funnel.converted / funnel.total) * 100
    };

    return {
      funnel,
      conversionRates
    };
  }

  // Helper Methods
  private async calculateResponseRate(organizationId: string, dateRange?: { start: Date; end: Date }): Promise<number> {
    const whereConditions: any = { organization: { id: organizationId } };
    
    if (dateRange) {
      whereConditions.createdAt = Between(dateRange.start, dateRange.end);
    }

    const totalLeads = await this.leadsRepository.count({ where: whereConditions });
    
    const respondedLeads = await this.leadsRepository
      .createQueryBuilder('lead')
      .where('lead.organizationId = :organizationId', { organizationId })
      .andWhere('lead.responseCount > 0')
      .getCount();

    return totalLeads > 0 ? respondedLeads / totalLeads : 0;
  }

  private async getAgentInvestsBooked(organizationId: string): Promise<number> {
    // This would typically count specific types of conversions or appointments
    return await this.leadsRepository.count({
      where: { 
        organization: { id: organizationId },
        status: LeadStatus.CONVERTED,
        convertedAt: MoreThanOrEqual(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      }
    });
  }

  private async getRecentActivities(organizationId: string, limit: number = 10): Promise<any[]> {
    const recentMessages = await this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.lead', 'lead')
      .where('lead.organizationId = :organizationId', { organizationId })
      .orderBy('message.timestamp', 'DESC')
      .limit(limit)
      .getMany();

    return recentMessages.map(message => ({
      type: 'message',
      direction: message.direction,
      content: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      leadName: `${message.conversation.lead.firstName} ${message.conversation.lead.lastName}`,
      channel: message.conversation.channel,
      timestamp: message.timestamp
    }));
  }

  private async getDailyLeadAcquisition(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const query = this.leadsRepository
      .createQueryBuilder('lead')
      .select("DATE(lead.createdAt)", "date")
      .addSelect("COUNT(lead.id)", "count")
      .where('lead.organizationId = :organizationId', { organizationId })
      .groupBy("DATE(lead.createdAt)")
      .orderBy("date", "ASC");

    if (dateRange) {
      query.andWhere('lead.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      });
    }

    return await query.getRawMany();
  }

  private calculateAverageResponseTime(campaignLeads: CampaignLead[]): number {
    const respondedLeads = campaignLeads.filter(cl => cl.lastResponseAt && cl.lastMessageSentAt);
    
    if (respondedLeads.length === 0) return 0;

    const totalResponseTime = respondedLeads.reduce((sum, cl) => {
      const responseTime = cl.lastResponseAt.getTime() - cl.lastMessageSentAt.getTime();
      return sum + responseTime;
    }, 0);

    return Math.round(totalResponseTime / respondedLeads.length / (1000 * 60)); // Convert to minutes
  }

  private async calculateAverageResponseTimes(organizationId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    // This would calculate average response times per channel
    // Implementation would involve analyzing message timestamps
    return {
      whatsapp: 2.5, // minutes
      email: 45.2, // minutes
      sms: 1.8, // minutes
      overall: 16.5 // minutes
    };
  }

  private async getAgentPerformance(organizationId: string, dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const agents = await this.aiAgentsRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['conversations', 'conversations.messages']
    });

    return agents.map(agent => {
      const agentConversations = agent.conversations || [];
      const totalMessages = agentConversations.reduce((sum, conv) => sum + conv.messageCount, 0);
      
      return {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        activeConversations: agent.activeConversations,
        totalConversations: agentConversations.length,
        totalMessages,
        avgMessagesPerConversation: agentConversations.length > 0 ? totalMessages / agentConversations.length : 0,
        status: agent.status
      };
    });
  }

  private getDateRangeFromPeriod(period: string): { start: Date; end: Date } {
    const end = new Date();
    let start = new Date();

    switch (period) {
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start, end };
  }
}