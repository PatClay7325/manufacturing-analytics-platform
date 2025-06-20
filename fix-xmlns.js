const fs = require('fs');

const files = [
  '/mnt/d/Source/manufacturing-analytics-platform/src/app/alerts/page.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/app/equipment/page.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/app/manufacturing-chat/page.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/alerts/AlertCard.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/chat/ChatHistory.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/chat/ChatInput.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/equipment/EquipmentCard.tsx',
  '/mnt/d/Source/manufacturing-analytics-platform/src/components/layout/PageLayout.tsx'
];

let totalFixed = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Fix broken xmlns attributes
    content = content.replace(/xmlns="http:\s*\/>/g, 'xmlns="http://www.w3.org/2000/svg"');
    content = content.replace(/xmlns="http:\s*\/>\s*\/\s*www\.w3\.org\/2000\/svg"/g, 'xmlns="http://www.w3.org/2000/svg"');
    
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file.split('/').pop()}`);
      totalFixed++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}: ${error.message}`);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with xmlns issues!`);