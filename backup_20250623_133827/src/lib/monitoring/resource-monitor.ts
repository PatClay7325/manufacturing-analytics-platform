/**
 * Resource Monitor with Memory Pressure Detection
 * Production-ready resource monitoring and management
 */

import { EventEmitter } from 'events';
import os from 'os';
import v8 from 'v8';
import { performance } from 'perf_hooks';

interface ResourceMetrics {
  timestamp: number;
  memory: {
    total: number;
    used: number;
    free: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    rss: number;
    arrayBuffers: number;
    pressure: number; // 0-1 scale
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  gc: {
    count: number;
    duration: number;
    lastRun: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
}

interface ResourceThresholds {
  memory: {
    pressure: number; // 0-1, default 0.8
    heapUsed: number; // bytes
    rss: number; // bytes
  };
  cpu: {
    usage: number; // 0-1, default 0.8
    loadAverage: number; // default 2.0
  };
  eventLoop: {
    delay: number; // ms, default 100
    utilization: number; // 0-1, default 0.9
  };
}

export class ResourceMonitor extends EventEmitter {
  private static instance: ResourceMonitor;
  private metrics: ResourceMetrics[] = [];
  private monitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private gcObserver: PerformanceObserver | null = null;
  private thresholds: ResourceThresholds;
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = process.hrtime.bigint();

  constructor() {
    super();
    
    this.thresholds = {
      memory: {
        pressure: 0.8,
        heapUsed: 1024 * 1024 * 1024, // 1GB
        rss: 2 * 1024 * 1024 * 1024, // 2GB
      },
      cpu: {
        usage: 0.8,
        loadAverage: 2.0,
      },
      eventLoop: {
        delay: 100,
        utilization: 0.9,
      },
    };
  }

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * Start resource monitoring
   */
  start(intervalMs = 1000): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.setupGCMonitoring();
    
    // Initial reading
    this.collectMetrics();
    
    // Start periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop resource monitoring
   */
  stop(): void {
    this.monitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }
  }

  /**
   * Collect current resource metrics
   */
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    
    // Store metrics (keep last 5 minutes)
    this.metrics.push(metrics);
    if (this.metrics.length > 300) {
      this.metrics.shift();
    }
    
    // Check thresholds
    this.checkThresholds(metrics);
    
    // Emit current metrics
    this.emit('metrics', metrics);
  }

  /**
   * Get current resource metrics
   */
  getCurrentMetrics(): ResourceMetrics {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const heapStats = v8.getHeapStatistics();
    
    // Calculate memory pressure
    const memoryPressure = this.calculateMemoryPressure(memUsage, heapStats, totalMem);
    
    // Calculate CPU usage
    const cpuUsage = this.calculateCPUUsage();
    
    // Get event loop metrics
    const eventLoopMetrics = this.getEventLoopMetrics();
    
    return {
      timestamp: Date.now(),
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss,
        arrayBuffers: memUsage.arrayBuffers,
        pressure: memoryPressure,
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      gc: {
        count: 0, // Updated by GC observer
        duration: 0,
        lastRun: 0,
      },
      eventLoop: eventLoopMetrics,
    };
  }

  /**
   * Calculate memory pressure (0-1 scale)
   */
  private calculateMemoryPressure(
    memUsage: NodeJS.MemoryUsage,
    heapStats: v8.HeapInfo,
    totalMem: number
  ): number {
    // Multiple factors for memory pressure
    const heapPressure = memUsage.heapUsed / heapStats.heap_size_limit;
    const rssPressure = memUsage.rss / totalMem;
    const systemPressure = (totalMem - os.freemem()) / totalMem;
    
    // Weight the factors
    const pressure = (heapPressure * 0.5) + (rssPressure * 0.3) + (systemPressure * 0.2);
    
    return Math.min(1, Math.max(0, pressure));
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCPUUsage(): number {
    const currentCpuUsage = process.cpuUsage();
    const currentTime = process.hrtime.bigint();
    
    const timeDelta = Number(currentTime - this.lastCpuTime) / 1e6; // Convert to ms
    const userDelta = currentCpuUsage.user - this.lastCpuUsage.user;
    const systemDelta = currentCpuUsage.system - this.lastCpuUsage.system;
    
    const totalCpuTime = (userDelta + systemDelta) / 1000; // Convert to ms
    const cpuUsage = totalCpuTime / timeDelta;
    
    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuTime = currentTime;
    
    return Math.min(1, Math.max(0, cpuUsage));
  }

  /**
   * Get event loop metrics
   */
  private getEventLoopMetrics(): { delay: number; utilization: number } {
    // Measure event loop delay
    const start = performance.now();
    let delay = 0;
    
    setImmediate(() => {
      delay = performance.now() - start;
    });
    
    // Event loop utilization (simplified)
    // In production, use performance.eventLoopUtilization() if available
    const utilization = delay > 10 ? Math.min(1, delay / 100) : 0;
    
    return { delay, utilization };
  }

  /**
   * Setup GC monitoring
   */
  private setupGCMonitoring(): void {
    try {
      let gcCount = 0;
      let gcDuration = 0;
      let lastGC = 0;
      
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          if (entry.entryType === 'gc') {
            gcCount++;
            gcDuration += entry.duration;
            lastGC = Date.now();
            
            // Update metrics
            if (this.metrics.length > 0) {
              const latest = this.metrics[this.metrics.length - 1];
              latest.gc = { count: gcCount, duration: gcDuration, lastRun: lastGC };
            }
            
            this.emit('gc', {
              kind: (entry as any).kind,
              duration: entry.duration,
            });
          }
        }
      });
      
      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      // GC monitoring not available
      console.warn('GC monitoring not available');
    }
  }

  /**
   * Check resource thresholds
   */
  private checkThresholds(metrics: ResourceMetrics): void {
    // Memory thresholds
    if (metrics.memory.pressure > this.thresholds.memory.pressure) {
      this.emit('high_memory_pressure', metrics.memory);
    }
    
    if (metrics.memory.heapUsed > this.thresholds.memory.heapUsed) {
      this.emit('high_heap_usage', metrics.memory);
    }
    
    if (metrics.memory.rss > this.thresholds.memory.rss) {
      this.emit('high_rss', metrics.memory);
    }
    
    // CPU thresholds
    if (metrics.cpu.usage > this.thresholds.cpu.usage) {
      this.emit('high_cpu_usage', metrics.cpu);
    }
    
    if (metrics.cpu.loadAverage[0] > this.thresholds.cpu.loadAverage) {
      this.emit('high_load_average', metrics.cpu);
    }
    
    // Event loop thresholds
    if (metrics.eventLoop.delay > this.thresholds.eventLoop.delay) {
      this.emit('high_event_loop_delay', metrics.eventLoop);
    }
  }

  /**
   * Get resource statistics
   */
  getStats(): {
    current: ResourceMetrics;
    average: Partial<ResourceMetrics>;
    peak: Partial<ResourceMetrics>;
  } {
    if (this.metrics.length === 0) {
      return {
        current: this.getCurrentMetrics(),
        average: {},
        peak: {},
      };
    }
    
    const current = this.metrics[this.metrics.length - 1];
    
    // Calculate averages
    const average: any = {
      memory: {
        heapUsed: 0,
        pressure: 0,
      },
      cpu: {
        usage: 0,
      },
      eventLoop: {
        delay: 0,
      },
    };
    
    const peak: any = {
      memory: {
        heapUsed: 0,
        pressure: 0,
      },
      cpu: {
        usage: 0,
      },
      eventLoop: {
        delay: 0,
      },
    };
    
    for (const metric of this.metrics) {
      // Averages
      average.memory.heapUsed += metric.memory.heapUsed;
      average.memory.pressure += metric.memory.pressure;
      average.cpu.usage += metric.cpu.usage;
      average.eventLoop.delay += metric.eventLoop.delay;
      
      // Peaks
      peak.memory.heapUsed = Math.max(peak.memory.heapUsed, metric.memory.heapUsed);
      peak.memory.pressure = Math.max(peak.memory.pressure, metric.memory.pressure);
      peak.cpu.usage = Math.max(peak.cpu.usage, metric.cpu.usage);
      peak.eventLoop.delay = Math.max(peak.eventLoop.delay, metric.eventLoop.delay);
    }
    
    const count = this.metrics.length;
    average.memory.heapUsed /= count;
    average.memory.pressure /= count;
    average.cpu.usage /= count;
    average.eventLoop.delay /= count;
    
    return { current, average, peak };
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<ResourceThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      this.emit('gc_forced');
      return true;
    }
    return false;
  }

  /**
   * Get memory snapshot
   */
  getHeapSnapshot(): v8.HeapInfo {
    return v8.getHeapStatistics();
  }

  /**
   * Check if under memory pressure
   */
  isUnderMemoryPressure(): boolean {
    const current = this.getCurrentMetrics();
    return current.memory.pressure > this.thresholds.memory.pressure;
  }

  /**
   * Get recommended action based on resource state
   */
  getRecommendedAction(): string[] {
    const current = this.getCurrentMetrics();
    const actions: string[] = [];
    
    if (current.memory.pressure > 0.9) {
      actions.push('Critical memory pressure - consider scaling or optimizing memory usage');
    } else if (current.memory.pressure > 0.8) {
      actions.push('High memory pressure - monitor closely and prepare to scale');
    }
    
    if (current.cpu.usage > 0.9) {
      actions.push('High CPU usage - consider optimizing CPU-intensive operations');
    }
    
    if (current.eventLoop.delay > 200) {
      actions.push('Event loop blocked - review synchronous operations');
    }
    
    return actions;
  }
}

/**
 * Backpressure handler for managing resource constraints
 */
export class BackpressureHandler extends EventEmitter {
  private resourceMonitor: ResourceMonitor;
  private backpressureActive = false;
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  
  constructor() {
    super();
    this.resourceMonitor = ResourceMonitor.getInstance();
    this.setupListeners();
  }

  /**
   * Setup resource monitor listeners
   */
  private setupListeners(): void {
    this.resourceMonitor.on('high_memory_pressure', () => {
      this.activateBackpressure('memory');
    });
    
    this.resourceMonitor.on('high_cpu_usage', () => {
      this.activateBackpressure('cpu');
    });
    
    this.resourceMonitor.on('high_event_loop_delay', () => {
      this.activateBackpressure('event_loop');
    });
  }

  /**
   * Activate backpressure
   */
  private activateBackpressure(reason: string): void {
    if (!this.backpressureActive) {
      this.backpressureActive = true;
      this.emit('backpressure_activated', reason);
    }
  }

  /**
   * Check if backpressure should be released
   */
  async checkBackpressure(): Promise<boolean> {
    const metrics = this.resourceMonitor.getCurrentMetrics();
    
    const shouldRelease = 
      metrics.memory.pressure < 0.7 &&
      metrics.cpu.usage < 0.7 &&
      metrics.eventLoop.delay < 50;
    
    if (shouldRelease && this.backpressureActive) {
      this.backpressureActive = false;
      this.emit('backpressure_released');
      this.processQueue();
    }
    
    return !this.backpressureActive;
  }

  /**
   * Execute with backpressure control
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check immediate execution
    if (!this.backpressureActive && await this.checkBackpressure()) {
      return fn();
    }
    
    // Queue execution
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.backpressureActive || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0 && !this.backpressureActive) {
      await this.checkBackpressure();
      
      if (!this.backpressureActive) {
        const task = this.queue.shift();
        if (task) {
          await task();
        }
      }
      
      // Small delay between tasks
      await new Promise(resolve => setImmediate(resolve));
    }
    
    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    backpressureActive: boolean;
    queueLength: number;
    processing: boolean;
  } {
    return {
      backpressureActive: this.backpressureActive,
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}

// Export singleton instances
export const resourceMonitor = ResourceMonitor.getInstance();
export const backpressureHandler = new BackpressureHandler();