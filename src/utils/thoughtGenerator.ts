/**
 * Generate contextual thought suggestions based on the assistant's response
 */
export function generateThoughts(assistantMessage: string): string[] {
  const lowerMessage = assistantMessage.toLowerCase();
  const thoughts: string[] = [];
  
  // OEE and efficiency related thoughts
  if (lowerMessage.includes('oee') || lowerMessage.includes('efficiency')) {
    thoughts.push(
      'Show me OEE trends for the past week',
      'What factors are impacting our OEE?',
      'Compare OEE across different production lines'
    );
  }
  
  // Equipment related thoughts
  if (lowerMessage.includes('equipment') || lowerMessage.includes('machine')) {
    thoughts.push(
      'Which equipment needs maintenance?',
      'Show equipment downtime analysis',
      'Equipment performance metrics'
    );
  }
  
  // Quality related thoughts
  if (lowerMessage.includes('quality') || lowerMessage.includes('defect')) {
    thoughts.push(
      'Show quality metrics dashboard',
      'What are the top defect categories?',
      'How to reduce defect rates?'
    );
  }
  
  // Production related thoughts
  if (lowerMessage.includes('production') || lowerMessage.includes('output')) {
    thoughts.push(
      'Current production vs targets',
      'Production bottlenecks analysis',
      'Shift-wise production comparison'
    );
  }
  
  // Alert related thoughts
  if (lowerMessage.includes('alert') || lowerMessage.includes('issue')) {
    thoughts.push(
      'Show critical alerts only',
      'Alert history for today',
      'How to resolve this alert?'
    );
  }
  
  // Downtime related thoughts
  if (lowerMessage.includes('down') || lowerMessage.includes('stopped')) {
    thoughts.push(
      'What caused the downtime?',
      'Downtime analysis by reason',
      'How to prevent future downtime?'
    );
  }
  
  // If no specific context, provide general suggestions
  if (thoughts.length === 0) {
    thoughts.push(
      'Show me today\'s production overview',
      'What is the current OEE?',
      'Any critical equipment alerts?',
      'Performance metrics summary'
    );
  }
  
  // Limit to 4 thoughts
  return thoughts.slice(0, 4);
}