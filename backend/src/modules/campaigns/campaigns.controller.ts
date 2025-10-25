import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { StartCampaignDto } from './dto/start-campaign.dto';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async create(
    @GetUser('organizationId') organizationId: string,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignsService.createCampaign(organizationId, createCampaignDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all campaigns for organization' })
  async findAll(@GetUser('organizationId') organizationId: string) {
    return this.campaignsService.findAll(organizationId);
  }

  @Get('performance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  async getPerformance(@GetUser('organizationId') organizationId: string) {
    return this.campaignsService.getCampaignPerformance(organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific campaign' })
  async findOne(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.campaignsService.findOne(organizationId, id);
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Start a campaign' })
  async startCampaign(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() startCampaignDto: StartCampaignDto
  ) {
    return this.campaignsService.startCampaign(organizationId, id, startCampaignDto);
  }

  @Post(':id/leads/import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Import leads to campaign' })
  async importLeads(
    @Param('id') campaignId: string,
    @Body() body: { leads: any[] }
  ) {
    return this.campaignsService.importLeadsToCampaign(campaignId, body.leads);
  }

  @Post(':id/pause')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Pause a campaign' })
  async pauseCampaign(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.campaignsService.pauseCampaign(organizationId, id);
  }

  @Post(':id/resume')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Resume a campaign' })
  async resumeCampaign(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.campaignsService.resumeCampaign(organizationId, id);
  }
}