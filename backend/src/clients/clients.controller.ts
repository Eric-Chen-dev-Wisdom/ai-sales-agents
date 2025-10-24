import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from './client.interface'; // ✅ important

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  getClients(): Client[] {
    return this.clientsService.getClients();
  }

  @Get(':id')
  getClientById(@Param('id') id: string): Client | undefined {
    return this.clientsService.getClientById(id);
  }

  @Post('update-crm')
  updateClientCrm(
    @Body() body: { id: string; crm: 'mock' | 'hubspot' | 'salesforce' },
  ): Client | { error: string } {
    return this.clientsService.updateClientCrm(body.id, body.crm);
  }
}
