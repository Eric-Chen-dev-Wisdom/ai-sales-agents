import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
  ) {}

  async create(organizationId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    // Check for duplicate email in organization
    const existingLead = await this.leadsRepository.findOne({
      where: {
        email: createLeadDto.email,
        organization: { id: organizationId }
      }
    });

    if (existingLead) {
      throw new ConflictException('Lead with this email already exists');
    }

    const lead = this.leadsRepository.create({
      ...createLeadDto,
      organization: { id: organizationId }
    });

    return await this.leadsRepository.save(lead);
  }

  async findAll(organizationId: string, filters?: any): Promise<{ leads: Lead[]; total: number }> {
    const query = this.leadsRepository.createQueryBuilder('lead')
      .where('lead.organizationId = :organizationId', { organizationId })
      .leftJoinAndSelect('lead.conversations', 'conversations')
      .orderBy('lead.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(lead.email ILIKE :search OR lead.firstName ILIKE :search OR lead.lastName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [leads, total] = await query
      .skip(filters?.skip || 0)
      .take(filters?.take || 50)
      .getManyAndCount();

    return { leads, total };
  }

  async findOne(organizationId: string, id: string): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id, organization: { id: organizationId } },
      relations: ['conversations', 'conversations.messages', 'campaignLeads', 'campaignLeads.campaign']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(organizationId: string, id: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(organizationId, id);
    
    Object.assign(lead, updateLeadDto);
    
    return await this.leadsRepository.save(lead);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const lead = await this.findOne(organizationId, id);
    await this.leadsRepository.remove(lead);
  }

  async importLeads(organizationId: string, importLeadsDto: ImportLeadsDto): Promise<{ created: number; updated: number; errors: string[] }> {
    const results = { created: 0, updated: 0, errors: [] };
    const existingEmails = new Set();

    for (const leadData of importLeadsDto.leads) {
      try {
        const existingLead = await this.leadsRepository.findOne({
          where: {
            email: leadData.email,
            organization: { id: organizationId }
          }
        });

        if (existingLead) {
          // Update existing lead
          Object.assign(existingLead, leadData);
          await this.leadsRepository.save(existingLead);
          results.updated++;
        } else {
          // Create new lead
          const lead = this.leadsRepository.create({
            ...leadData,
            organization: { id: organizationId }
          });
          await this.leadsRepository.save(lead);
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Failed to import lead ${leadData.email}: ${error.message}`);
      }
    }

    return results;
  }

  async markAsConverted(organizationId: string, id: string): Promise<Lead> {
    const lead = await this.findOne(organizationId, id);
    
    lead.status = LeadStatus.CONVERTED;
    lead.convertedAt = new Date();
    
    return await this.leadsRepository.save(lead);
  }

  async getLeadStats(organizationId: string): Promise<any> {
    const stats = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(lead.id)', 'count')
      .where('lead.organizationId = :organizationId', { organizationId })
      .groupBy('lead.status')
      .getRawMany();

    const total = await this.leadsRepository.count({
      where: { organization: { id: organizationId } }
    });

    const contested = await this.leadsRepository.count({
      where: { 
        organization: { id: organizationId },
        status: LeadStatus.CONTESTED
      }
    });

    return {
      total,
      contested,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {})
    };
  }
}