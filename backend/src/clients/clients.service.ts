import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  async addClient(clientData: any) {
    return await this.supabase.insert('clients', clientData);
  }

  async getClientById(id: string) {
    return await this.supabase.findOne('clients', { id });
  }

  async getAllClients() {
    return await this.supabase.findAll('clients');
  }

  async updateClient(id: string, updateData: any) {
    return await this.supabase.update('clients', { id }, updateData);
  }
}
