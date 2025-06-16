import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mobile (iPhone 12)', width: 390, height: 844 },
  { name: 'Tablet (iPad)', width: 768, height: 1024 },
  { name: 'Desktop (1080p)', width: 1920, height: 1080 },
  { name: 'Desktop (1440p)', width: 2560, height: 1440 },
];

const pagesToTest = [
  { name: 'Home', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Equipment', path: '/equipment' },
  { name: 'Alerts', path: '/alerts' },
];

test.describe('Responsive Design Audit', () => {
  for (const viewport of viewports) {
    test(`Check layout at ${viewport.name} resolution`, async ({ page }) => {
      console.log(`\n=== ${viewport.name} Layout Audit ===`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      for (const pageInfo of pagesToTest) {
        console.log(`\n${pageInfo.name} page:`);
        
        try {
          await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
          
          // Check for horizontal scroll
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });
          
          if (hasHorizontalScroll) {
            console.log('  ❌ Horizontal scroll detected');
          } else {
            console.log('  ✅ No horizontal scroll');
          }
          
          // Check for overlapping elements
          const overlappingElements = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const overlaps: string[] = [];
            
            for (let i = 0; i < elements.length; i++) {
              const rect1 = elements[i].getBoundingClientRect();
              if (rect1.width === 0 || rect1.height === 0) continue;
              
              for (let j = i + 1; j < elements.length; j++) {
                const rect2 = elements[j].getBoundingClientRect();
                if (rect2.width === 0 || rect2.height === 0) continue;
                
                // Check if elements are siblings
                if (elements[i].parentElement === elements[j].parentElement) {
                  // Check for overlap
                  if (!(rect1.right < rect2.left || 
                        rect2.right < rect1.left || 
                        rect1.bottom < rect2.top || 
                        rect2.bottom < rect1.top)) {
                    overlaps.push(`${elements[i].tagName} overlaps with ${elements[j].tagName}`);
                  }
                }
              }
            }
            
            return overlaps.slice(0, 5); // Return first 5 overlaps
          });
          
          if (overlappingElements.length > 0) {
            console.log('  ⚠️ Overlapping elements detected:');
            overlappingElements.forEach(overlap => console.log(`    - ${overlap}`));
          }
          
          // Check text readability
          const unreadableText = await page.evaluate(() => {
            const texts = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
            const issues: string[] = [];
            
            texts.forEach(element => {
              const styles = window.getComputedStyle(element);
              const fontSize = parseFloat(styles.fontSize);
              
              if (fontSize < 12 && element.textContent?.trim()) {
                issues.push(`Font too small (${fontSize}px): ${element.tagName}`);
              }
            });
            
            return issues.slice(0, 5);
          });
          
          if (unreadableText.length > 0) {
            console.log('  ⚠️ Text readability issues:');
            unreadableText.forEach(issue => console.log(`    - ${issue}`));
          }
          
          // Mobile-specific checks
          if (viewport.width < 768) {
            // Check touch target sizes
            const smallTouchTargets = await page.evaluate(() => {
              const clickables = document.querySelectorAll('button, a, input, select, textarea');
              const small: string[] = [];
              
              clickables.forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                  small.push(`${element.tagName}: ${rect.width}x${rect.height}px`);
                }
              });
              
              return small.slice(0, 5);
            });
            
            if (smallTouchTargets.length > 0) {
              console.log('  ⚠️ Small touch targets (< 44px):');
              smallTouchTargets.forEach(target => console.log(`    - ${target}`));
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Error checking layout: ${error.message}`);
        }
      }
    });
  }
  
  test('Check responsive images', async ({ page }) => {
    console.log(`\n=== Responsive Images Audit ===`);
    
    for (const viewport of viewports) {
      console.log(`\n${viewport.name}:`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const imageIssues = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const issues: string[] = [];
        
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          
          // Check if image is wider than viewport
          if (rect.width > window.innerWidth) {
            issues.push(`Image wider than viewport: ${img.src.split('/').pop()}`);
          }
          
          // Check if image has responsive attributes
          if (!img.srcset && !img.sizes && rect.width > 200) {
            issues.push(`No responsive attributes: ${img.src.split('/').pop()}`);
          }
        });
        
        return issues;
      });
      
      if (imageIssues.length > 0) {
        imageIssues.forEach(issue => console.log(`  ⚠️ ${issue}`));
      } else {
        console.log('  ✅ All images properly sized');
      }
    }
  });
});