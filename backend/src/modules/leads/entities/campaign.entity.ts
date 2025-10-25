import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CampaignLead } from './campaign-lead.entity';
import { CampaignTemplate } from './campaign-template.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum CampaignType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  MULTI_CHANNEL = 'multi_channel'
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CampaignType
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT
  })
  status: CampaignStatus;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { default: {} })
  settings: {
    dailyLimit: number;
    timezone: string;
    workingHours: { start: string; end: string };
    followUpDelay: number;
    maxMessagesPerLead: number;
  };

  @Column({ default: 0 })
  totalLeads: number;

  @Column({ default: 0 })
  contactedLeads: number;

  @Column({ default: 0 })
  respondedLeads: number;

  @Column({ type: 'float', default: 0 })
  responseRate: number;

  @ManyToOne(() => Organization, organization => organization.campaigns)
  organization: Organization;

  @OneToMany(() => CampaignLead, campaignLead => campaignLead.campaign)
  campaignLeads: CampaignLead[];

  @OneToMany(() => CampaignTemplate, template => template.campaign)
  templates: CampaignTemplate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  scheduledAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}