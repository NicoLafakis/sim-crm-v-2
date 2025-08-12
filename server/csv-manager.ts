import { orchestrator } from './orchestrator';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * CSV Manager for SimCRM - Easy swapping of timing configuration files
 * 
 * This utility allows you to easily switch between different CSV timing files
 * without hardcoding paths in the orchestrator.
 */

export class CSVManager {
  private static readonly CSV_DIRECTORY = 'attached_assets';
  
  /**
   * List all available CSV files in the assets directory
   */
  static listAvailableCSVFiles(): string[] {
    try {
      const files = readdirSync(this.CSV_DIRECTORY);
      return files.filter(file => file.endsWith('.csv'));
    } catch (error) {
      console.error('❌ Failed to read CSV directory:', error);
      return [];
    }
  }

  /**
   * Switch to a different CSV timing file
   * @param filename - Name of the CSV file (e.g., 'new_timing_spec.csv')
   */
  static switchCSVFile(filename: string): boolean {
    const fullPath = join(this.CSV_DIRECTORY, filename);
    
    if (!orchestrator.validateCSVFile(fullPath)) {
      console.error(`❌ Cannot switch to ${filename} - file not accessible`);
      return false;
    }

    orchestrator.updateCSVFilePath(fullPath);
    console.log(`✅ Successfully switched to CSV file: ${filename}`);
    return true;
  }

  /**
   * Get current active CSV file info
   */
  static getCurrentFileInfo(): { path: string; filename: string; exists: boolean } {
    const currentPath = orchestrator.getCurrentCSVPath();
    const filename = currentPath.split('/').pop() || 'unknown';
    const exists = orchestrator.validateCSVFile();
    
    return {
      path: currentPath,
      filename,
      exists
    };
  }

  /**
   * Preview CSV file contents (first 10 rows)
   */
  static previewCSVFile(filename?: string): string[] {
    try {
      const path = filename ? join(this.CSV_DIRECTORY, filename) : orchestrator.getCurrentCSVPath();
      const content = readFileSync(path, 'utf-8');
      return content.split('\n').slice(0, 10);
    } catch (error) {
      console.error('❌ Failed to preview CSV file:', error);
      return [];
    }
  }

  /**
   * Validate CSV file format
   */
  static validateCSVFormat(filename: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const fullPath = join(this.CSV_DIRECTORY, filename);
    
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        issues.push('CSV must have header and at least one data row');
      }
      
      const requiredColumns = ['Offset Day', 'Object Type', 'Action Type', 'Deal Stage (after)', 'Description'];
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (const required of requiredColumns) {
        if (!headers.includes(required)) {
          issues.push(`Missing required column: ${required}`);
        }
      }
      
    } catch (error) {
      issues.push(`File read error: ${error}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Quick access functions for common operations
export const csvManager = {
  list: () => CSVManager.listAvailableCSVFiles(),
  switch: (filename: string) => CSVManager.switchCSVFile(filename),
  current: () => CSVManager.getCurrentFileInfo(),
  preview: (filename?: string) => CSVManager.previewCSVFile(filename),
  validate: (filename: string) => CSVManager.validateCSVFormat(filename)
};