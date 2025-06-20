# JSX Syntax Error Fixer

This toolkit provides automated detection and fixing of JSX syntax errors that prevent the build from completing.

## Quick Start (Windows)

### Option 1: Double-click the batch file
```cmd
fix-all-jsx-errors.cmd
```

### Option 2: Run from Command Prompt
```cmd
cd "D:\Source\manufacturing-analytics-platform"
fix-all-jsx-errors.cmd
```

### Option 3: Use npm scripts
```cmd
npm run fix:jsx
```

## What It Fixes

The JSX fixer automatically detects and corrects:

### 1. Missing React Imports
**Problem:**
```tsx
export default function MyComponent() {
  return <div>Hello</div>; // ❌ JSX used without React import
}
```
**Fixed:**
```tsx
import React from 'react';

export default function MyComponent() {
  return <div>Hello</div>; // ✅ React imported
}
```

### 2. Empty Div with Extra Spaces
**Problem:**
```tsx
<div >content</div> // ❌ Extra space in opening tag
```
**Fixed:**
```tsx
<div>content</div> // ✅ Clean opening tag
```

### 3. Double Parentheses in Optional Chaining
**Problem:**
```tsx
((data?.items || [])) // ❌ Unnecessary double parentheses
```
**Fixed:**
```tsx
(data?.items || []) // ✅ Single parentheses
```

### 4. Broken href Attributes
**Problem:**
```tsx
href=" />dashboard" // ❌ Malformed href
```
**Fixed:**
```tsx
href="/dashboard" // ✅ Proper href
```

### 5. Broken xmlns Attributes
**Problem:**
```tsx
xmlns="http: />/www.w3.org/2000/svg" // ❌ Corrupted xmlns
```
**Fixed:**
```tsx
xmlns="http://www.w3.org/2000/svg" // ✅ Valid xmlns
```

### 6. Missing JSX Structure Elements
**Problem:**
```tsx
<span>Label:</span>
<div>Value</div> // ❌ Missing wrapper div
```
**Fixed:**
```tsx
<div>
  <span>Label:</span>
  <div>Value</div>
</div> // ✅ Properly wrapped
```

## Available Tools

### 1. Comprehensive Fixer (Recommended)
```cmd
# Windows batch file (easiest)
fix-all-jsx-errors.cmd

# Or npm script
npm run fix:jsx

# Or direct vitest
npx vitest run src/__tests__/syntax/comprehensive-jsx-fixer.test.ts
```

### 2. Simple Fixer
```cmd
npm run fix:jsx:simple
```

### 3. Manual PowerShell Script
```powershell
.\fix-jsx-errors.ps1
```

## Process Flow

1. **Scan** - Finds all `.tsx` and `.jsx` files in `src/`
2. **Analyze** - Detects JSX syntax error patterns
3. **Fix** - Automatically applies corrections
4. **Verify** - Runs build to confirm fixes work
5. **Report** - Shows summary of changes made

## Output Example

```
🔍 Scanning 45 React files for JSX syntax errors...

📁 src/app/admin/page.tsx:
   ✅ Added missing React import
   ✅ Fixed empty div with extra spaces

📁 src/app/cookie-policy/page.tsx:
   ✅ Added missing React import

📊 Summary:
   Total files scanned: 45
   Files fixed: 8
   Total errors fixed: 15

🎉 Successfully fixed JSX syntax errors!

🚀 Next steps:
   1. Run 'npm run build' to verify all fixes
   2. Test the application to ensure functionality
   3. Commit the changes if everything works correctly
```

## Advanced Usage

### Run with specific reporter
```cmd
npx vitest run src/__tests__/syntax/comprehensive-jsx-fixer.test.ts --reporter=verbose
```

### Check what would be fixed (dry run)
The comprehensive fixer automatically shows what it will fix before applying changes.

### Customize fix patterns
Edit `src/__tests__/syntax/comprehensive-jsx-fixer.test.ts` to add new fix patterns.

## Troubleshooting

### "Command not found" errors
Make sure you're in the project directory:
```cmd
cd "D:\Source\manufacturing-analytics-platform"
```

### "npx not found"
Install Node.js and npm first, then run:
```cmd
npm install
```

### Build still fails after fixes
1. Check the build output for remaining errors
2. Some complex syntax errors may need manual fixing
3. Run the fixer again as it may catch additional issues

### Backup your changes
The fixer modifies files directly. Use git to backup:
```cmd
git add .
git commit -m "Backup before JSX fixes"
```

## Files Created

- `fix-all-jsx-errors.cmd` - Windows batch script
- `fix-jsx-errors.cmd` - Simple Windows script  
- `fix-jsx-errors.ps1` - PowerShell script
- `src/__tests__/syntax/comprehensive-jsx-fixer.test.ts` - Main fixer
- `src/__tests__/syntax/jsx-syntax-fixer.test.ts` - Alternative fixer

## Integration with Build Process

Add to your CI/CD pipeline:
```yaml
- name: Fix JSX Syntax Errors
  run: npm run fix:jsx
- name: Build
  run: npm run build
```

This ensures builds are automatically fixed before compilation.