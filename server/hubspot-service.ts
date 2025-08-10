import { Client } from '@hubspot/api-client';
import type { 
  HubSpotRecord, 
  InsertHubSpotRecord, 
  HubSpotAssociation,
  InsertHubSpotAssociation 
} from '@shared/schema';
import { storage } from './storage';

interface PersonaData {
  [key: string]: any;
}

interface HubSpotCreateResult {
  success: boolean;
  hubspotId?: string;
  data?: any;
  error?: string;
}

interface AssociationResult {
  success: boolean;
  associationId?: string;
  error?: string;
}

export class HubSpotService {
  private getClientWithToken(token: string): Client {
    if (!token) {
      throw new Error('HubSpot token is required');
    }
    return new Client({ accessToken: token });
  }

  private validateToken(token: string): boolean {
    return !!token && token.startsWith('pat-');
  }

  async createContact(simulationId: number, personaData: PersonaData, hubspotToken: string): Promise<HubSpotCreateResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      const properties = {
        firstname: personaData.first_name || personaData.firstName,
        lastname: personaData.last_name || personaData.lastName,
        email: personaData.email,
        phone: personaData.phone,
        jobtitle: personaData.job_title || personaData.jobTitle,
        company: personaData.company_name || personaData.companyName,
        hs_lead_status: 'NEW',
        lifecyclestage: 'lead'
      };

      // Remove undefined properties
      Object.keys(properties).forEach(key => {
        if (properties[key as keyof typeof properties] === undefined) {
          delete properties[key as keyof typeof properties];
        }
      });

      const response = await client.crm.contacts.basicApi.create({
        properties,
        associations: []
      });

      // Generate theme key for associations
      const themeKey = this.generateThemeKey(personaData, 'contact');

      // Store record in our database
      const hubspotRecord = await storage.createHubSpotRecord({
        simulationId,
        hubspotObjectId: response.id,
        objectType: 'contact',
        themeKey,
        personaData,
        hubspotData: response
      });

      console.log(`Created HubSpot contact: ${response.id} (${properties.firstname} ${properties.lastname})`);
      
      return {
        success: true,
        hubspotId: response.id,
        data: response
      };

    } catch (error) {
      console.error('Failed to create HubSpot contact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createCompany(simulationId: number, personaData: PersonaData, hubspotToken: string): Promise<HubSpotCreateResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      const properties = {
        name: personaData.company_name || personaData.name,
        domain: personaData.website?.replace(/^https?:\/\//, '') || '',
        industry: personaData.industry,
        numberofemployees: personaData.employee_count || personaData.employeeCount,
        annualrevenue: personaData.annual_revenue || personaData.annualRevenue,
        description: personaData.description,
        lifecyclestage: 'lead'
      };

      // Remove undefined properties
      Object.keys(properties).forEach(key => {
        if (properties[key as keyof typeof properties] === undefined) {
          delete properties[key as keyof typeof properties];
        }
      });

      const response = await client.crm.companies.basicApi.create({
        properties,
        associations: []
      });

      const themeKey = this.generateThemeKey(personaData, 'company');

      await storage.createHubSpotRecord({
        simulationId,
        hubspotObjectId: response.id,
        objectType: 'company',
        themeKey,
        personaData,
        hubspotData: response
      });

      console.log(`Created HubSpot company: ${response.id} (${properties.name})`);
      
      return {
        success: true,
        hubspotId: response.id,
        data: response
      };

    } catch (error) {
      console.error('Failed to create HubSpot company:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createDeal(simulationId: number, personaData: PersonaData, hubspotToken: string): Promise<HubSpotCreateResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      const properties: { [key: string]: string } = {
        dealname: personaData.deal_name || personaData.dealName,
        amount: personaData.amount?.toString() || '0',
        dealstage: this.mapDealStage(personaData.stage),
        closedate: personaData.close_date || personaData.closeDate,
        pipeline: 'default'
      };

      // Remove undefined properties
      Object.keys(properties).forEach(key => {
        if (properties[key as keyof typeof properties] === undefined) {
          delete properties[key as keyof typeof properties];
        }
      });

      const response = await client.crm.deals.basicApi.create({
        properties,
        associations: []
      });

      const themeKey = this.generateThemeKey(personaData, 'deal');

      await storage.createHubSpotRecord({
        simulationId,
        hubspotObjectId: response.id,
        objectType: 'deal',
        themeKey,
        personaData,
        hubspotData: response
      });

      console.log(`Created HubSpot deal: ${response.id} (${properties.dealname})`);
      
      return {
        success: true,
        hubspotId: response.id,
        data: response
      };

    } catch (error) {
      console.error('Failed to create HubSpot deal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createTicket(simulationId: number, personaData: PersonaData, hubspotToken: string): Promise<HubSpotCreateResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      const properties = {
        subject: personaData.subject,
        content: personaData.description || personaData.content,
        hs_pipeline_stage: this.mapTicketStatus(personaData.status),
        hs_ticket_priority: this.mapTicketPriority(personaData.priority),
        hs_ticket_category: personaData.category || 'GENERAL_INQUIRY'
      };

      // Remove undefined properties
      Object.keys(properties).forEach(key => {
        if (properties[key as keyof typeof properties] === undefined) {
          delete properties[key as keyof typeof properties];
        }
      });

      const response = await client.crm.tickets.basicApi.create({
        properties,
        associations: []
      });

      const themeKey = this.generateThemeKey(personaData, 'ticket');

      await storage.createHubSpotRecord({
        simulationId,
        hubspotObjectId: response.id,
        objectType: 'ticket',
        themeKey,
        personaData,
        hubspotData: response
      });

      console.log(`Created HubSpot ticket: ${response.id} (${properties.subject})`);
      
      return {
        success: true,
        hubspotId: response.id,
        data: response
      };

    } catch (error) {
      console.error('Failed to create HubSpot ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createNote(simulationId: number, personaData: PersonaData, hubspotToken: string): Promise<HubSpotCreateResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      const properties: { [key: string]: string } = {
        hs_note_body: personaData.content || personaData.description,
        hs_timestamp: Date.now().toString()
      };

      // Remove undefined properties
      Object.keys(properties).forEach(key => {
        if (properties[key as keyof typeof properties] === undefined) {
          delete properties[key as keyof typeof properties];
        }
      });

      const response = await client.crm.objects.notes.basicApi.create({
        properties,
        associations: []
      });

      const themeKey = this.generateThemeKey(personaData, 'note');

      await storage.createHubSpotRecord({
        simulationId,
        hubspotObjectId: response.id,
        objectType: 'note',
        themeKey,
        personaData,
        hubspotData: response
      });

      console.log(`Created HubSpot note: ${response.id}`);
      
      return {
        success: true,
        hubspotId: response.id,
        data: response
      };

    } catch (error) {
      console.error('Failed to create HubSpot note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createAssociation(
    simulationId: number,
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    hubspotToken: string
  ): Promise<AssociationResult> {
    if (!this.validateToken(hubspotToken)) {
      return { success: false, error: 'Invalid HubSpot token provided' };
    }

    const client = this.getClientWithToken(hubspotToken);

    try {
      // Map object types to HubSpot association type IDs
      const associationTypeId = this.getAssociationTypeId(fromObjectType, toObjectType);
      
      if (!associationTypeId) {
        return { 
          success: false, 
          error: `Unsupported association type: ${fromObjectType} to ${toObjectType}` 
        };
      }

      await client.crm.associations.v4.basicApi.create(
        fromObjectType,
        fromObjectId,
        toObjectType,
        toObjectId,
        [{ associationCategory: 'HUBSPOT_DEFINED' as any, associationTypeId }]
      );

      // Get the actual record IDs from our database for storage
      const fromRecord = await storage.getHubSpotRecordByObjectId(simulationId, fromObjectId);
      const toRecord = await storage.getHubSpotRecordByObjectId(simulationId, toObjectId);

      if (fromRecord && toRecord) {
        await storage.createHubSpotAssociation({
          simulationId,
          fromRecordId: fromRecord.id,
          toRecordId: toRecord.id,
          associationType: `${fromObjectType}_to_${toObjectType}`,
          hubspotAssociationId: `${fromObjectId}_${toObjectId}`
        });
      }

      console.log(`Created association: ${fromObjectType}:${fromObjectId} -> ${toObjectType}:${toObjectId}`);
      
      return {
        success: true,
        associationId: `${fromObjectId}_${toObjectId}`
      };

    } catch (error) {
      console.error('Failed to create HubSpot association:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateThemeKey(personaData: PersonaData, objectType: string): string {
    // Generate a unique key that can be used to identify related records
    const name = personaData.first_name || personaData.company_name || personaData.deal_name || personaData.subject || 'unknown';
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${cleanName}_${objectType}_${Date.now()}`;
  }

  private mapDealStage(stage?: string): string {
    if (!stage) return 'qualifiedtobuy';
    
    const stageMap: { [key: string]: string } = {
      'prospecting': 'appointmentscheduled',
      'qualified': 'qualifiedtobuy',
      'proposal': 'presentationscheduled',
      'negotiation': 'decisionmakerboughtin',
      'closed-won': 'closedwon',
      'closed-lost': 'closedlost'
    };
    
    return stageMap[stage.toLowerCase()] || 'qualifiedtobuy';
  }

  private mapTicketStatus(status?: string): string {
    if (!status) return '1';
    
    const statusMap: { [key: string]: string } = {
      'new': '1',
      'in-progress': '2',
      'waiting': '3',
      'resolved': '4'
    };
    
    return statusMap[status.toLowerCase()] || '1';
  }

  private mapTicketPriority(priority?: string): string {
    if (!priority) return 'MEDIUM';
    
    const priorityMap: { [key: string]: string } = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'urgent': 'HIGH'
    };
    
    return priorityMap[priority.toLowerCase()] || 'MEDIUM';
  }

  private getAssociationTypeId(fromType: string, toType: string): number | null {
    // HubSpot predefined association type IDs
    const associationTypes: { [key: string]: number } = {
      'contact_to_company': 1,
      'company_to_contact': 2,
      'deal_to_contact': 3,
      'contact_to_deal': 4,
      'deal_to_company': 5,
      'company_to_deal': 6,
      'ticket_to_contact': 16,
      'contact_to_ticket': 15,
      'ticket_to_company': 26,
      'company_to_ticket': 25
    };
    
    return associationTypes[`${fromType}_to_${toType}`] || null;
  }

  async createSmartAssociations(simulationId: number, hubspotToken: string): Promise<void> {
    if (!this.validateToken(hubspotToken)) {
      console.error('Invalid HubSpot token for smart associations');
      return;
    }
    try {
      console.log('Creating smart associations for simulation:', simulationId);
      
      // Get all records for this simulation
      const records = await storage.getHubSpotRecordsBySimulation(simulationId);
      
      const contacts = records.filter((r: HubSpotRecord) => r.objectType === 'contact');
      const companies = records.filter((r: HubSpotRecord) => r.objectType === 'company');
      const deals = records.filter((r: HubSpotRecord) => r.objectType === 'deal');
      const tickets = records.filter((r: HubSpotRecord) => r.objectType === 'ticket');
      
      // Associate contacts with companies (based on theme similarity)
      for (const contact of contacts) {
        const matchingCompany = this.findBestMatch(contact, companies);
        if (matchingCompany) {
          await this.createAssociation(
            simulationId,
            'contact',
            contact.hubspotObjectId,
            'company',
            matchingCompany.hubspotObjectId,
            hubspotToken
          );
        }
      }
      
      // Associate deals with contacts
      for (const deal of deals) {
        const matchingContact = this.findBestMatch(deal, contacts);
        if (matchingContact) {
          await this.createAssociation(
            simulationId,
            'deal',
            deal.hubspotObjectId,
            'contact',
            matchingContact.hubspotObjectId,
            hubspotToken
          );
        }
      }
      
      // Associate tickets with contacts
      for (const ticket of tickets) {
        const matchingContact = this.findBestMatch(ticket, contacts);
        if (matchingContact) {
          await this.createAssociation(
            simulationId,
            'ticket',
            ticket.hubspotObjectId,
            'contact',
            matchingContact.hubspotObjectId,
            hubspotToken
          );
        }
      }
      
      console.log('Smart associations completed');
      
    } catch (error) {
      console.error('Failed to create smart associations:', error);
    }
  }

  private findBestMatch(record: HubSpotRecord, candidates: HubSpotRecord[]): HubSpotRecord | null {
    if (candidates.length === 0) return null;
    
    // Simple matching: find records with similar theme elements
    const recordThemeKey = record.themeKey || '';
    const themeElements = recordThemeKey.split('_');
    
    let bestMatch = candidates[0];
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const candidateThemeKey = candidate.themeKey || '';
      let score = 0;
      
      // Score based on theme key similarity
      for (const element of themeElements) {
        if (candidateThemeKey.includes(element)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    return bestScore > 0 ? bestMatch : candidates[Math.floor(Math.random() * candidates.length)];
  }
}

export const hubspotService = new HubSpotService();