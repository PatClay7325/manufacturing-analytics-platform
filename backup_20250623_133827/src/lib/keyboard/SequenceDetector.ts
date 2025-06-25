export interface KeySequence {
  keys: string[];
  action: () => void;
  description: string;
  timeout?: number; // milliseconds
}

export class SequenceDetector {
  private sequences: KeySequence[] = [];
  private currentSequence: string[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private defaultTimeout = 1000; // 1 second

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Don't detect sequences when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Don't detect sequences when modifiers are pressed
    if (event.ctrlKey || event.metaKey || event.altKey) {
      this.resetSequence();
      return;
    }

    // Add key to sequence
    this.currentSequence.push(event.key.toLowerCase());

    // Check for matches
    const match = this.findMatchingSequence();
    if (match) {
      event.preventDefault();
      event.stopPropagation();
      match.action();
      this.resetSequence();
    } else {
      // Check if current sequence is a prefix of any sequence
      const isPossiblePrefix = this.isPossiblePrefix();
      if (isPossiblePrefix) {
        // Reset timeout
        this.startTimeout();
      } else {
        // No possible matches, reset
        this.resetSequence();
      }
    }
  }

  private findMatchingSequence(): KeySequence | null {
    const currentStr = this.currentSequence.join('');
    
    for (const sequence of this.sequences) {
      const sequenceStr = sequence.keys.join('');
      if (currentStr === sequenceStr) {
        return sequence;
      }
    }
    
    return null;
  }

  private isPossiblePrefix(): boolean {
    const currentStr = this.currentSequence.join('');
    
    return this.sequences.some(sequence => {
      const sequenceStr = sequence.keys.join('');
      return sequenceStr.startsWith(currentStr);
    });
  }

  private startTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const timeout = this.getMaxTimeout();
    this.timeoutId = setTimeout(() => {
      this.resetSequence();
    }, timeout);
  }

  private getMaxTimeout(): number {
    let maxTimeout = this.defaultTimeout;
    
    for (const sequence of this.sequences) {
      if (sequence.timeout && sequence.timeout > maxTimeout) {
        maxTimeout = sequence.timeout;
      }
    }
    
    return maxTimeout;
  }

  private resetSequence() {
    this.currentSequence = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  registerSequence(sequence: KeySequence) {
    this.sequences.push(sequence);
  }

  registerSequences(sequences: KeySequence[]) {
    sequences.forEach(seq => this.registerSequence(seq));
  }

  unregisterSequence(keys: string[]) {
    const keyStr = keys.join('');
    this.sequences = this.sequences.filter(
      seq => seq.keys.join('') !== keyStr
    );
  }

  getCurrentSequence(): string[] {
    return [...this.currentSequence];
  }

  clear() {
    this.sequences = [];
    this.resetSequence();
  }
}

// Default key sequences
export const defaultSequences: KeySequence[] = [
  // Navigation sequences (g + key)
  {
    keys: ['g', 'h'],
    description: 'Go to home',
    action: () => {
      window.location.href = '/';
    }
  },
  {
    keys: ['g', 'd'],
    description: 'Go to dashboards',
    action: () => {
      window.location.href = '/dashboards';
    }
  },
  {
    keys: ['g', 'e'],
    description: 'Go to explore',
    action: () => {
      window.location.href = '/explore';
    }
  },
  {
    keys: ['g', 'a'],
    description: 'Go to alerting',
    action: () => {
      window.location.href = '/alerting';
    }
  },
  {
    keys: ['g', 'c'],
    description: 'Go to configuration',
    action: () => {
      window.location.href = '/admin';
    }
  },
  {
    keys: ['g', 'p'],
    description: 'Go to profile',
    action: () => {
      window.location.href = '/profile';
    }
  },
  {
    keys: ['g', 's'],
    description: 'Go to settings',
    action: () => {
      window.location.href = '/org';
    }
  },
  
  // Action sequences
  {
    keys: ['t', 't'],
    description: 'Toggle theme',
    action: () => {
      const event = new CustomEvent('toggle-theme');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['e', 'r'],
    description: 'Refresh all data',
    action: () => {
      const event = new CustomEvent('refresh-all-data');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['d', 's'],
    description: 'Dashboard settings',
    action: () => {
      const event = new CustomEvent('open-dashboard-settings');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['p', 'r'],
    description: 'Panel refresh',
    action: () => {
      const event = new CustomEvent('refresh-panel');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['p', 'e'],
    description: 'Panel edit',
    action: () => {
      const event = new CustomEvent('edit-panel');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['p', 'v'],
    description: 'Panel view',
    action: () => {
      const event = new CustomEvent('view-panel');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['p', 'd'],
    description: 'Panel duplicate',
    action: () => {
      const event = new CustomEvent('duplicate-panel');
      window.dispatchEvent(event);
    }
  },
  {
    keys: ['p', 's'],
    description: 'Panel share',
    action: () => {
      const event = new CustomEvent('share-panel');
      window.dispatchEvent(event);
    }
  }
];

// Export singleton instance
export const sequenceDetector = new SequenceDetector();