
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Create the download package
async function createDownloadPackage() {
  console.log('📦 Creating SimCRM download package...');
  
  const output = fs.createWriteStream('simcrm-download-v2.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', () => {
    console.log(`✅ SimCRM v2 Package created: simcrm-download-v2.zip (${archive.pointer()} bytes)`);
    console.log('🚀 This package includes all latest fixes:');
    console.log('   - Stop button functionality');
    console.log('   - Simulation execution fixes');
    console.log('   - Template resolution improvements');
    console.log('   - Enhanced error handling');
    console.log('   - Company update operation support');
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  archive.pipe(output);
  
  // Add all source files
  const filesToInclude = [
    // Client files
    'client/src/**/*',
    'client/index.html',
    
    // Server files
    'server/**/*',
    
    // Shared files
    'shared/**/*',
    
    // Config files
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    'drizzle.config.ts',
    'vite.config.ts',
    
    // Documentation
    'README-Download.md',
    'README-Local-Development.md',
    'IMPLEMENTATION.md',
    'replit.md',
    
    // Environment template
    '.env.example',
    
    // CSV templates
    'attached_assets/universal_30day_timing_key.csv',
    'attached_assets/Ecommerce_Cycle-ClosedWon_1755104746839.csv',
    'attached_assets/Ecommerce_Cycle-ClosedLost_1755104746839.csv'
  ];
  
  // Add files to archive
  for (const pattern of filesToInclude) {
    if (pattern.includes('**/*')) {
      const baseDir = pattern.replace('/**/*', '');
      if (fs.existsSync(baseDir)) {
        archive.directory(baseDir, baseDir);
      }
    } else {
      if (fs.existsSync(pattern)) {
        archive.file(pattern, { name: pattern });
      }
    }
  }
  
  await archive.finalize();
}

createDownloadPackage().catch(console.error);
