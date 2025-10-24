import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ClientsModule } from '../clients/clients.module';
import { CrmModule } from '../crm/crm.module';
import { GmailService } from '../integrations/gmail.service';
import { CalendarService } from '../integrations/calendar.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ClientsController } from '../clients/add/clients.controller';

@Module({
  imports: [
    ClientsModule,
    CrmModule, // ✅ important: allows AiModule to see CrmService (and MockService transitively)
  ],
  providers: [AiService, GmailService, CalendarService],
  controllers: [AiController, ClientsController],
  exports: [AiService],
})
export class AiModule {}
