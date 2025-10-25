import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lead } from '../../leads/entities/lead.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'free' })
  subscriptionPlan: string;

  @Column('jsonb', { default: {} })
  settings: Record<string, any>;

  @OneToMany(() => User, user => user.organization)
  users: User[];

  @OneToMany(() => Lead, lead => lead.organization)
  leads: Lead[];

  @OneToMany(() => Campaign, campaign => campaign.organization)
  campaigns: Campaign[];

  @CreateDateColumn()
  createdAt: Date;
}