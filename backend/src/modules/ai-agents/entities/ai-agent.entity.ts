import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

export enum AgentType {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
  AI_RESPONSE = 'ai_response'
}

@Entity('ai_agents')
export class AiAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AgentType
  })
  type: AgentType;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.ONLINE
  })
  status: AgentStatus;

  @Column('jsonb', { default: {} })
  configuration: {
    apiKey?: string;
    webhookUrl?: string;
    responseDelay: number;
    workingHours: { start: string; end: string };
    maxConcurrentConversations: number;
  };

  @Column('jsonb', { default: {} })
  aiSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };

  @ManyToOne(() => Organization, organization => organization.aiAgents)
  organization: Organization;

  @Column({ default: 0 })
  activeConversations: number;

  @Column({ default: 0 })
  totalMessagesProcessed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}