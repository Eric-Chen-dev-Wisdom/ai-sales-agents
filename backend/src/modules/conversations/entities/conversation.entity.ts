import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { AiAgent } from '../../ai-agents/entities/ai-agent.entity';
import { Message } from './message.entity';

export enum ConversationChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

@Entity('conversations')
@Index(['lead', 'channel'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, lead => lead.conversations)
  lead: Lead;

  @ManyToOne(() => AiAgent, { nullable: true })
  agent: AiAgent;

  @Column({
    type: 'enum',
    enum: ConversationChannel
  })
  channel: ConversationChannel;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE
  })
  status: ConversationStatus;

  @Column({ default: 0 })
  messageCount: number;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastMessageAt: Date;
}

@Entity('messages')
@Index(['conversation', 'timestamp'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: ['inbound', 'outbound']
  })
  direction: 'inbound' | 'outbound';

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  aiGenerated: boolean;
}