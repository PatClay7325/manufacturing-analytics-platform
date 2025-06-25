# Ollama Performance Optimization Guide
## Manufacturing Analytics Platform

## Current Status
- **System**: 7.8GB RAM, CPU-only (no GPU)
- **Performance**: ~3 seconds for simple queries
- **Model**: Gemma 2B (lightweight but limited)

## Performance Improvement Strategies

### 🚀 1. Hardware Upgrades (Highest Impact)

#### GPU Acceleration (10-50x Speed Improvement)
```bash
# Recommended GPUs by use case:

# Budget Option ($300-500)
RTX 3060 12GB    - Good for 7B models, 5-10x faster
RTX 4060 Ti 16GB - Better for 7B-13B models

# Professional ($600-1000)  
RTX 4070 12GB    - Excellent for 7B-13B models
RTX 4070 Ti 16GB - Can handle some 30B models

# High-End ($1200-1600)
RTX 4090 24GB    - Runs any model up to 70B
RTX A6000 48GB   - Enterprise workstation

# Data Center ($2000+)
A100 40GB/80GB   - Production deployments
H100 80GB        - Latest generation
```

#### Memory Upgrade
```bash
# Current: 7.8GB (causing swapping)
# Minimum: 16GB (comfortable for 7B models)
# Optimal:  32GB+ (can run multiple models)
# Maximum:  64GB+ (enterprise workloads)
```

### ⚡ 2. Model Optimization (Immediate Impact)

#### Install Faster Models
```bash
# Run the optimization script
./scripts/optimize-ollama-performance.sh

# Or manually install optimized models:

# Ultra-fast for simple queries (2-5 seconds)
curl -X POST http://localhost:11434/api/pull -d '{"name": "phi:2.7b"}'

# Fast quantized models (5-10 seconds)
curl -X POST http://localhost:11434/api/pull -d '{"name": "codellama:7b-instruct-q4_0"}'
curl -X POST http://localhost:11434/api/pull -d '{"name": "mistral:7b-instruct-q4_0"}'

# Small but capable
curl -X POST http://localhost:11434/api/pull -d '{"name": "tinyllama:1.1b"}'
```

#### Model Selection Strategy
```typescript
// Implement intelligent model routing in your AI service
const getOptimalModel = (queryComplexity: 'simple' | 'medium' | 'complex') => {
  switch (queryComplexity) {
    case 'simple':
      return 'phi:2.7b';          // Fast responses
    case 'medium': 
      return 'gemma:2b';          // Current model
    case 'complex':
      return 'codellama:7b-instruct-q4_0'; // Better reasoning
    default:
      return 'phi:2.7b';
  }
};
```

### 🔧 3. Software Optimizations (Medium Impact)

#### CPU Optimization
```bash
# Apply CPU-specific optimizations
docker exec manufacturing-ollama sh -c '
  export OMP_NUM_THREADS=$(nproc)
  export OMP_THREAD_LIMIT=$(nproc)
  export OMP_DYNAMIC=false
  export OMP_PROC_BIND=true
  export OMP_PLACES=cores
  pkill -f ollama
  nohup ollama serve > /tmp/ollama.log 2>&1 &
'
```

#### Memory Management
```bash
# Limit concurrent models to prevent memory issues
# Edit docker-compose.yml:
environment:
  - OLLAMA_NUM_PARALLEL=1
  - OLLAMA_MAX_LOADED_MODELS=1
  - OLLAMA_KEEP_ALIVE=2m  # Unload models faster
```

#### Context Size Optimization
```bash
# Create models with smaller context windows for faster processing
cat > /tmp/fast-manufacturing.Modelfile << 'EOF'
FROM phi:2.7b

PARAMETER temperature 0.1
PARAMETER num_ctx 1024      # Smaller context = faster
PARAMETER num_predict 256   # Shorter responses
PARAMETER top_k 20          # Fewer options = faster

SYSTEM "You are a concise manufacturing assistant. Keep responses under 100 words."
EOF

curl -X POST http://localhost:11434/api/create \
  -d "{\"name\": \"fast-manufacturing\", \"modelfile\": \"$(cat /tmp/fast-manufacturing.Modelfile)\"}"
```

### 📊 4. Application-Level Optimizations

#### Caching Strategy
```typescript
// Implement response caching in your AI service
class OllamaCacheService {
  private cache = new Map<string, {response: string, timestamp: number}>();
  private CACHE_TTL = 300000; // 5 minutes

  async getCachedResponse(query: string): Promise<string | null> {
    const cached = this.cache.get(query);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }
    return null;
  }

  setCachedResponse(query: string, response: string) {
    this.cache.set(query, { response, timestamp: Date.now() });
  }
}
```

#### Query Preprocessing
```typescript
// Optimize queries before sending to Ollama
const optimizeQuery = (query: string): string => {
  // Remove unnecessary words
  return query
    .replace(/please|kindly|could you|would you/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Route simple queries to pre-computed responses
const getSimpleResponse = (query: string): string | null => {
  const simpleQueries = {
    'what is oee': 'OEE = Availability × Performance × Quality',
    'calculate oee': 'Use: producedTime/plannedTime × actualRate/idealRate × goodUnits/totalUnits',
    'oee formula': 'OEE = (Planned Production Time - Downtime) / Planned Production Time × (Actual Production Rate / Ideal Production Rate) × (Good Units / Total Units Produced)'
  };
  
  return simpleQueries[query.toLowerCase()] || null;
};
```

#### Streaming Responses
```typescript
// Implement streaming for better perceived performance
const streamResponse = async (query: string) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'fast-manufacturing',
      prompt: query,
      stream: true  // Enable streaming
    })
  });

  const reader = response.body?.getReader();
  // Process chunks as they arrive...
};
```

### 🏭 5. Manufacturing-Specific Optimizations

#### Pre-computed Responses
```typescript
// Pre-compute common manufacturing calculations
const precomputedResponses = {
  oeeCalculation: {
    query: /calculate.*oee.*equipment.*(\w+)/i,
    template: (equipmentId: string) => `
      SELECT 
        AVG(availability * performance * quality) as avg_oee
      FROM fact_oee_metrics 
      WHERE equipment_id = '${equipmentId}' 
        AND timestamp >= NOW() - INTERVAL '24 hours'
    `
  },
  
  topDefects: {
    query: /top.*defects?/i,
    template: () => `
      SELECT defect_type, COUNT(*) as count
      FROM fact_quality_metrics 
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY defect_type 
      ORDER BY count DESC 
      LIMIT 5
    `
  }
};
```

#### Model Specialization
```bash
# Create specialized models for different manufacturing domains
cat > /tmp/oee-specialist.Modelfile << 'EOF'
FROM phi:2.7b

PARAMETER temperature 0.05  # Very low for consistent calculations
PARAMETER num_ctx 512       # Small context for fast OEE queries

SYSTEM "You only calculate OEE. Formula: Availability × Performance × Quality. Respond with SQL queries only."
EOF

cat > /tmp/quality-specialist.Modelfile << 'EOF'
FROM phi:2.7b

PARAMETER temperature 0.1
PARAMETER num_ctx 512

SYSTEM "You only handle quality metrics. Focus on defects, Pareto analysis, and SPC calculations."
EOF
```

### 📈 6. Performance Monitoring & Tuning

#### Real-time Performance Monitoring
```bash
# Monitor Ollama performance
docker stats manufacturing-ollama --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:11434/api/generate" \
  -d '{"model": "phi:2.7b", "prompt": "test", "stream": false}'

# curl-format.txt:
# time_total: %{time_total}s
# time_connect: %{time_connect}s
# time_starttransfer: %{time_starttransfer}s
```

#### Automated Performance Testing
```bash
# Run the performance benchmark
./scripts/optimize-ollama-performance.sh

# Expected results after optimization:
# - Simple queries: 1-3 seconds (vs 5-10 currently)
# - Complex queries: 5-15 seconds (vs 30+ currently)
# - Memory usage: <50% (vs 80%+ currently)
```

## 🎯 Quick Wins You Can Implement Now

### 1. Install Faster Model (5 minutes)
```bash
# Download and switch to Phi 2.7B (much faster)
curl -X POST http://localhost:11434/api/pull -d '{"name": "phi:2.7b"}'

# Update your AI service to use it for simple queries
# Expected improvement: 2-3x faster
```

### 2. Enable Model Quantization (10 minutes)
```bash
# Replace current model with quantized version
curl -X POST http://localhost:11434/api/pull -d '{"name": "gemma:2b-instruct-q4_0"}'
# Expected improvement: 30-50% faster, 40% less memory
```

### 3. Optimize Container Resources (2 minutes)
```bash
# Limit memory and optimize CPU usage
docker update --memory="6g" --cpus="$(nproc)" manufacturing-ollama
docker restart manufacturing-ollama
```

### 4. Implement Query Caching (30 minutes)
```typescript
// Add this to your OllamaQueryService
private queryCache = new Map();

async processQuery(query: string, context: QueryContext) {
  const cacheKey = `${query}-${JSON.stringify(context)}`;
  
  if (this.queryCache.has(cacheKey)) {
    return this.queryCache.get(cacheKey);
  }
  
  const result = await this.generateQuery(query, context);
  this.queryCache.set(cacheKey, result);
  
  return result;
}
```

## 💰 Cost-Benefit Analysis

| Optimization | Cost | Time Investment | Performance Gain | Complexity |
|-------------|------|-----------------|------------------|------------|
| RTX 4070 GPU | $600 | 1 hour | 10-20x faster | Low |
| RAM Upgrade (32GB) | $150 | 30 min | 2-3x faster | Very Low |
| Faster Models | $0 | 15 min | 2-5x faster | Very Low |
| CPU Optimization | $0 | 30 min | 20-30% faster | Low |
| Response Caching | $0 | 2 hours | 5-10x for repeated queries | Medium |
| Query Preprocessing | $0 | 4 hours | 30-50% faster | Medium |

## 🚀 Recommended Implementation Order

1. **Immediate (Today)**:
   - Run `./scripts/optimize-ollama-performance.sh`
   - Install Phi 2.7B model
   - Implement basic caching

2. **This Week**:
   - Add RAM if budget allows (16GB minimum)
   - Optimize container configuration
   - Implement query preprocessing

3. **Next Month**:
   - GPU upgrade planning and procurement
   - Advanced caching strategies
   - Model specialization

4. **Production Ready**:
   - GPU installation and testing
   - Load balancing multiple models
   - Enterprise monitoring

## 📞 Need Help?

Run the optimization script to get personalized recommendations:
```bash
./scripts/optimize-ollama-performance.sh
```

This will analyze your system and provide specific recommendations based on your hardware capabilities.

---

**Expected Results After Optimization:**
- Current: 3-30 seconds per query
- After software optimization: 1-10 seconds
- After GPU upgrade: 0.1-2 seconds
- Memory usage reduced by 50%
- Support for concurrent users