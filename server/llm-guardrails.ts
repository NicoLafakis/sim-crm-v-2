/**
 * LLM Persona/Data Generation Guardrails
 * 
 * Provides JSON schema validation, persona caching with TTL, and deterministic seeding
 * to ensure valid and consistent LLM outputs across themes/industries
 */

import { z } from 'zod';
import crypto from 'crypto';

// Schema version for validation tracking
export const SCHEMA_VERSION = "1.0.0";

// JSON Schema Definitions for LLM-generated content
const PersonaSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(100),
  industry: z.string().min(1).max(50),
  lifecycleStage: z.enum(['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist', 'other']),
  leadStatus: z.enum(['new', 'open', 'in progress', 'open deal', 'unqualified', 'attempted to contact', 'connected', 'bad timing']).optional(),
  customProperties: z.record(z.string(), z.any()).optional()
});

const CompanySchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(100),
  industry: z.string().min(1).max(50),
  city: z.string().min(1).max(50),
  state: z.string().min(1).max(50),
  country: z.string().min(1).max(50),
  phone: z.string().optional(),
  numberOfEmployees: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  lifecycleStage: z.enum(['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist', 'other']),
  customProperties: z.record(z.string(), z.any()).optional()
});

const DealSchema = z.object({
  dealname: z.string().min(1).max(100),
  amount: z.number().positive().optional(),
  dealstage: z.string().min(1).max(50),
  pipeline: z.string().min(1).max(50),
  closedate: z.string().optional(), // ISO date string
  dealtype: z.enum(['existingbusiness', 'newbusiness']).optional(),
  hubspot_owner_id: z.string().optional(),
  customProperties: z.record(z.string(), z.any()).optional()
});

const TicketSchema = z.object({
  subject: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  hs_pipeline_stage: z.string().min(1).max(50),
  hs_pipeline: z.string().min(1).max(50),
  hs_ticket_priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  hubspot_owner_id: z.string().optional(),
  customProperties: z.record(z.string(), z.any()).optional()
});

const GeneratedDataSchema = z.object({
  personas: z.array(PersonaSchema).optional(),
  companies: z.array(CompanySchema).optional(),
  deals: z.array(DealSchema).optional(),
  tickets: z.array(TicketSchema).optional(),
  theme: z.string().min(1),
  industry: z.string().min(1),
  generated_at: z.string() // ISO date string
});

// Persona Cache with TTL
interface CacheEntry {
  data: any;
  expiresAt: number;
  seed?: string;
}

class PersonaCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = parseInt(process.env.PERSONA_CACHE_TTL || '3600000'); // 1 hour default
  
  // Counters for cache metrics
  private hits = 0;
  private misses = 0;
  private evictedInvalid = 0;
  private writes = 0;

  /**
   * Generate cache key from theme and industry
   */
  private getCacheKey(theme: string, industry: string, seed?: string): string {
    const baseKey = `${theme.toLowerCase()}:${industry.toLowerCase()}`;
    return seed ? `${baseKey}:${seed}` : baseKey;
  }

  /**
   * Get cached persona data
   */
  get(theme: string, industry: string, seed?: string): any | null {
    const key = this.getCacheKey(theme, industry, seed);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    console.log(`📋 Cache hit for personas: ${theme} + ${industry}${seed ? ` (seed: ${seed})` : ''}`);
    return entry.data;
  }

  /**
   * Set cached persona data
   */
  set(theme: string, industry: string, data: any, seed?: string, ttlMs?: number): void {
    const key = this.getCacheKey(theme, industry, seed);
    const ttl = ttlMs || this.defaultTTL;
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      seed
    });
    
    this.writes++;
    console.log(`💾 Cached personas: ${theme} + ${industry}${seed ? ` (seed: ${seed})` : ''} [TTL: ${ttl}ms]`);
  }

  /**
   * Delete a single cache entry
   */
  delete(theme: string, industry: string, seed?: string): void {
    const key = this.getCacheKey(theme, industry, seed);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.evictedInvalid++;
      console.log(`🗑️ Evicted invalid cache entry: ${theme} + ${industry}${seed ? ` (seed: ${seed})` : ''}`);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let clearedCount = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} expired persona cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { 
    size: number; 
    entries: Array<{ key: string; expiresAt: number; hasData: boolean }>;
    hits: number;
    misses: number;
    evictedInvalid: number;
    writes: number;
  } {
    const entries = [];
    for (const [key, entry] of Array.from(this.cache.entries())) {
      entries.push({
        key,
        expiresAt: entry.expiresAt,
        hasData: !!entry.data
      });
    }
    return {
      size: this.cache.size,
      entries,
      hits: this.hits,
      misses: this.misses,
      evictedInvalid: this.evictedInvalid,
      writes: this.writes
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Persona cache cleared');
  }
}

// Deterministic Seeding
class SeededGenerator {
  /**
   * Generate deterministic seed from job context
   */
  static generateSeed(jobId: number, theme: string, industry: string, stepIndex?: number): string {
    const context = `${jobId}:${theme}:${industry}${stepIndex !== undefined ? `:${stepIndex}` : ''}`;
    return crypto.createHash('md5').update(context).digest('hex').substring(0, 8);
  }

  /**
   * Create deterministic prompt with seed
   */
  static createSeededPrompt(basePrompt: string, seed: string): string {
    return `${basePrompt}\n\nIMPORTANT: Use this seed for consistent generation: ${seed}. Generate the same realistic data every time for this seed.`;
  }

  /**
   * Validate seed format
   */
  static isValidSeed(seed: string): boolean {
    return /^[a-f0-9]{8}$/.test(seed);
  }
}

// LLM Output Validator
class LLMValidator {
  /**
   * Validate generated persona data against schema
   */
  static validateGeneratedData(data: any, theme: string, industry: string): { 
    isValid: boolean; 
    validatedData?: any; 
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!data || typeof data !== 'object') {
        return { 
          isValid: false, 
          errors: ['Invalid data structure: Expected object'],
          warnings 
        };
      }

      // Parse and validate using Zod schema
      const result = GeneratedDataSchema.safeParse({
        ...data,
        theme,
        industry,
        generated_at: new Date().toISOString()
      });

      if (!result.success) {
        const zodErrors = result.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        );
        errors.push(...zodErrors);
      }

      // Additional business logic validation
      if (data.personas) {
        for (let i = 0; i < data.personas.length; i++) {
          const persona = data.personas[i];
          
          // Check email uniqueness within the set
          const duplicateEmails = data.personas.filter((p: any, idx: number) => 
            idx !== i && p.email === persona.email
          );
          if (duplicateEmails.length > 0) {
            warnings.push(`Duplicate email detected: ${persona.email}`);
          }

          // Validate theme consistency
          if (persona.customProperties && !this.isThemeConsistent(persona, theme)) {
            warnings.push(`Persona ${i + 1} may not be consistent with theme: ${theme}`);
          }
        }
      }

      if (data.companies) {
        for (let i = 0; i < data.companies.length; i++) {
          const company = data.companies[i];
          
          // Check domain uniqueness
          const duplicateDomains = data.companies.filter((c: any, idx: number) => 
            idx !== i && c.domain === company.domain
          );
          if (duplicateDomains.length > 0) {
            warnings.push(`Duplicate domain detected: ${company.domain}`);
          }
        }
      }

      // Theme and industry consistency check
      if (!this.isContentThemeConsistent(data, theme, industry)) {
        warnings.push('Generated content may not be fully consistent with specified theme and industry');
      }

      return {
        isValid: errors.length === 0,
        validatedData: result.success ? result.data : undefined,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Check if persona is consistent with theme
   */
  private static isThemeConsistent(persona: any, theme: string): boolean {
    // Basic theme consistency checks (can be expanded)
    const themeKeywords = this.getThemeKeywords(theme);
    const personaText = JSON.stringify(persona).toLowerCase();
    
    // At least one theme keyword should appear
    return themeKeywords.some(keyword => personaText.includes(keyword));
  }

  /**
   * Check if overall content is theme consistent
   */
  private static isContentThemeConsistent(data: any, theme: string, industry: string): boolean {
    const contentText = JSON.stringify(data).toLowerCase();
    const themeKeywords = this.getThemeKeywords(theme);
    const industryKeywords = this.getIndustryKeywords(industry);
    
    // Check for theme and industry keyword presence
    const hasThemeKeywords = themeKeywords.some(keyword => contentText.includes(keyword));
    const hasIndustryKeywords = industryKeywords.some(keyword => contentText.includes(keyword));
    
    return hasThemeKeywords || hasIndustryKeywords;
  }

  /**
   * Get keywords for theme validation
   */
  private static getThemeKeywords(theme: string): string[] {
    const themeMap: Record<string, string[]> = {
      'star_wars': ['star', 'wars', 'jedi', 'sith', 'force', 'galaxy', 'empire', 'rebel'],
      'marvel': ['marvel', 'hero', 'super', 'avenger', 'stark', 'shield'],
      'game_of_thrones': ['throne', 'westeros', 'stark', 'lannister', 'dragon', 'kingdom'],
      'harry_potter': ['potter', 'wizard', 'magic', 'hogwarts', 'spell', 'wand'],
      'lord_of_rings': ['ring', 'hobbit', 'shire', 'gandalf', 'middle', 'earth'],
      'pokemon': ['pokemon', 'trainer', 'catch', 'battle', 'gym', 'league']
    };
    
    return themeMap[theme.toLowerCase()] || [theme.toLowerCase()];
  }

  /**
   * Get keywords for industry validation
   */
  private static getIndustryKeywords(industry: string): string[] {
    const industryMap: Record<string, string[]> = {
      'technology': ['tech', 'software', 'digital', 'IT', 'development', 'innovation'],
      'healthcare': ['health', 'medical', 'patient', 'care', 'clinic', 'hospital'],
      'finance': ['finance', 'bank', 'investment', 'money', 'capital', 'financial'],
      'retail': ['retail', 'store', 'shop', 'customer', 'product', 'sale'],
      'manufacturing': ['manufacture', 'factory', 'production', 'industrial', 'supply'],
      'education': ['education', 'school', 'student', 'learning', 'academic', 'university']
    };
    
    return industryMap[industry.toLowerCase()] || [industry.toLowerCase()];
  }

  /**
   * Attempt to fix common LLM output issues
   */
  static attemptAutoFix(data: any): { fixed: boolean; data: any; changes: string[] } {
    const changes: string[] = [];
    let fixed = false;

    try {
      // Deep clone to avoid mutation
      const fixedData = JSON.parse(JSON.stringify(data));

      // Fix missing required fields with defaults
      if (fixedData.personas) {
        for (let i = 0; i < fixedData.personas.length; i++) {
          const persona = fixedData.personas[i];
          
          // Fix missing lifecycleStage
          if (!persona.lifecycleStage) {
            persona.lifecycleStage = 'lead';
            changes.push(`Set default lifecycleStage for persona ${i + 1}`);
            fixed = true;
          }
          
          // Fix invalid email format
          if (persona.email && !persona.email.includes('@')) {
            persona.email = `${persona.firstName?.toLowerCase() || 'user'}@${persona.company?.toLowerCase().replace(/\s+/g, '') || 'example'}.com`;
            changes.push(`Fixed email format for persona ${i + 1}`);
            fixed = true;
          }
        }
      }

      // Similar fixes for other object types...
      if (fixedData.companies) {
        for (let i = 0; i < fixedData.companies.length; i++) {
          const company = fixedData.companies[i];
          
          if (!company.lifecycleStage) {
            company.lifecycleStage = 'lead';
            changes.push(`Set default lifecycleStage for company ${i + 1}`);
            fixed = true;
          }
        }
      }

      return { fixed, data: fixedData, changes };

    } catch (error) {
      return { fixed: false, data, changes: [`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`] };
    }
  }
}

// Global instances
const personaCache = new PersonaCache();

// Cleanup expired entries every 30 minutes
setInterval(() => personaCache.cleanup(), 30 * 60 * 1000);

export {
  PersonaCache,
  SeededGenerator,
  LLMValidator,
  personaCache,
  PersonaSchema,
  CompanySchema,
  DealSchema,
  TicketSchema,
  GeneratedDataSchema,
  SCHEMA_VERSION
};

export type {
  CacheEntry
};