# AI Integration Architecture

## Overview

The Hybrid Manufacturing Intelligence Platform incorporates AI capabilities through a flexible, extensible architecture that supports multiple AI providers. This document outlines the AI integration components and their interactions.

## Core Components

### 1. AI Service

The AI Service is the central component that manages AI capabilities:

- **Provider Management**: Integrates with multiple AI providers
- **Model Discovery**: Discovers available models from providers
- **Request Handling**: Routes requests to appropriate providers
- **Resilience**: Implements circuit breaker, retry, and caching patterns
- **Configuration**: Provides centralized configuration for AI capabilities

### 2. AI Providers

AI Providers represent connections to specific AI services:

- **Ollama Provider**: Integration with Ollama for local LLM inference
- **Future Providers**: OpenAI, Azure, Hugging Face, etc.

Each provider implements a common interface for:
- Model discovery
- Chat completions
- Text completions
- Embeddings

### 3. AI Agents

AI Agents are specialized components that use the AI Service for specific manufacturing tasks:

- **Manufacturing Assistant**: Answers manufacturing questions
- **Performance Analyst**: Analyzes manufacturing performance data
- **Maintenance Advisor**: Provides maintenance recommendations
- **Quality Inspector**: Analyzes quality data and identifies issues

## Request Types

The platform supports several AI request types:

### 1. Chat Completion

Conversational AI interactions with context:

```typescript
const response = await aiService.chatCompletion({
  modelId: "ollama:llama2",
  messages: [
    { role: "system", content: "You are a manufacturing expert..." },
    { role: "user", content: "What are the common causes of OEE loss?" }
  ],
  temperature: 0.7
});
```

### 2. Text Completion

Simple text generation from a prompt:

```typescript
const response = await aiService.textCompletion({
  modelId: "ollama:llama2",
  prompt: "List the key components of Overall Equipment Effectiveness:",
  maxTokens: 500
});
```

### 3. Embeddings

Vector representations of text for semantic search and similarity:

```typescript
const response = await aiService.embedding({
  modelId: "ollama:llama2",
  text: ["Equipment failure", "Quality defect", "Production delay"]
});
```

## Manufacturing Assistant

The Manufacturing Assistant provides domain-specific AI assistance:

### 1. Question Answering

```typescript
const answer = await manufacturingAssistant.answerQuestion(
  "What are the best practices for reducing changeover time?",
  { industry: "automotive", process: "assembly" }
);
```

### 2. Data Analysis

```typescript
const analysis = await manufacturingAssistant.analyzeData(
  { oee: 0.72, availability: 0.85, performance: 0.78, quality: 0.95 },
  "Identify key improvement opportunities based on OEE components"
);
```

### 3. Recommendation Generation

```typescript
const recommendations = await manufacturingAssistant.generateRecommendations(
  { 
    downtime: 120, 
    majorStopCauses: ["material shortage", "tool change", "breakdowns"],
    targetOEE: 0.85
  },
  "Increase production line availability"
);
```

## Resilience Patterns

The AI integration implements several resilience patterns:

### 1. Caching

Caches responses to identical requests:
- Reduces response time
- Reduces costs
- Maintains availability during provider outages

```typescript
aiService.configureCache({
  enabled: true,
  ttl: 3600, // 1 hour
  maxEntries: 1000
});
```

### 2. Circuit Breaker

Prevents cascading failures when AI providers are unavailable:
- Opens after consecutive failures
- Fails fast when open
- Automatically resets after a timeout

```typescript
aiService.configureCircuitBreaker({
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 30000 // 30 seconds
});
```

### 3. Retry

Automatically retries failed requests:
- Handles transient failures
- Uses exponential backoff
- Limits maximum retries

```typescript
aiService.configureRetry({
  enabled: true,
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  backoffFactor: 2
});
```

## Integration with Manufacturing Systems

The AI capabilities integrate with other platform components:

### 1. Equipment Management

- Anomaly detection in equipment performance
- Predictive maintenance recommendations
- Failure mode analysis

### 2. Quality Assurance

- Root cause analysis for quality issues
- Pattern detection in defect data
- SPC rule interpretation

### 3. Production Planning

- Schedule optimization recommendations
- Bottleneck analysis
- Changeover strategy suggestions

### 4. Manufacturing Chat Interface

- Natural language interface to manufacturing data
- Troubleshooting assistance
- Knowledge base access

## Configuration

The AI system is configurable through:

### 1. Provider Configuration

```typescript
// Configure Ollama provider
process.env.OLLAMA_API_URL = "http://localhost:11434";
process.env.OLLAMA_DEFAULT_MODEL = "llama2";
```

### 2. Agent Configuration

```typescript
await manufacturingAssistant.initialize(aiService, {
  modelId: "ollama:llama2",
  systemPrompt: "You are a manufacturing expert...",
  temperature: 0.7,
  maxTokens: 1000
});
```

### 3. Resilience Configuration

```typescript
aiService.configureCache({ enabled: true, ttl: 3600 });
aiService.configureCircuitBreaker({ enabled: true, failureThreshold: 5 });
aiService.configureRetry({ enabled: true, maxRetries: 3 });
```

## Best Practices

1. **Model Selection**: Choose appropriate models for different tasks:
   - Smaller models for simple tasks
   - Larger models for complex reasoning
   - Specialized models for domain-specific tasks

2. **Prompt Engineering**: Create effective prompts:
   - Be specific and clear
   - Provide context and examples
   - Specify desired output format

3. **Error Handling**: Implement robust error handling:
   - Provide fallback responses
   - Log detailed error information
   - Monitor and alert on high error rates

4. **Performance Optimization**:
   - Cache frequently used responses
   - Use streaming for long responses
   - Batch similar requests when possible

## Conclusion

The AI integration architecture provides a flexible, resilient foundation for incorporating AI capabilities into the Hybrid Manufacturing Intelligence Platform. By abstracting provider-specific details behind common interfaces, the platform can leverage multiple AI services while maintaining a consistent API for developers.