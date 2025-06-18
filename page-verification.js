const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const baseUrl = 'http://localhost:3000';

// Collect page paths from file system
async function collectPagePaths(directory = 'src/app') {
  const fullPath = path.join(process.cwd(), directory);
  let pages = [];
  
  try {
    const entries = await readdir(fullPath);
    
    for (const entry of entries) {
      // Skip underscore files/directories and private files
      if (entry.startsWith('_') || entry.startsWith('.')) continue;
      
      const entryPath = path.join(fullPath, entry);
      const stats = await stat(entryPath);
      
      if (stats.isDirectory()) {
        // Check if there's a page.tsx in this directory
        try {
          const pageExists = fs.existsSync(path.join(entryPath, 'page.tsx')) || 
                            fs.existsSync(path.join(entryPath, 'page.jsx')) ||
                            fs.existsSync(path.join(entryPath, 'page.js'));
          
          if (pageExists) {
            // Convert src/app/some/path to /some/path
            const urlPath = '/' + directory.replace('src/app', '').replace(/^\//, '') + '/' + entry;
            pages.push(urlPath.replace(/\/\//g, '/'));
          }
          
          // Recursively check subdirectories (excluding layout files and components)
          if (entry !== 'components' && entry !== 'layout' && entry !== 'api') {
            const subPages = await collectPagePaths(path.join(directory, entry));
            pages = pages.concat(subPages);
          }
        } catch (error) {
          console.error(`Error checking for page in ${entryPath}:`, error);
        }
      }
    }
    
    // Add root page if it exists
    if (fs.existsSync(path.join(fullPath, 'page.tsx')) || 
        fs.existsSync(path.join(fullPath, 'page.jsx')) ||
        fs.existsSync(path.join(fullPath, 'page.js'))) {
      // Root level directory becomes / instead of /home etc.
      if (directory === 'src/app') {
        pages.push('/');
      } else {
        const urlPath = '/' + directory.replace('src/app', '');
        pages.push(urlPath.replace(/\/\//g, '/'));
      }
    }
    
    return pages;
  } catch (error) {
    console.error(`Error reading directory ${fullPath}:`, error);
    return [];
  }
}

// Check if a page is available by making an HTTP request
function checkPage(url) {
  return new Promise((resolve) => {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    http.get(fullUrl, (res) => {
      resolve({
        url,
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 400
      });
    }).on('error', (error) => {
      resolve({
        url,
        status: 0,
        ok: false,
        error: error.message
      });
    });
  });
}

// Main function to verify all pages
async function verifyPages() {
  console.log('====================================');
  console.log('Page Verification Script');
  console.log('====================================\n');
  
  try {
    console.log('Collecting page paths from file system...');
    const pagePaths = await collectPagePaths();
    
    if (pagePaths.length === 0) {
      console.error('No pages found!');
      return;
    }
    
    console.log(`Found ${pagePaths.length} pages:\n`);
    
    // Check if server is running
    try {
      const serverCheck = await checkPage('/');
      if (!serverCheck.ok) {
        console.error(`Server not running at ${baseUrl}`);
        console.error('Please start the development server with: npm run dev');
        return;
      }
    } catch (error) {
      console.error('Error checking server:', error);
      return;
    }
    
    console.log('Checking pages...\n');
    
    const results = [];
    
    for (const pagePath of pagePaths) {
      try {
        const result = await checkPage(pagePath);
        results.push(result);
        
        const statusColor = result.ok ? '\x1b[32m' : '\x1b[31m'; // Green for OK, Red for errors
        const statusSymbol = result.ok ? '✓' : '✗';
        
        console.log(`${statusColor}${statusSymbol}\x1b[0m ${pagePath}: ${result.status}`);
      } catch (error) {
        console.error(`Error checking ${pagePath}:`, error);
        results.push({
          url: pagePath,
          status: 0,
          ok: false,
          error: error.message
        });
      }
    }
    
    // Summary
    const okPages = results.filter(r => r.ok).length;
    const errorPages = results.filter(r => !r.ok).length;
    
    console.log('\n====================================');
    console.log('VERIFICATION SUMMARY');
    console.log('====================================');
    console.log(`Total pages checked: ${results.length}`);
    console.log(`✓ Successful: ${okPages}`);
    console.log(`✗ Errors: ${errorPages}`);
    
    if (errorPages > 0) {
      console.log('\nPages with errors:');
      results.filter(r => !r.ok).forEach(result => {
        console.log(`- ${result.url}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
      });
    }
    
    console.log('\nVerification complete!');
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
verifyPages();