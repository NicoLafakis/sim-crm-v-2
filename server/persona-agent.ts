import OpenAI from 'openai';
import type { CachedPersona, InsertCachedPersona } from '@shared/schema';
import { storage } from './storage';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

// Initialize OpenAI client only if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn('OPENAI_API_KEY not found. Persona generation will use fallback data.');
}

interface PersonaRequest {
  theme: string;
  industry: string;
  personaType: 'contact' | 'company' | 'deal' | 'ticket' | 'note';
  simulationId: number;
}

interface PersonaResponse {
  data: any;
  cached: boolean;
}

export class PersonaAgent {
  private maxRetries = 3;
  private models = ['gpt-4o', 'gpt-4o-mini']; // fallback models

  async generatePersona(request: PersonaRequest): Promise<PersonaResponse> {
    // Check cache first
    const cached = await this.getCachedPersona(request);
    if (cached) {
      return { data: cached.personaData, cached: true };
    }

    // Generate new persona
    const prompt = this.buildPrompt(request);
    const persona = await this.callOpenAI(prompt, request.personaType);
    
    // Cache the result
    await this.cachePersona(request, persona);
    
    return { data: persona, cached: false };
  }

  private buildPrompt(request: PersonaRequest): string {
    const { theme, industry, personaType } = request;
    
    const basePrompts = {
      contact: `Generate a realistic CRM contact record for a ${industry} business with a ${theme} theme. Include: first_name, last_name, email, phone, job_title, company_name, and a brief notes field. Make it creative and themed appropriately.`,
      
      company: `Generate a realistic CRM company record for a ${industry} business with a ${theme} theme. Include: company_name, website, industry, employee_count, annual_revenue, description. Make it creative and themed appropriately.`,
      
      deal: `Generate a realistic CRM deal record for a ${industry} business with a ${theme} theme. Include: deal_name, amount, stage (prospecting/qualified/proposal/negotiation/closed-won/closed-lost), close_date, probability, description. Make it creative and themed appropriately.`,
      
      ticket: `Generate a realistic support ticket for a ${industry} business with a ${theme} theme. Include: subject, priority (low/medium/high/urgent), status (new/in-progress/waiting/resolved), category, description. Make it creative and themed appropriately.`,
      
      note: `Generate a realistic CRM activity note for a ${industry} business with a ${theme} theme. Include: title, type (call/email/meeting/task), content, next_action. Make it creative and themed appropriately.`
    };

    return basePrompts[personaType] + '\n\nRespond with valid JSON only.';
  }

  private async callOpenAI(prompt: string, personaType: string): Promise<any> {
    // If OpenAI client is not initialized, use fallback
    if (!openai) {
      console.log('OpenAI not available, using fallback generator');
      return this.generateFallbackPersona(personaType);
    }
    
    let lastError: Error | null = null;
    
    for (const model of this.models) {
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a creative data generator for a CRM simulation system. Generate realistic, themed data that matches the requested industry and theme. Always respond with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            max_tokens: 500
          });

          const content = response.choices[0].message.content;
          if (!content) throw new Error('No content in response');
          
          return JSON.parse(content);
        } catch (error) {
          lastError = error as Error;
          console.error(`OpenAI call failed (model: ${model}, attempt ${retry + 1}):`, error);
          
          // Wait before retry with exponential backoff
          if (retry < this.maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
          }
        }
      }
    }
    
    // If all attempts failed, generate fallback data
    console.error('All OpenAI attempts failed, using fallback generator');
    return this.generateFallbackPersona(personaType);
  }

  private generateFallbackPersona(personaType: string): any {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    const fallbacks = {
      contact: {
        first_name: `John${random}`,
        last_name: `Doe${timestamp}`,
        email: `user${random}@example.com`,
        phone: `555-${String(random).padStart(4, '0')}`,
        job_title: 'Manager',
        company_name: `Company ${random}`,
        notes: 'Auto-generated contact'
      },
      company: {
        company_name: `Business ${random}`,
        website: `https://example${random}.com`,
        industry: 'Technology',
        employee_count: Math.floor(Math.random() * 500) + 10,
        annual_revenue: Math.floor(Math.random() * 10000000) + 100000,
        description: 'Auto-generated company'
      },
      deal: {
        deal_name: `Deal ${random}`,
        amount: Math.floor(Math.random() * 100000) + 1000,
        stage: 'qualified',
        close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 50,
        description: 'Auto-generated deal'
      },
      ticket: {
        subject: `Issue ${random}`,
        priority: 'medium',
        status: 'new',
        category: 'support',
        description: 'Auto-generated ticket'
      },
      note: {
        title: `Note ${random}`,
        type: 'call',
        content: 'Auto-generated note',
        next_action: 'Follow up'
      }
    };
    
    return fallbacks[personaType as keyof typeof fallbacks] || {};
  }

  private async getCachedPersona(request: PersonaRequest): Promise<CachedPersona | null> {
    try {
      const cached = await storage.getCachedPersona(
        request.theme,
        request.industry,
        request.personaType
      );
      
      if (cached) {
        // Update usage statistics
        await storage.updateCachedPersonaUsage(cached.id);
      }
      
      return cached || null;
    } catch (error) {
      console.error('Error fetching cached persona:', error);
      return null;
    }
  }

  private async cachePersona(request: PersonaRequest, data: any): Promise<void> {
    try {
      await storage.createCachedPersona({
        theme: request.theme,
        industry: request.industry,
        personaType: request.personaType,
        personaData: data,
        usageCount: 0,
        lastUsedAt: null
      });
      console.log('Cached new persona for reuse');
    } catch (error) {
      console.error('Error caching persona:', error);
    }
  }
}

export const personaAgent = new PersonaAgent();