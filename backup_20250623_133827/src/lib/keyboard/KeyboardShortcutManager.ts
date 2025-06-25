import { KeyboardShortcut } from '@/types/help';

export interface ShortcutGroup {
  id: string;
  name: string;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutContext {
  id: string;
  name: string;
  priority: number;
  isActive: () => boolean;
}

export class KeyboardShortcutManager {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private contexts: Map<string, ShortcutContext> = new Map();
  private activeContexts: Set<string> = new Set(['global']);
  private listeners: Set<(shortcut: KeyboardShortcut) => void> = new Set();
  private customShortcuts: Map<string, Partial<KeyboardShortcut>> = new Map();
  private enabled: boolean = true;

  private constructor() {
    this.initialize();
  }

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  private initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.loadCustomShortcuts();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Allow some shortcuts even in inputs (like Escape)
      if (event.key !== 'Escape' && !event.ctrlKey && !event.metaKey) {
        return;
      }
    }

    const shortcut = this.findMatchingShortcut(event);
    if (shortcut && shortcut.enabled !== false) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcut.action();
        this.notifyListeners(shortcut);
      } catch (error) {
        console.error('Error executing shortcut:', shortcut.id, error);
      }
    }
  }

  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    const key = this.normalizeKey(event.key);
    const modifiers = this.getModifiers(event);

    // Get shortcuts from active contexts, sorted by priority
    const activeShortcuts = this.getActiveShortcuts();

    for (const shortcut of activeShortcuts) {
      if (this.matchesShortcut(shortcut, key, modifiers)) {
        return shortcut;
      }
    }

    return null;
  }

  private normalizeKey(key: string): string {
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
    };
    return keyMap[key] || key;
  }

  private getModifiers(event: KeyboardEvent): Set<string> {
    const modifiers = new Set<string>();
    if (event.ctrlKey || event.metaKey) modifiers.add('ctrl');
    if (event.shiftKey) modifiers.add('shift');
    if (event.altKey) modifiers.add('alt');
    return modifiers;
  }

  private matchesShortcut(
    shortcut: KeyboardShortcut,
    key: string,
    modifiers: Set<string>
  ): boolean {
    // Check if key matches
    if (shortcut.key.toLowerCase() !== key.toLowerCase()) return false;

    // Check modifiers
    const shortcutModifiers = new Set(shortcut.modifiers || []);
    
    // Check if all required modifiers are pressed
    for (const mod of shortcutModifiers) {
      if (!modifiers.has(mod)) return false;
    }

    // Check if any extra modifiers are pressed
    for (const mod of modifiers) {
      if (!shortcutModifiers.has(mod)) return false;
    }

    return true;
  }

  private getActiveShortcuts(): KeyboardShortcut[] {
    const shortcuts: KeyboardShortcut[] = [];
    const contextPriorities: Map<KeyboardShortcut, number> = new Map();

    // Get all shortcuts from active contexts
    for (const contextId of this.activeContexts) {
      const context = this.contexts.get(contextId);
      if (!context || !context.isActive()) continue;

      for (const [_, shortcut] of this.shortcuts) {
        if (shortcut.category === contextId) {
          shortcuts.push(shortcut);
          contextPriorities.set(shortcut, context.priority);
        }
      }
    }

    // Apply custom shortcuts
    for (const [id, customShortcut] of this.customShortcuts) {
      const index = shortcuts.findIndex(s => s.id === id);
      if (index !== -1) {
        shortcuts[index] = { ...shortcuts[index], ...customShortcut };
      }
    }

    // Sort by context priority (higher priority first)
    return shortcuts.sort((a, b) => {
      const priorityA = contextPriorities.get(a) || 0;
      const priorityB = contextPriorities.get(b) || 0;
      return priorityB - priorityA;
    });
  }

  // Public API

  registerShortcut(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  registerShortcuts(shortcuts: KeyboardShortcut[]) {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  unregisterShortcut(id: string) {
    this.shortcuts.delete(id);
  }

  registerContext(context: ShortcutContext) {
    this.contexts.set(context.id, context);
  }

  activateContext(contextId: string) {
    this.activeContexts.add(contextId);
  }

  deactivateContext(contextId: string) {
    this.activeContexts.delete(contextId);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  customizeShortcut(id: string, customization: Partial<KeyboardShortcut>) {
    this.customShortcuts.set(id, customization);
    this.saveCustomShortcuts();
  }

  resetShortcut(id: string) {
    this.customShortcuts.delete(id);
    this.saveCustomShortcuts();
  }

  resetAllShortcuts() {
    this.customShortcuts.clear();
    this.saveCustomShortcuts();
  }

  getShortcut(id: string): KeyboardShortcut | undefined {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const custom = this.customShortcuts.get(id);
      return custom ? { ...shortcut, ...custom } : shortcut;
    }
    return undefined;
  }

  getAllShortcuts(): ShortcutGroup[] {
    const groups = new Map<string, KeyboardShortcut[]>();

    for (const [_, shortcut] of this.shortcuts) {
      const category = shortcut.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      
      // Apply customizations
      const custom = this.customShortcuts.get(shortcut.id);
      const finalShortcut = custom ? { ...shortcut, ...custom } : shortcut;
      
      groups.get(category)!.push(finalShortcut);
    }

    return Array.from(groups.entries()).map(([name, shortcuts]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }));
  }

  addListener(listener: (shortcut: KeyboardShortcut) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (shortcut: KeyboardShortcut) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners(shortcut: KeyboardShortcut) {
    this.listeners.forEach(listener => listener(shortcut));
  }

  private loadCustomShortcuts() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('custom-keyboard-shortcuts');
        if (saved) {
          const customizations = JSON.parse(saved);
          Object.entries(customizations).forEach(([id, custom]) => {
            this.customShortcuts.set(id, custom as Partial<KeyboardShortcut>);
          });
        }
      } catch (error) {
        console.error('Failed to load custom shortcuts:', error);
      }
    }
  }

  private saveCustomShortcuts() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const customizations: Record<string, Partial<KeyboardShortcut>> = {};
        this.customShortcuts.forEach((custom, id) => {
          customizations[id] = custom;
        });
        localStorage.setItem('custom-keyboard-shortcuts', JSON.stringify(customizations));
      } catch (error) {
        console.error('Failed to save custom shortcuts:', error);
      }
    }
  }

  // Check for conflicts
  hasConflict(key: string, modifiers?: string[]): KeyboardShortcut | null {
    const normalizedKey = this.normalizeKey(key);
    const modifierSet = new Set(modifiers || []);

    for (const [_, shortcut] of this.shortcuts) {
      if (this.matchesShortcut(shortcut, normalizedKey, modifierSet)) {
        return shortcut;
      }
    }

    return null;
  }
}

// Export singleton instance
export const keyboardManager = KeyboardShortcutManager.getInstance();