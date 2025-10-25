import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getDashboardOverview(@GetUser('organizationId') organizationId: string) {
    return this.analyticsService.getDashboardOverview(organizationId);
  }

  @Get('realtime-dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get real-time dashboard data' })
  async getRealTimeDashboard(@GetUser('organizationId') organizationId: string) {
    return this.analyticsService.getRealTimeDashboard(organizationId);
  }

  @Get('campaign-performance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get campaign performance analytics' })
  async getCampaignPerformance(@GetUser('organizationId') organizationId: string) {
    return this.analyticsService.getCampaignPerformance(organizationId);
  }

  @Get('lead-analytics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get lead analytics' })
  async getLeadAnalytics(
    @GetUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;

    return this.analyticsService.getLeadAnalytics(organizationId, dateRange);
  }

  @Get('conversation-analytics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get conversation analytics' })
  async getConversationAnalytics(
    @GetUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;

    return this.analyticsService.getConversationAnalytics(organizationId, dateRange);
  }

  @Get('performance-report')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get comprehensive performance report' })
  async getPerformanceReport(
    @GetUser('organizationId') organizationId: string,
    @Query('period') period?: string
  ) {
    return this.analyticsService.getPerformanceReport(organizationId, period);
  }

  @Get('conversion-funnel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get conversion funnel analysis' })
  async getConversionFunnel(
    @GetUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;

    return this.analyticsService.getConversionFunnel(organizationId, dateRange);
  }
}