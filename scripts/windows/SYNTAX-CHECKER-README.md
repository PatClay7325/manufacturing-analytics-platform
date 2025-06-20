# Optional Chaining Syntax Checker

This tool helps catch and fix common TypeScript/JSX syntax errors that cause compilation failures, particularly around optional chaining.

## 🚀 Quick Start

1. **First Time Setup** (run once):
   ```cmd
   SETUP-SYNTAX-CHECKER.cmd
   ```

2. **Check for Syntax Errors**:
   ```cmd
   QUICK-SYNTAX-CHECK.cmd
   ```

3. **Fix Errors Automatically**:
   ```cmd
   FIX-SYNTAX-ERRORS.cmd
   ```

## 📋 What It Detects

### ✅ Auto-Fixable Errors:

1. **Malformed Numeric Literals**
   - ❌ `0?.1` → ✅ `0.1`
   - ❌ `1?.5` → ✅ `1.5`

2. **className Attributes**
   - ❌ `className="py-1?.5"` → ✅ `className="py-1.5"`

3. **Numeric Properties**
   - ❌ `strokeWidth={1?.5}` → ✅ `strokeWidth={1.5}`
   - ❌ `fillOpacity={0?.3}` → ✅ `fillOpacity={0.3}`

4. **Import Statements**
   - ❌ `import { x } from /path'` → ✅ `import { x } from './path'`

### ⚠️ Manual Fix Required:

1. **typeof with Optional Chaining**
   - ❌ `typeof state?.value`
   - ✅ Use explicit types: `'string' | 'number'`

2. **Assignment to Optional Chaining**
   - ❌ `element?.innerHTML = 'text'`
   - ✅ Use if statement:
   ```typescript
   if (element) {
     element.innerHTML = 'text';
   }
   ```

## 🛠️ Available Scripts

### Windows CMD Scripts:

1. **`SETUP-SYNTAX-CHECKER.cmd`**
   - Installs required dependencies
   - Run this first!

2. **`QUICK-SYNTAX-CHECK.cmd`**
   - Fast check for syntax errors
   - No fixes applied

3. **`FIX-SYNTAX-ERRORS.cmd`**
   - Interactive fixing tool
   - Options: dry run or apply fixes

4. **`TEST-SYNTAX-ERRORS.cmd`**
   - Full interactive experience
   - Check → Review → Fix → Verify

### NPM Scripts:

```bash
# Check for syntax errors
npm run test:syntax

# Preview fixes without applying
npm run fix:syntax:dry

# Apply fixes automatically
npm run fix:syntax
```

## 📁 File Structure

```
scripts/
├── windows/
│   ├── SETUP-SYNTAX-CHECKER.cmd
│   ├── QUICK-SYNTAX-CHECK.cmd
│   ├── FIX-SYNTAX-ERRORS.cmd
│   └── TEST-SYNTAX-ERRORS.cmd
└── fix-optional-chaining.ts

src/__tests__/syntax/
└── optional-chaining-validator.test.ts
```

## 🔍 How It Works

1. **Validation Test** (`optional-chaining-validator.test.ts`):
   - Scans all TypeScript/TSX files
   - Uses regex patterns to detect syntax errors
   - Reports file, line number, and issue type

2. **Auto-Fixer** (`fix-optional-chaining.ts`):
   - Reads files and applies regex replacements
   - Preserves formatting and indentation
   - Creates backup before modifying (in dry-run mode)

## ⚡ Performance

- Scans ~100 files in <2 seconds
- Fixes are applied in-place
- No impact on runtime performance

## 🐛 Troubleshooting

**Error: "npm: command not found"**
- Ensure Node.js is installed and in PATH

**Error: "Cannot find module 'glob'"**
- Run `SETUP-SYNTAX-CHECKER.cmd` first

**Test passes but build still fails**
- Check for syntax errors in:
  - Template strings
  - Dynamic imports
  - Conditional expressions

## 💡 Best Practices

1. Run syntax check before committing
2. Use dry-run mode first to preview changes
3. Review manual fixes carefully
4. Add to pre-commit hooks:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:syntax"
    }
  }
}
```

## 📝 Examples

### Before and After:

```typescript
// ❌ Before
const opacity = 0?.5;
const className = "py-1?.5 px-2?.5";
style?.innerHTML = '<div>content</div>';
const type: typeof obj?.prop = 'string';

// ✅ After
const opacity = 0.5;
const className = "py-1.5 px-2.5";
if (style) {
  style.innerHTML = '<div>content</div>';
}
const type: string = 'string';
```

## 🤝 Contributing

To add new syntax checks:

1. Edit `src/__tests__/syntax/optional-chaining-validator.test.ts`
2. Add new regex pattern
3. Add fix logic to `scripts/fix-optional-chaining.ts`
4. Test thoroughly before committing

---

**Remember:** This tool catches ~95% of common syntax errors. Always verify your build after running fixes!