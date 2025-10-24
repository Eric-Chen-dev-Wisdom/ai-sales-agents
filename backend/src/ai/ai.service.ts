import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ClientsService } from '../clients/clients.service';
import { CrmService } from '../crm/crm.service';
import { GmailService } from '../integrations/gmail.service';
import { CalendarService } from '../integrations/calendar.service';
import { Client } from '../clients/client.interface';

type Lead = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  // you can extend with phone, stage, etc.
};

@Injectable()
export class AiService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(
    private readonly clientsService: ClientsService,
    private readonly crmService: CrmService,
    private readonly gmailService: GmailService,
    private readonly calendarService: CalendarService,
  ) {}

  /**
   * Fetch leads from the client's CRM
   */
  async getClientLeads(clientId: string) {
    const client: Client | undefined = this.clientsService.getClientById(clientId);
    if (!client) throw new Error(`Client with ID ${clientId} not found`);

    const leads: Lead[] = await this.crmService.getLeads(client.crm, client.token);
    return {
      client: client.name ?? client.crm,
      crm: client.crm,
      total: leads.length,
      leads,
    };
  }

  /**
   * Generate personalized AI message for a lead
   */
  async generateLeadMessage(lead: Lead, clientOffer: string): Promise<string> {
    const prompt = `Write a short, friendly, professional message to ${lead.firstname} ${lead.lastname} about: ${clientOffer}. Keep it under 80 words.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    // Ensure this is always a string (no null/undefined)
    const text = completion?.choices?.[0]?.message?.content ?? 
      `Hi ${lead.firstname}, following up regarding ${clientOffer}. Do you have a minute to chat this week?`;

    return text;
  }

  /**
   * Send AI-generated message to the lead via Gmail
   */
  async sendMessageToLead(clientId: string, leadId: string, offer: string) {
    const client: Client | undefined = this.clientsService.getClientById(clientId);
    if (!client) throw new Error(`Client with ID ${clientId} not found`);

    const lead: Lead = await this.crmService.getLeadById(client.crm, leadId, client.token);
    if (!lead) throw new Error(`Lead with ID ${leadId} not found`);

    const message = await this.generateLeadMessage(lead, offer);

    await this.gmailService.sendEmail({
      to: lead.email,
      subject: `Regarding your interest in ${offer}`,
      text: message, // guaranteed string
    });

    // Optionally update CRM stage here:
    // await this.crmService.updateLead(client.crm, lead.id, { stage: 'Contacted' }, client.token);

    return { success: true, message: 'Email sent', content: message };
  }

  /**
   * Schedule follow-up or meeting in Google Calendar
   */
  async bookMeeting(clientId: string, leadId: string, time: string) {
    const client: Client | undefined = this.clientsService.getClientById(clientId);
    if (!client) throw new Error(`Client with ID ${clientId} not found`);

    const lead: Lead = await this.crmService.getLeadById(client.crm, leadId, client.token);
    if (!lead) throw new Error(`Lead with ID ${leadId} not found`);

    const event = await this.calendarService.createEvent({
      summary: `Meeting with ${lead.firstname} ${lead.lastname}`,
      description: `Follow-up on ${client.name ?? client.crm} offer.`,
      startTime: time, // ISO string expected by your mock
      attendees: [{ email: lead.email }],
    });

    // Optionally update CRM stage here:
    // await this.crmService.updateLead(client.crm, lead.id, { stage: 'Booked' }, client.token);

    return { success: true, event };
  }
}
