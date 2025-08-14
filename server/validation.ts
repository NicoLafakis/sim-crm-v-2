/**
 * Validation utilities for data processing
 */

import { 
  PersonaSchema, 
  CompanySchema, 
  DealSchema, 
  TicketSchema 
} from './llm-guardrails';
import { ValidationError } from './errors';

/**
 * Recursively trim all string values in an object
 */
export function trimStringsDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj.trim() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => trimStringsDeep(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = trimStringsDeep(value);
    }
    return result;
  }

  return obj;
}

/**
 * Validate data using appropriate schema and throw ValidationError on failure
 */
export function validateDataOrThrow(data: any, actionType: string): any {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(
      'INVALID_DATA_STRUCTURE',
      'Data must be a valid object',
      { actionType, receivedType: typeof data }
    );
  }

  // Trim strings first
  const trimmedData = trimStringsDeep(data);

  // Check for whitespace-only strings and reject them
  const checkForWhitespaceOnly = (obj: any, path: string[] = []): void => {
    if (typeof obj === 'string' && obj.trim() === '' && obj !== '') {
      throw new ValidationError(
        'WHITESPACE_ONLY_STRING',
        'Whitespace-only strings are not allowed',
        { path: path.join('.'), receivedValueSample: obj.slice(0, 50) }
      );
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkForWhitespaceOnly(item, [...path, index.toString()]);
      });
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        checkForWhitespaceOnly(value, [...path, key]);
      });
    }
  };

  checkForWhitespaceOnly(trimmedData);

  // Determine which schema to use based on action type
  let schema;
  let dataKey;

  switch (actionType) {
    case 'create_contact':
    case 'update_contact':
      schema = PersonaSchema;
      dataKey = 'personas';
      break;
    case 'create_company':
    case 'update_company':
      schema = CompanySchema;
      dataKey = 'companies';
      break;
    case 'create_deal':
    case 'update_deal':
      schema = DealSchema;
      dataKey = 'deals';
      break;
    case 'create_ticket':
    case 'update_ticket':
      schema = TicketSchema;
      dataKey = 'tickets';
      break;
    default:
      // For general validation, try to validate the structure as-is
      return trimmedData;
  }

  try {
    // If data has the expected array structure (e.g., {personas: [...]}), validate each item
    if (dataKey && trimmedData[dataKey] && Array.isArray(trimmedData[dataKey])) {
      trimmedData[dataKey].forEach((item: any, index: number) => {
        const result = schema.safeParse(item);
        if (!result.success) {
          const issues = result.error.issues.map(issue => 
            `${issue.path.join('.')}: ${issue.message}`
          ).join(', ');
          throw new ValidationError(
            'SCHEMA_VALIDATION_FAILED',
            `Validation failed for ${dataKey}[${index}]: ${issues}`,
            { 
              path: `${dataKey}[${index}]`, 
              issue: issues, 
              receivedValueSample: JSON.stringify(item).slice(0, 200) 
            }
          );
        }
      });
    } else {
      // Validate data directly against schema
      const result = schema.safeParse(trimmedData);
      if (!result.success) {
        const issues = result.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new ValidationError(
          'SCHEMA_VALIDATION_FAILED',
          `Validation failed: ${issues}`,
          { 
            path: 'root', 
            issue: issues, 
            receivedValueSample: JSON.stringify(trimmedData).slice(0, 200) 
          }
        );
      }
    }

    return trimmedData;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new ValidationError(
      'VALIDATION_ERROR',
      `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { 
        actionType, 
        receivedValueSample: JSON.stringify(data).slice(0, 200) 
      }
    );
  }
}