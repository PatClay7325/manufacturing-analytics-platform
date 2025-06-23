import fs from 'fs';
import path from 'path';

// Function to check if PageLayout import path is correct
function fixPageLayoutImport(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for incorrect import
  if (content.includes("import PageLayout from '@/components/layout/PageLayout'")) {
    // Check if PageLayout exists
    const pageLayoutPath = path.join(process.cwd(), 'src/components/layout/PageLayout.tsx');
    if (!fs.existsSync(pageLayoutPath)) {
      console.log(`⚠️  PageLayout not found, fixing ${filePath}`);
      // Replace with a working layout
      const newContent = content.replace(
        "import PageLayout from '@/components/layout/PageLayout'",
        "import AppLayout from '@/components/layout/AppLayout'"
      ).replace(
        /PageLayout/g,
        'AppLayout'
      );
      fs.writeFileSync(filePath, newContent);
      return true;
    }
  }
  return false;
}

// Function to check for syntax errors in generated pages
function checkGeneratedPage(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Skip non-page files
  if (fileName !== 'page.tsx') return null;
  
  const issues = [];
  
  // Check for duplicate imports
  const reactImports = content.match(/import\s+React/g);
  if (reactImports && reactImports.length > 1) {
    issues.push('Duplicate React imports');
  }
  
  // Check for missing 'use client' directive
  if (!content.includes("'use client'") && !content.includes('"use client"')) {
    issues.push('Missing "use client" directive');
  }
  
  // Check for PageLayout import
  if (content.includes('PageLayout') && !content.includes('import') && !content.includes('PageLayout')) {
    issues.push('PageLayout used but not imported');
  }
  
  return issues.length > 0 ? { path: filePath, issues } : null;
}

// Main function to scan and fix all pages
async function fixAllPages() {
  const appDir = path.join(process.cwd(), 'src/app');
  const pagesToCheck = [];
  
  // Recursively find all page.tsx files
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('api')) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name === 'page.tsx') {
        pagesToCheck.push(fullPath);
      }
    }
  }
  
  console.log('🔍 Scanning for pages...');
  scanDirectory(appDir);
  
  console.log(`📊 Found ${pagesToCheck.length} pages to check\n`);
  
  let fixedCount = 0;
  let issueCount = 0;
  
  for (const pagePath of pagesToCheck) {
    const relativePath = path.relative(appDir, pagePath);
    
    // Fix PageLayout imports
    if (fixPageLayoutImport(pagePath)) {
      console.log(`✅ Fixed PageLayout import in ${relativePath}`);
      fixedCount++;
    }
    
    // Check for other issues
    const issues = checkGeneratedPage(pagePath);
    if (issues) {
      console.log(`⚠️  Issues in ${relativePath}:`, issues.issues.join(', '));
      issueCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total pages checked: ${pagesToCheck.length}`);
  console.log(`   Pages fixed: ${fixedCount}`);
  console.log(`   Pages with issues: ${issueCount}`);
}

// Run the fixer
fixAllPages().catch(console.error);