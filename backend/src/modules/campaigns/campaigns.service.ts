import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Campaign, CampaignStatus, CampaignType } from './entities/campaign.entity';
import { CampaignLead, CampaignLeadStatus } from './entities/campaign-lead.entity';
import { CampaignTemplate } from './entities/campaign-template.entity';
import { Lead } from '../leads/entities/lead.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { StartCampaignDto } from './dto/start-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(CampaignLead)
    private campaignLeadsRepository: Repository<CampaignLead>,
    @InjectRepository(CampaignTemplate)
    private campaignTemplatesRepository: Repository<CampaignTemplate>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
  ) {}

  async createCampaign(organizationId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepository.create({
      ...createCampaignDto,
      organization: { id: organizationId }
    });

    return await this.campaignsRepository.save(campaign);
  }

  async findAll(organizationId: string): Promise<Campaign[]> {
    return await this.campaignsRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['campaignLeads', 'templates'],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(organizationId: string, id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id, organization: { id: organizationId } },
      relations: ['campaignLeads', 'campaignLeads.lead', 'templates']
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async startCampaign(organizationId: string, id: string, startCampaignDto: StartCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(organizationId, id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Campaign can only be started from draft status');
    }

    campaign.status = CampaignStatus.ACTIVE;
    campaign.startedAt = new Date();
    campaign.settings = { ...campaign.settings, ...startCampaignDto.settings };

    // Add leads to campaign if provided
    if (startCampaignDto.leadIds && startCampaignDto.leadIds.length > 0) {
      await this.addLeadsToCampaign(campaign.id, startCampaignDto.leadIds);
    }

    return await this.campaignsRepository.save(campaign);
  }

  async addLeadsToCampaign(campaignId: string, leadIds: string[]): Promise<CampaignLead[]> {
    const campaign = await this.campaignsRepository.findOne({ where: { id: campaignId } });
    const leads = await this.leadsRepository.find({ where: { id: In(leadIds) } });

    const campaignLeads = leads.map(lead => 
      this.campaignLeadsRepository.create({
        campaign: { id: campaignId },
        lead: { id: lead.id }
      })
    );

    const savedLeads = await this.campaignLeadsRepository.save(campaignLeads);

    // Update campaign totals
    campaign.totalLeads = await this.campaignLeadsRepository.count({ where: { campaign: { id: campaignId } } });
    await this.campaignsRepository.save(campaign);

    return savedLeads;
  }

  async importLeadsToCampaign(campaignId: string, leadsData: any[]): Promise<{ created: number; errors: string[] }> {
    const results = { created: 0, errors: [] };
    const campaign = await this.campaignsRepository.findOne({ where: { id: campaignId } });

    for (const leadData of leadsData) {
      try {
        let lead: Lead;

        // Check if lead already exists by email
        if (leadData.email) {
          lead = await this.leadsRepository.findOne({ 
            where: { 
              email: leadData.email,
              organization: { id: campaign.organization.id }
            } 
          });
        }

        // Create new lead if doesn't exist
        if (!lead) {
          lead = this.leadsRepository.create({
            ...leadData,
            organization: { id: campaign.organization.id }
          });
          lead = await this.leadsRepository.save(lead);
        }

        // Add lead to campaign
        const campaignLead = this.campaignLeadsRepository.create({
          campaign: { id: campaignId },
          lead: { id: lead.id }
        });

        await this.campaignLeadsRepository.save(campaignLead);
        results.created++;
      } catch (error) {
        results.errors.push(`Failed to import lead: ${error.message}`);
      }
    }

    // Update campaign totals
    campaign.totalLeads = await this.campaignLeadsRepository.count({ where: { campaign: { id: campaignId } } });
    await this.campaignsRepository.save(campaign);

    return results;
  }

  async getCampaignPerformance(organizationId: string): Promise<any[]> {
    const campaigns = await this.campaignsRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['campaignLeads']
    });

    return campaigns.map(campaign => {
      const totalLeads = campaign.campaignLeads.length;
      const contactedLeads = campaign.campaignLeads.filter(cl => 
        cl.status !== CampaignLeadStatus.PENDING
      ).length;
      const respondedLeads = campaign.campaignLeads.filter(cl => 
        cl.status === CampaignLeadStatus.RESPONDED
      ).length;

      const responseRate = totalLeads > 0 ? (respondedLeads / totalLeads) * 100 : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        leads: totalLeads,
        contacted: contactedLeads,
        responded: respondedLeads,
        responseRate: Math.round(responseRate),
        status: campaign.status
      };
    });
  }

  async pauseCampaign(organizationId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(organizationId, id);
    
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return await this.campaignsRepository.save(campaign);
  }

  async resumeCampaign(organizationId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(organizationId, id);
    
    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    campaign.status = CampaignStatus.ACTIVE;
    return await this.campaignsRepository.save(campaign);
  }

  async addTemplateToCampaign(campaignId: string, templateData: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const template = this.campaignTemplatesRepository.create({
      ...templateData,
      campaign: { id: campaignId }
    });

    return await this.campaignTemplatesRepository.save(template);
  }
}