import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';

@ApiTags('leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async create(
    @GetUser('organizationId') organizationId: string,
    @Body() createLeadDto: CreateLeadDto
  ) {
    return this.leadsService.create(organizationId, createLeadDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all leads for organization' })
  async findAll(
    @GetUser('organizationId') organizationId: string,
    @Query() filters: any
  ) {
    return this.leadsService.findAll(organizationId, filters);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get lead statistics' })
  async getStats(@GetUser('organizationId') organizationId: string) {
    return this.leadsService.getLeadStats(organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a specific lead' })
  async findOne(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.leadsService.findOne(organizationId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto
  ) {
    return this.leadsService.update(organizationId, id, updateLeadDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a lead' })
  async remove(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.leadsService.remove(organizationId, id);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Import multiple leads' })
  async importLeads(
    @GetUser('organizationId') organizationId: string,
    @Body() importLeadsDto: ImportLeadsDto
  ) {
    return this.leadsService.importLeads(organizationId, importLeadsDto);
  }

  @Post(':id/convert')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Mark lead as converted' })
  async markAsConverted(
    @GetUser('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.leadsService.markAsConverted(organizationId, id);
  }
}