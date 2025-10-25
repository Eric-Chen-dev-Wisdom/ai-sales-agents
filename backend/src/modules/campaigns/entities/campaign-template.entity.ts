import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Campaign } from './campaign.entity';

export enum TemplateType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  REMINDER = 'reminder',
  CLOSING = 'closing'
}

@Entity('campaign_templates')
export class CampaignTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TemplateType
  })
  type: TemplateType;

  @Column('text')
  content: string;

  @Column({ default: 0 })
  delayMinutes: number;

  @Column({ default: 0 })
  stepOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Campaign, campaign => campaign.templates)
  campaign: Campaign;

  @CreateDateColumn()
  createdAt: Date;
}