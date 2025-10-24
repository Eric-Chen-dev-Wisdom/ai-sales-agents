import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import duckduckgo from 'duckduckgo-search'; // ✅ default import

@Injectable()
export class AiService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //helper function to filter leads by intent
  private async filterLeadsByIntent(results: any[], clientIntent: string) {
    const oppositeIntent = clientIntent === 'sell' ? 'buy' : 'sell';
    const prompt = `
  You are an assistant that filters search results for real ${oppositeIntent.toUpperCase()} leads.
  
  Each result includes a title and snippet.
  Keep only those that show someone trying to ${oppositeIntent} the item.
  Return JSON like:
  [{"title":"...","isLead":true/false}]
  Results: ${JSON.stringify(results.slice(0, 10), null, 2)}
  `;
  
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a precise classifier.' },
        { role: 'user', content: prompt },
      ],
    });
  
    try {
      const parsed = JSON.parse(res.choices[0].message.content || '[]');
      return results.filter((r) => {
        const match = parsed.find(
          (p) => p.title.trim().toLowerCase() === r.title.trim().toLowerCase(),
        );
        return match?.isLead === true;
      });
    } catch {
      return results;
    }
  }
  
  /** Parse client's offer */
  async parseOffer(offer: string) {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `
  Extract structured data as JSON:
  { "intent": "sell" or "buy", "product": "...", "brand": "...", "year": "..." }.
  Only include fields present in the text.`,
        },
        { role: 'user', content: offer },
      ],
    });
  
    try {
      return JSON.parse(res.choices[0].message.content || '{}');
    } catch {
      return { intent: 'sell', raw: offer };
    }
  }
  

  /** Find potential leads */
  async findLeads(offer: string) {
    try {
      // 1️⃣ Parse offer to detect intent
      const parsed = await this.parseOffer(offer);
      const intent = parsed.intent?.toLowerCase() || 'sell';
      const product = parsed.product || parsed.brand || 'car';
      const year = parsed.year || '';
  
      // 2️⃣ Build opposite query based on intent
      const query =
        intent === 'sell'
          ? `buy ${product} ${year} OR looking to purchase ${product} ${year}`
          : `sell ${product} ${year} OR ${product} ${year} for sale`;
  
      console.log('🔍 Query based on intent:', query);
  
      // 3️⃣ Search via Tavily
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          include_answer: false,
          max_results: 10,
        }),
      });
  
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
  
      // 4️⃣ Filter for real buyers/sellers (depending on intent)
      const filtered = await this.filterLeadsByIntent(results, intent);
  
      return filtered.map((r: any) => ({
        title: r.title,
        snippet: r.content ?? r.snippet ?? '',
        url: r.url,
      }));
    } catch (err: any) {
      console.error('❌ findLeads() failed:', err);
      return { error: 'Lead search failed', details: err.message };
    }
  }
  

  /** Generate outreach message */
  async generateMessage(offer: string, leadSnippet: string) {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly sales assistant. Write a short, persuasive, and natural outreach message to a potential lead.',
        },
        {
          role: 'user',
          content: `Offer: ${offer}\nLead: ${leadSnippet}`,
        },
      ],
      temperature: 0.8,
    });

    return res.choices[0].message.content;
  }
}
