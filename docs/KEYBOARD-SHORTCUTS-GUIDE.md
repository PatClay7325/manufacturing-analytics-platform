# Keyboard Shortcuts Guide

## Overview

The Manufacturing Analytics Platform provides comprehensive keyboard shortcuts to improve productivity and accessibility. The keyboard system is fully customizable and context-aware.

## Global Shortcuts

These shortcuts work anywhere in the application:

### Navigation
- **Ctrl/Cmd + K** - Open command palette / search
- **?** - Show help
- **Shift + ?** - Show keyboard shortcuts
- **g → h** - Go to home
- **g → d** - Go to dashboards
- **g → e** - Go to explore
- **g → a** - Go to alerting
- **g → c** - Go to configuration
- **g → p** - Go to profile
- **g → s** - Go to settings

### General
- **Ctrl/Cmd + S** - Save current item
- **Escape** - Close dialogs/panels
- **t → t** - Toggle theme (light/dark)
- **F1** - Show help

## Dashboard Shortcuts

Active when viewing dashboards:

### Navigation
- **Tab** - Navigate between panels
- **Shift + Tab** - Navigate panels in reverse
- **f** - Focus panel search
- **F11** - Toggle kiosk/TV mode

### Time Range
- **t** - Open time range picker
- **Ctrl + z** - Zoom out time range
- **Shift + ←** - Shift time range left
- **Shift + →** - Shift time range right

### Panel Actions (when panel is focused)
- **e** - Edit panel
- **v** - View panel in fullscreen
- **d** - Duplicate panel
- **r** - Remove panel
- **s** - Share panel
- **Shift + l** - Toggle all legends

### Dashboard Actions
- **Ctrl/Cmd + S** - Save dashboard
- **e → r** - Refresh all panels
- **d → s** - Dashboard settings

## Editor Shortcuts

Active when editing panels or queries:

- **Ctrl/Cmd + Enter** - Run queries
- **Ctrl/Cmd + O** - Toggle panel options
- **Ctrl/Cmd + Shift + V** - Toggle visualization picker
- **Ctrl/Cmd + Shift + H** - Toggle query history
- **Ctrl/Cmd + Shift + I** - Toggle query inspector
- **Escape** - Discard changes and exit

## Table/Data Shortcuts

Active when interacting with tables:

- **↑/↓/←/→** - Navigate cells
- **Ctrl/Cmd + C** - Copy cell data
- **Ctrl/Cmd + Shift + E** - Export data
- **Enter** - Sort column (when header focused)

## Customizing Shortcuts

### Via UI
1. Press **Shift + ?** to open keyboard shortcuts
2. Hover over any shortcut and click the settings icon
3. Click in the input field and press your desired key combination
4. Click Save

### Via Code
```typescript
import { keyboardManager } from '@/lib/keyboard/KeyboardShortcutManager';

// Customize a shortcut
keyboardManager.customizeShortcut('save', {
  key: 'S',
  modifiers: ['ctrl', 'shift']
});

// Reset to default
keyboardManager.resetShortcut('save');

// Reset all shortcuts
keyboardManager.resetAllShortcuts();
```

## Using Shortcuts in Components

### Basic Usage
```typescript
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

function MyComponent() {
  useKeyboardShortcut('s', () => {
    console.log('Save triggered!');
  }, ['ctrl']);
  
  return <div>...</div>;
}
```

### Multiple Shortcuts
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut';

function MyComponent() {
  useKeyboardShortcuts([
    {
      key: 's',
      modifiers: ['ctrl'],
      callback: () => console.log('Save'),
      description: 'Save changes'
    },
    {
      key: 'r',
      modifiers: ['ctrl', 'shift'],
      callback: () => console.log('Refresh'),
      description: 'Refresh data'
    }
  ]);
  
  return <div>...</div>;
}
```

### Listening to Keyboard Events
```typescript
import { useKeyboardEvent } from '@/hooks/useKeyboardShortcut';

function MyComponent() {
  useKeyboardEvent('keyboard-save-requested', (event) => {
    console.log('Save requested at:', event.detail.timestamp);
  });
  
  return <div>...</div>;
}
```

## Accessibility Features

- All shortcuts are announced to screen readers
- Visual indicators show which element has keyboard focus
- Customizable shortcuts for users with different needs
- Conflict detection prevents creating inaccessible shortcuts
- Support for alternative input methods

## Command Palette

The command palette (Ctrl/Cmd + K) provides:
- Quick navigation to any page
- Action execution without memorizing shortcuts
- Search through all available commands
- Recent and favorite commands
- Fuzzy search support

## Best Practices

1. **Avoid Conflicts**: The system automatically detects conflicts
2. **Use Standard Patterns**: Follow common shortcuts (Ctrl+S for save)
3. **Context Awareness**: Shortcuts are automatically enabled/disabled based on context
4. **Documentation**: Document custom shortcuts in your components
5. **Accessibility**: Test shortcuts with screen readers

## Troubleshooting

### Shortcuts Not Working
1. Check if the shortcut is enabled for the current context
2. Ensure no input field has focus (unless the shortcut works in inputs)
3. Check for conflicts in the keyboard shortcuts panel
4. Verify the component is properly mounted

### Custom Shortcuts
1. Ensure unique IDs for custom shortcuts
2. Use proper modifier names: 'ctrl', 'alt', 'shift', 'meta'
3. Test on different operating systems (Cmd vs Ctrl)

## API Reference

### KeyboardManager
```typescript
// Register a shortcut
keyboardManager.registerShortcut(shortcut: KeyboardShortcut);

// Check for conflicts
keyboardManager.hasConflict(key: string, modifiers?: string[]): KeyboardShortcut | null;

// Customize shortcut
keyboardManager.customizeShortcut(id: string, customization: Partial<KeyboardShortcut>);

// Enable/disable
keyboardManager.setEnabled(enabled: boolean);
```

### Hooks
```typescript
// Single shortcut
useKeyboardShortcut(key: string, callback: () => void, modifiers?: string[], options?: UseKeyboardShortcutOptions);

// Multiple shortcuts
useKeyboardShortcuts(shortcuts: ShortcutDefinition[], options?: UseKeyboardShortcutOptions);

// Event listener
useKeyboardEvent(eventName: string, callback: (event: CustomEvent) => void);

// Dashboard shortcuts
useDashboardShortcuts();

// Panel shortcuts
usePanelShortcuts(panelId: string);
```