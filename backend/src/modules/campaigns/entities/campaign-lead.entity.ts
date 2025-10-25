import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { Lead } from '../../leads/entities/lead.entity';

export enum CampaignLeadStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  RESPONDED = 'responded',
  CONVERTED = 'converted',
  FAILED = 'failed'
}

@Entity('campaign_leads')
export class CampaignLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Campaign, campaign => campaign.campaignLeads)
  campaign: Campaign;

  @ManyToOne(() => Lead, lead => lead.campaignLeads)
  lead: Lead;

  @Column({
    type: 'enum',
    enum: CampaignLeadStatus,
    default: CampaignLeadStatus.PENDING
  })
  status: CampaignLeadStatus;

  @Column({ default: 0 })
  messagesSent: number;

  @Column({ default: 0 })
  responsesReceived: number;

  @Column({ nullable: true })
  lastMessageSentAt: Date;

  @Column({ nullable: true })
  lastResponseAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}