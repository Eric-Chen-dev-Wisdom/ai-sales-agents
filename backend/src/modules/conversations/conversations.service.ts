import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus, ConversationChannel } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Lead } from '../leads/entities/lead.entity';
import { AiAgent } from '../ai-agents/entities/ai-agent.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(AiAgent)
    private aiAgentsRepository: Repository<AiAgent>,
  ) {}

  async findOrCreateConversation(leadId: string, channel: ConversationChannel, agentId?: string): Promise<Conversation> {
    let conversation = await this.conversationsRepository.findOne({
      where: { 
        lead: { id: leadId },
        channel,
        status: ConversationStatus.ACTIVE
      },
      relations: ['lead', 'messages']
    });

    if (!conversation) {
      const lead = await this.leadsRepository.findOne({ where: { id: leadId } });
      let agent: AiAgent = null;

      if (agentId) {
        agent = await this.aiAgentsRepository.findOne({ where: { id: agentId } });
      }

      conversation = this.conversationsRepository.create({
        lead,
        agent,
        channel,
        status: ConversationStatus.ACTIVE
      });

      conversation = await this.conversationsRepository.save(conversation);
    }

    return conversation;
  }

  async addMessage(conversationId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = this.messagesRepository.create({
      ...createMessageDto,
      conversation: { id: conversationId },
      timestamp: new Date()
    });

    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation stats
    conversation.messageCount += 1;
    conversation.lastMessageAt = new Date();
    await this.conversationsRepository.save(conversation);

    // Update lead response count if it's an inbound message
    if (createMessageDto.direction === 'inbound') {
      await this.leadsRepository.increment(
        { id: conversation.lead.id },
        'responseCount',
        1
      );
    }

    return savedMessage;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await this.messagesRepository.find({
      where: { conversation: { id: conversationId } },
      order: { timestamp: 'ASC' }
    });
  }

  async getOrganizationConversations(organizationId: string, filters?: any): Promise<{ conversations: Conversation[]; total: number }> {
    const query = this.conversationsRepository.createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.lead', 'lead')
      .leftJoinAndSelect('conversation.agent', 'agent')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('lead.organizationId = :organizationId', { organizationId })
      .orderBy('conversation.lastMessageAt', 'DESC');

    if (filters?.status) {
      query.andWhere('conversation.status = :status', { status: filters.status });
    }

    if (filters?.channel) {
      query.andWhere('conversation.channel = :channel', { channel: filters.channel });
    }

    const [conversations, total] = await query
      .skip(filters?.skip || 0)
      .take(filters?.take || 50)
      .getManyAndCount();

    return { conversations, total };
  }

  async getActiveConversationsCount(organizationId: string): Promise<number> {
    return await this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.lead', 'lead')
      .where('lead.organizationId = :organizationId', { organizationId })
      .andWhere('conversation.status = :status', { status: ConversationStatus.ACTIVE })
      .getCount();
  }

  async closeConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.status = ConversationStatus.CLOSED;
    return await this.conversationsRepository.save(conversation);
  }
}