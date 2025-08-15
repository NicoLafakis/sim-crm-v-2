
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create the download package
async function createDownloadPackage() {
  console.log('📦 Creating SimCRM download package...');
  
  const output = fs.createWriteStream('simcrm-local-dev.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', () => {
    console.log(`✅ Package created: simcrm-local-dev.zip (${archive.pointer()} bytes)`);
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
    'LOCAL_SETUP.md',
    'IMPLEMENTATION.md',
    'replit.md',
    
    // Environment template
    '.env.example'
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
