import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CampaignLead } from '../../campaigns/entities/campaign-lead.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  ENGAGED = 'engaged',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  UNRESPONSIVE = 'unresponsive',
  CONTESTED = 'contested'
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW
  })
  status: LeadStatus;

  @Column({ nullable: true })
  source: string;

  @Column('jsonb', { default: {} })
  customFields: Record<string, any>;

  @Column({ default: 0 })
  responseCount: number;

  @Column({ nullable: true })
  lastContactedAt: Date;

  @Column({ nullable: true })
  convertedAt: Date;

  @ManyToOne(() => Organization, organization => organization.leads)
  organization: Organization;

  @OneToMany(() => CampaignLead, campaignLead => campaignLead.lead)
  campaignLeads: CampaignLead[];

  @OneToMany(() => Conversation, conversation => conversation.lead)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}