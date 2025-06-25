// components/chat/ThoughtCards.tsx
import React from 'react';

interface ThoughtCardsProps {
  thoughts: string[];
  onSelect: (thought: string) => void;
}

export const ThoughtCards: React.FC<ThoughtCardsProps> = ({ thoughts, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {thoughts.map((thought, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(thought)}
          className="bg-muted text-xs px-3 py-1 rounded-full border border-border text-foreground hover:bg-muted/70 transition"
        >
          {thought}
        </button>
      ))}
    </div>
  );
};