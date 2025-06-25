import { Ollama } from 'ollama';
import { EventEmitter } from 'events';

interface StreamOptions {
  system?: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

interface ModelInfo {
  name: string;
  loaded: boolean;
  lastUsed: number;
  warmupTime?: number;
  averageTokensPerSecond?: number;
}

interface GenerateOptions {
  num_predict?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  num_thread?: number;
  repeat_penalty?: number;
  stop?: string[];
}

export class OptimizedOllamaService extends EventEmitter {
  private ollama: Ollama;
  private modelPool: Map<string, ModelInfo>;
  private warmupInterval?: NodeJS.Timeout;
  private performanceMetrics: Map<string, number[]>;
  
  // Model configuration for different use cases
  private readonly modelConfig = {
    fast: 'gemma:2b-instruct-q4_K_M',
    balanced: 'mistral:7b-instruct-q4_K_M', 
    complex: 'mixtral:8x7b-instruct-q4_K_M',
    code: 'codellama:7b-instruct-q4_K_M'
  };
  
  constructor(host: string = 'http://localhost:11434') {
    super();
    this.ollama = new Ollama({ host });
    this.modelPool = new Map();
    this.performanceMetrics = new Map();
    
    // Start initialization
    this.initialize().catch(console.error);
  }
  
  private async initialize() {
    // Check if Ollama is running
    const isRunning = await this.checkOllamaStatus();
    if (!isRunning) {
      console.error('Ollama is not running. Please start Ollama with: ollama serve');
      this.emit('error', new Error('Ollama not running'));
      return;
    }
    
    // Preload models
    await this.preloadModels();
    
    // Start warmup schedule
    this.startWarmupSchedule();
    
    this.emit('ready');
  }
  
  private async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollama.config.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async preloadModels() {
    console.log('Preloading models for optimal performance...');
    
    // Load fast model first for quick responses
    await this.loadModel(this.modelConfig.fast, 1);
    
    // Load other models in background
    setTimeout(() => {
      this.loadModel(this.modelConfig.balanced, 2).catch(console.error);
    }, 1000);
  }
  
  private async loadModel(modelName: string, priority: number = 0) {
    const startTime = Date.now();
    
    try {
      // Warm up model with a simple request
      await this.ollama.generate({
        model: modelName,
        prompt: 'Hello',
        options: { 
          num_predict: 1,
          num_thread: 8
        }
      });
      
      const warmupTime = Date.now() - startTime;
      
      this.modelPool.set(modelName, {
        name: modelName,
        loaded: true,
        lastUsed: Date.now(),
        warmupTime
      });
      
      console.log(`Model ${modelName} loaded in ${warmupTime}ms`);
      this.emit('modelLoaded', { model: modelName, warmupTime });
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      this.emit('modelError', { model: modelName, error });
    }
  }
  
  private startWarmupSchedule() {
    // Keep models warm by periodic pings
    this.warmupInterval = setInterval(() => {
      this.modelPool.forEach(async (info, modelName) => {
        // Re-warm if not used in last 5 minutes
        if (Date.now() - info.lastUsed > 5 * 60 * 1000) {
          try {
            await this.ollama.generate({
              model: modelName,
              prompt: 'ping',
              options: { num_predict: 1 }
            });
            
            info.lastUsed = Date.now();
          } catch (error) {
            console.error(`Failed to warm up ${modelName}:`, error);
          }
        }
      });
    }, 60 * 1000); // Check every minute
  }
  
  async stream(prompt: string, options: StreamOptions = {}) {
    const model = this.selectModel(prompt, options);
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    
    // Build the full prompt with system and context
    const fullPrompt = this.buildPrompt(prompt, options);
    
    try {
      const response = await this.ollama.generate({
        model,
        prompt: fullPrompt,
        stream: true,
        options: this.buildGenerateOptions(options)
      });
      
      // Create async generator for clean streaming
      const generator = async function* () {
        for await (const chunk of response) {
          if (chunk.response) {
            if (firstTokenTime === null) {
              firstTokenTime = Date.now() - startTime;
            }
            tokenCount++;
            
            yield {
              content: chunk.response,
              model: chunk.model,
              done: chunk.done,
              firstTokenLatency: firstTokenTime,
              tokensGenerated: tokenCount
            };
          }
          
          if (chunk.done) {
            const totalTime = Date.now() - startTime;
            const tokensPerSecond = tokenCount / (totalTime / 1000);
            
            yield {
              content: '',
              model: chunk.model,
              done: true,
              firstTokenLatency: firstTokenTime,
              tokensGenerated: tokenCount,
              totalTime,
              tokensPerSecond,
              context: chunk.context
            };
          }
        }
      };
      
      // Update model usage
      const modelInfo = this.modelPool.get(model);
      if (modelInfo) {
        modelInfo.lastUsed = Date.now();
      }
      
      // Record performance metrics
      this.recordMetric(`${model}_first_token`, firstTokenTime || 0);
      
      return generator();
    } catch (error) {
      console.error(`Streaming error with model ${model}:`, error);
      
      // Try fallback model
      if (model !== this.modelConfig.fast) {
        console.log('Falling back to fast model...');
        return this.stream(prompt, { ...options, forceModel: this.modelConfig.fast });
      }
      
      throw error;
    }
  }
  
  private selectModel(prompt: string, options: StreamOptions): string {
    // Allow forced model selection
    if ((options as any).forceModel) {
      return (options as any).forceModel;
    }
    
    // Analyze prompt complexity
    const words = prompt.split(/\s+/).length;
    const hasCode = /```|function|class|const|let|var|import|export/.test(prompt);
    const hasComplexQuery = /analyze|explain|compare|calculate|optimize/.test(prompt.toLowerCase());
    
    // Select appropriate model
    if (hasCode) {
      return this.modelConfig.code;
    } else if (words > 100 || hasComplexQuery) {
      return this.modelConfig.complex;
    } else if (words > 30) {
      return this.modelConfig.balanced;
    } else {
      return this.modelConfig.fast;
    }
  }
  
  private buildPrompt(prompt: string, options: StreamOptions): string {
    const parts: string[] = [];
    
    if (options.system) {
      parts.push(`System: ${options.system}\n`);
    }
    
    if (options.context) {
      parts.push(`Context: ${options.context}\n`);
    }
    
    parts.push(`Human: ${prompt}\n\nAssistant:`);
    
    return parts.join('\n');
  }
  
  private buildGenerateOptions(options: StreamOptions): GenerateOptions {
    return {
      num_predict: options.maxTokens || 256,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      top_k: options.topK || 40,
      num_ctx: 4096,
      num_thread: 8,
      repeat_penalty: 1.1,
      stop: ['\nHuman:', '\n\nHuman:']
    };
  }
  
  private recordMetric(name: string, value: number) {
    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }
    
    const metrics = this.performanceMetrics.get(name)!;
    metrics.push(value);
    
    // Keep only last 100 values
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  
  getPerformanceStats() {
    const stats: Record<string, any> = {};
    
    this.performanceMetrics.forEach((values, name) => {
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      stats[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    });
    
    return stats;
  }
  
  getModelStatus() {
    return Array.from(this.modelPool.entries()).map(([name, info]) => ({
      model: name,
      loaded: info.loaded,
      lastUsed: new Date(info.lastUsed).toISOString(),
      warmupTime: info.warmupTime,
      idleTime: Date.now() - info.lastUsed
    }));
  }
  
  async ensureModelLoaded(modelName: string) {
    if (!this.modelPool.has(modelName) || !this.modelPool.get(modelName)!.loaded) {
      await this.loadModel(modelName);
    }
  }
  
  destroy() {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
let instance: OptimizedOllamaService | null = null;

export function getOptimizedOllamaService(): OptimizedOllamaService {
  if (!instance) {
    instance = new OptimizedOllamaService();
  }
  return instance;
}