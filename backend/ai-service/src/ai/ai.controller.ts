import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('parse-offer')
  parseOffer(@Body('offer') offer: string) {
    return this.ai.parseOffer(offer);
  }

  @Post('find-leads')
  findLeads(@Body('offer') offer: string) {
    return this.ai.findLeads(offer);
  }

  @Post('generate-message')
  generateMessage(@Body() body: { offer: string; lead: string }) {
    return this.ai.generateMessage(body.offer, body.lead);
  }
}
