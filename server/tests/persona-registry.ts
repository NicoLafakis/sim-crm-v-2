/**
 * Persona Registry - Prevents duplicate contacts and manages persona generation
 * Features: duplicate prevention, similarity checking, concurrency control, LLM integration
 */

import { DatabaseStorage } from "../storage";
import { makeHubSpotRequest } from '../orchestrator';

// Core persona data structure
export interface PersonaRecord {
  id: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  email: string;
  domain: string;
  canonicalString: string;
  deterministicHash: string;
  createdAt: Date;
  hubspotContactId?: string;
  hubspotCompanyId?: string;
}

// Test configuration
export interface TestConfig {
  theme: string;
  industry: string;
  testMode: 'sequential' | 'concurrent';
  maxPersonas?: number;
  similarityThreshold?: number;
}

// In-memory registry with persistence backup
class PersonaRegistry {
  private personas: Map<string, PersonaRecord> = new Map();
  private locks: Map<string, { lockedAt: Date; testId: string }> = new Map();
  private storage = new DatabaseStorage();
  
  // Configuration
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_PERSONAS = 1000;

  /**
   * Check if exact persona exists (email or canonical string match)
   */
  async checkExact(email: string, canonicalString?: string): Promise<PersonaRecord | null> {
    // Check by email first
    for (const persona of Array.from(this.personas.values())) {
      if (persona.email.toLowerCase() === email.toLowerCase()) {
        return persona;
      }
    }
    
    // Check by canonical string if provided
    if (canonicalString) {
      for (const persona of Array.from(this.personas.values())) {
        if (persona.canonicalString === canonicalString) {
          return persona;
        }
      }
    }
    
    return null;
  }

  /**
   * Check for similar personas using fuzzy matching
   */
  async checkSimilar(newPersona: Partial<PersonaRecord>): Promise<PersonaRecord[]> {
    const similar: PersonaRecord[] = [];
    
    for (const persona of Array.from(this.personas.values())) {
      const similarity = this.calculateSimilarity(newPersona, persona);
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        similar.push(persona);
      }
    }
    
    return similar.sort((a, b) => 
      this.calculateSimilarity(newPersona, b) - this.calculateSimilarity(newPersona, a)
    );
  }

  /**
   * Lock a persona for test usage (prevents concurrent conflicts)
   */
  async lock(personaId: string, testId: string): Promise<boolean> {
    const existing = this.locks.get(personaId);
    
    // Check if lock expired
    if (existing && Date.now() - existing.lockedAt.getTime() > this.LOCK_TIMEOUT_MS) {
      this.locks.delete(personaId);
    }
    
    // Check if still locked by another test
    if (existing && existing.testId !== testId) {
      return false;
    }
    
    // Set lock
    this.locks.set(personaId, { lockedAt: new Date(), testId });
    return true;
  }

  /**
   * Unlock a persona after test completion
   */
  async unlock(personaId: string, testId: string): Promise<void> {
    const existing = this.locks.get(personaId);
    if (existing && existing.testId === testId) {
      this.locks.delete(personaId);
    }
  }

  /**
   * Record a new persona in the registry
   */
  async record(persona: PersonaRecord): Promise<void> {
    if (this.personas.size >= this.MAX_PERSONAS) {
      // Clean old personas (FIFO)
      const oldest = Array.from(this.personas.values())
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      this.personas.delete(oldest.id);
    }
    
    this.personas.set(persona.id, persona);
  }

  /**
   * Calculate similarity between two personas (0-1 scale)
   */
  private calculateSimilarity(persona1: Partial<PersonaRecord>, persona2: PersonaRecord): number {
    let matches = 0;
    let total = 0;

    // Compare name similarity
    if (persona1.name && persona2.name) {
      total += 1;
      if (this.stringSimilarity(persona1.name, persona2.name) > 0.8) matches += 1;
    }

    // Compare company similarity
    if (persona1.company && persona2.company) {
      total += 1;
      if (this.stringSimilarity(persona1.company, persona2.company) > 0.8) matches += 1;
    }

    // Compare role similarity
    if (persona1.role && persona2.role) {
      total += 1;
      if (this.stringSimilarity(persona1.role, persona2.role) > 0.7) matches += 1;
    }

    // Compare domain similarity
    if (persona1.domain && persona2.domain) {
      total += 1;
      if (persona1.domain === persona2.domain) matches += 1;
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate deterministic hash for persona data
   */
  generateHash(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString();
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalPersonas: number; lockedPersonas: number; oldestPersona?: Date } {
    const oldest = Array.from(this.personas.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    
    return {
      totalPersonas: this.personas.size,
      lockedPersonas: this.locks.size,
      oldestPersona: oldest?.createdAt
    };
  }

  /**
   * Clear expired locks (maintenance)
   */
  clearExpiredLocks(): void {
    const now = Date.now();
    for (const [personaId, lock] of Array.from(this.locks.entries())) {
      if (now - lock.lockedAt.getTime() > this.LOCK_TIMEOUT_MS) {
        this.locks.delete(personaId);
      }
    }
  }

  /**
   * Reset registry (for testing purposes)
   */
  reset(): void {
    this.personas.clear();
    this.locks.clear();
  }
}

// Singleton registry instance
export const personaRegistry = new PersonaRegistry();

/**
 * Generate unique persona using LLM with guardrails
 */
export async function generateUniquePersona(config: TestConfig): Promise<PersonaRecord> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // Generate base persona data
      const basePersona = await generateBasePersona(config, attempts);
      
      // Check for duplicates
      const exactMatch = await personaRegistry.checkExact(basePersona.email, basePersona.canonicalString);
      if (exactMatch) {
        console.log(`⚠️  Attempt ${attempts}: Exact match found, regenerating...`);
        continue;
      }

      // Check for similar personas
      const similarPersonas = await personaRegistry.checkSimilar(basePersona);
      if (similarPersonas.length > 0) {
        console.log(`⚠️  Attempt ${attempts}: ${similarPersonas.length} similar personas found, regenerating...`);
        continue;
      }

      // Try to lock the persona
      const locked = await personaRegistry.lock(basePersona.id, testId);
      if (!locked) {
        console.log(`⚠️  Attempt ${attempts}: Could not lock persona, regenerating...`);
        continue;
      }

      // Record in registry
      await personaRegistry.record(basePersona);
      
      console.log(`✅ Generated unique persona: ${basePersona.name} (${basePersona.email}) after ${attempts} attempts`);
      return basePersona;

    } catch (error: any) {
      console.error(`❌ Attempt ${attempts} failed:`, error.message);
    }
  }

  throw new Error(`Failed to generate unique persona after ${maxAttempts} attempts`);
}

/**
 * Generate base persona data with theme and industry context
 */
async function generateBasePersona(config: TestConfig, attempt: number): Promise<PersonaRecord> {
  // Add entropy to ensure uniqueness across attempts
  const entropy = `_${Date.now()}_${attempt}_${Math.random().toString(36).substr(2, 5)}`;
  
  // Theme-specific persona templates
  const personaTemplates = {
    marvel: {
      names: ['Peter Parker', 'Tony Stark', 'Natasha Romanoff', 'Steve Rogers', 'Bruce Banner', 'Thor Odinson'],
      companies: ['Daily Bugle Media', 'Stark Industries', 'S.H.I.E.L.D.', 'Avengers Initiative', 'Stark Technologies'],
      roles: ['Photographer', 'CEO', 'Agent', 'Super Soldier', 'Scientist', 'Consultant'],
      domains: ['dailybugle.com', 'starkindustries.com', 'shield.gov', 'avengers.org', 'stark-tech.com']
    },
    generic: {
      names: ['John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'David Brown'],
      companies: ['Tech Solutions Inc', 'Innovation Corp', 'Global Services LLC', 'Future Systems'],
      roles: ['Manager', 'Director', 'Specialist', 'Coordinator', 'Analyst'],
      domains: ['techsolutions.com', 'innovation-corp.com', 'globalservices.com', 'futuresystems.com']
    }
  };

  const template = personaTemplates[config.theme as keyof typeof personaTemplates] || personaTemplates.generic;
  
  // Select random template data with entropy
  const name = template.names[Math.floor(Math.random() * template.names.length)] + entropy;
  const company = template.companies[Math.floor(Math.random() * template.companies.length)] + entropy;
  const role = template.roles[Math.floor(Math.random() * template.roles.length)];
  const domain = template.domains[Math.floor(Math.random() * template.domains.length)];
  
  // Generate unique email
  const emailPrefix = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.-]/g, '');
  const email = `${emailPrefix}@${domain}`;
  
  // Create canonical string for duplicate detection
  const canonicalString = `${name}|${company}|${role}|${config.industry}`.toLowerCase();
  
  // Generate deterministic hash
  const deterministicHash = personaRegistry.generateHash(canonicalString);
  
  const persona: PersonaRecord = {
    id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    company,
    role,
    industry: config.industry,
    email,
    domain,
    canonicalString,
    deterministicHash,
    createdAt: new Date()
  };

  return persona;
}

/**
 * Property type validation for HubSpot
 */
export function validateHubSpotProperty(propertyName: string, value: any, propertyType: string): any {
  switch (propertyType.toLowerCase()) {
    case 'string':
    case 'text':
      return value ? String(value) : '';
      
    case 'number':
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0 : numValue;
      
    case 'boolean':
    case 'bool':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);
      
    case 'date':
    case 'datetime':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
      
    case 'enumeration':
    case 'select':
      return value ? String(value) : '';
      
    default:
      return value;
  }
}

/**
 * Feature flag check for persona registry
 */
export function isPersonaRegistryEnabled(): boolean {
  return process.env.PERSONA_REGISTRY_ENABLED === 'true' || process.env.NODE_ENV === 'development';
}