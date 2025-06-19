# Gemma:2B Setup Guide for Manufacturing Analytics Platform

## Overview

This guide explains how to configure the Manufacturing Analytics Platform to use Google's Gemma:2B model through Ollama for the AI-powered manufacturing assistant.

## Why Gemma:2B?

Gemma:2B is a lightweight, efficient language model that:
- **Runs locally** - No external API calls needed
- **Fast inference** - Quick responses for real-time chat
- **Small footprint** - Only 2B parameters, runs on modest hardware
- **Manufacturing capable** - Can handle manufacturing terminology and concepts

## Prerequisites

1. **Ollama installed** - Download from [ollama.ai](https://ollama.ai)
2. **Ollama running** - Start with `ollama serve`
3. **Sufficient RAM** - At least 8GB recommended

## Setup Instructions

### 1. Download Gemma:2B Model

Run the setup script:
```cmd
cd scripts\windows
SETUP-GEMMA-2B.cmd
```

Or manually:
```bash
ollama pull gemma:2b
```

### 2. Configure Environment

Add to your `.env.local` file:
```env
# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma:2b
```

### 3. Verify Configuration

Check your setup:
```cmd
cd scripts\windows
CHECK-OLLAMA-CONFIG.cmd
```

### 4. Test the Integration

Run the test script:
```cmd
cd scripts\windows
TEST-GEMMA-CHAT.cmd
```

### 5. Restart Development Server

```bash
npm run dev
```

## Usage

Once configured, Gemma:2B will be used automatically in:
- Manufacturing Chat (`/manufacturing-chat`)
- AI-powered insights
- Equipment recommendations
- Quality analysis

## Example Queries

Try these manufacturing-specific queries:
- "What is OEE and how is it calculated?"
- "Explain predictive maintenance best practices"
- "List ISO 22400 KPIs for production"
- "How to reduce equipment downtime?"

## Performance Tips

1. **Response Time**: First query may be slower as model loads
2. **Context Length**: Keep conversations focused for best results
3. **Temperature**: Lower values (0.3-0.5) for factual responses
4. **Max Tokens**: Adjust based on response length needs

## Troubleshooting

### Ollama Not Running
```bash
# Start Ollama
ollama serve

# Check status
curl http://localhost:11434/api/tags
```

### Model Not Found
```bash
# List available models
ollama list

# Pull Gemma:2B if missing
ollama pull gemma:2b
```

### Slow Responses
- Check available RAM
- Close other applications
- Consider using smaller context window

## Advanced Configuration

### Custom System Prompt

Update in `ManufacturingAssistantImpl.ts`:
```typescript
systemPrompt: 'Your custom manufacturing prompt here...'
```

### Model Parameters

Adjust in your requests:
```typescript
{
  temperature: 0.5,    // Lower = more focused
  maxTokens: 500,      // Shorter responses
  topP: 0.9           // Nucleus sampling
}
```

## Comparison with Other Models

| Model | Size | Speed | Manufacturing Knowledge |
|-------|------|-------|------------------------|
| Gemma:2B | 2B | Fast | Good |
| Llama2:7B | 7B | Medium | Excellent |
| Mistral:7B | 7B | Medium | Very Good |
| Phi-2 | 2.7B | Fast | Good |

## Security Considerations

- Gemma:2B runs **100% locally** - No data leaves your system
- No API keys required
- Complete data privacy
- Suitable for sensitive manufacturing data

## Next Steps

1. Test with your manufacturing data
2. Fine-tune prompts for your use cases
3. Monitor performance and adjust parameters
4. Consider larger models if needed

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Gemma Model Card](https://ai.google.dev/gemma)
- [Manufacturing Analytics Platform Docs](/docs)