import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role key for backend
    );
  }

  get client() {
    return this.supabase;
  }

  // ✅ Example helper: Insert a record
  async insert(table: string, record: any) {
    const { data, error } = await this.supabase.from(table).insert(record).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  // ✅ Example helper: Fetch single record
  async findOne(table: string, filter: Record<string, any>) {
    const query = this.supabase.from(table).select('*');
    for (const key in filter) query.eq(key, filter[key]);
    const { data, error } = await query.single();
    if (error) throw new Error(error.message);
    return data;
  }

  // ✅ Example helper: Fetch all records
  async findAll(table: string, filter?: Record<string, any>) {
    const query = this.supabase.from(table).select('*');
    if (filter) {
      for (const key in filter) query.eq(key, filter[key]);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  // ✅ Example helper: Update record
  async update(table: string, filter: Record<string, any>, updateData: any) {
    const query = this.supabase.from(table).update(updateData);
    for (const key in filter) query.eq(key, filter[key]);
    const { data, error } = await query.select();
    if (error) throw new Error(error.message);
    return data[0];
  }
}
