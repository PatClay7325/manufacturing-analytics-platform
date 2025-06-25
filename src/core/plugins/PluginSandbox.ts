/**
 * Plugin Sandbox - Secure execution environment for external plugins
 */

import { EventEmitter } from 'events';

export interface SandboxOptions {
  pluginId: string;
  pluginPath: string;
  memoryLimit?: number; // MB
  cpuLimit?: number; // 0-1 (percentage)
  timeout?: number; // ms
  allowedHosts?: string[];
  allowedPorts?: number[];
  capabilities?: string[];
}

export interface SandboxMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIn: bigint;
  networkOut: bigint;
  startTime: Date;
  uptime: number;
}

export class PluginSandbox extends EventEmitter {
  private pluginId: string;
  private worker: Worker | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers = new Map<string, Function>();
  private pendingMessages = new Map<string, { resolve: Function; reject: Function }>();
  private messageCounter = 0;
  private metrics: SandboxMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    networkIn: BigInt(0),
    networkOut: BigInt(0),
    startTime: new Date(),
    uptime: 0
  };
  private monitoringInterval: NodeJS.Timer | null = null;
  private options: SandboxOptions;

  constructor(options: SandboxOptions) {
    super();
    this.pluginId = options.pluginId;
    this.options = options;
  }

  /**
   * Initialize the sandbox
   */
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Browser environment - use iframe sandbox
      await this.initializeIframeSandbox();
    } else {
      // Node.js environment - use worker threads
      await this.initializeWorkerSandbox();
    }

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Initialize iframe sandbox for browser
   */
  private async initializeIframeSandbox(): Promise<void> {
    // Create sandboxed iframe
    this.iframe = document.createElement('iframe');
    this.iframe.sandbox.add('allow-scripts');
    this.iframe.style.display = 'none';
    
    // Create blob URL for iframe content
    const iframeContent = this.generateIframeContent();
    const blob = new Blob([iframeContent], { type: 'text/html' });
    this.iframe.src = URL.createObjectURL(blob);
    
    document.body.appendChild(this.iframe);

    // Setup message handling
    window.addEventListener('message', this.handleMessage.bind(this));

    // Wait for iframe to be ready
    await new Promise<void>((resolve) => {
      this.iframe!.onload = () => resolve();
    });
  }

  /**
   * Initialize worker sandbox for Node.js
   */
  private async initializeWorkerSandbox(): Promise<void> {
    // Create worker with sandbox script
    const workerScript = this.generateWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerUrl);
    
    // Setup message handling
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  /**
   * Generate iframe content with security restrictions
   */
  private generateIframeContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          script-src 'unsafe-inline' 'unsafe-eval';
          connect-src ${this.options.allowedHosts?.join(' ') || 'none'};
        ">
      </head>
      <body>
        <script>
          // Sandbox environment setup
          const sandbox = {
            pluginId: '${this.pluginId}',
            allowedHosts: ${JSON.stringify(this.options.allowedHosts || [])},
            
            // Override global objects for security
            fetch: createSecureFetch(),
            XMLHttpRequest: createSecureXHR(),
            WebSocket: createSecureWebSocket(),
            
            // Plugin API
            api: {
              emit: (event, data) => parent.postMessage({ 
                type: 'plugin:event', 
                event, 
                data 
              }, '*'),
              
              request: async (method, args) => {
                const id = Date.now() + Math.random();
                parent.postMessage({ 
                  type: 'plugin:request', 
                  id, 
                  method, 
                  args 
                }, '*');
                
                return new Promise((resolve, reject) => {
                  window.addEventListener('message', function handler(e) {
                    if (e.data.type === 'plugin:response' && e.data.id === id) {
                      window.removeEventListener('message', handler);
                      if (e.data.error) {
                        reject(new Error(e.data.error));
                      } else {
                        resolve(e.data.result);
                      }
                    }
                  });
                });
              }
            }
          };
          
          // Security functions
          function createSecureFetch() {
            return async (url, options) => {
              const urlObj = new URL(url);
              if (!sandbox.allowedHosts.includes(urlObj.hostname)) {
                throw new Error('Host not allowed: ' + urlObj.hostname);
              }
              return sandbox.api.request('fetch', { url, options });
            };
          }
          
          function createSecureXHR() {
            return class SecureXMLHttpRequest {
              open(method, url) {
                const urlObj = new URL(url);
                if (!sandbox.allowedHosts.includes(urlObj.hostname)) {
                  throw new Error('Host not allowed: ' + urlObj.hostname);
                }
                this._method = method;
                this._url = url;
              }
              
              send(data) {
                sandbox.api.request('xhr', { 
                  method: this._method, 
                  url: this._url, 
                  data 
                }).then(response => {
                  this.onload?.({ target: { response } });
                }).catch(error => {
                  this.onerror?.(error);
                });
              }
            };
          }
          
          function createSecureWebSocket() {
            return class SecureWebSocket {
              constructor(url) {
                const urlObj = new URL(url);
                if (!sandbox.allowedHosts.includes(urlObj.hostname)) {
                  throw new Error('Host not allowed: ' + urlObj.hostname);
                }
                // Proxy WebSocket through parent
                sandbox.api.request('websocket', { url });
              }
            };
          }
          
          // Message handling
          window.addEventListener('message', (e) => {
            if (e.data.type === 'plugin:load') {
              loadPlugin(e.data.code);
            }
          });
          
          // Plugin loading
          async function loadPlugin(code) {
            try {
              // Create plugin module
              const module = { exports: {} };
              const require = (id) => {
                // Limited require implementation
                if (id === 'react') return window.React;
                if (id === '@analyticsPlatform/data') return window.AnalyticsPlatformData;
                throw new Error('Module not found: ' + id);
              };
              
              // Execute plugin code
              const pluginFn = new Function('module', 'exports', 'require', 'sandbox', code);
              pluginFn(module, module.exports, require, sandbox);
              
              // Send loaded signal
              parent.postMessage({ 
                type: 'plugin:loaded', 
                exports: module.exports 
              }, '*');
            } catch (error) {
              parent.postMessage({ 
                type: 'plugin:error', 
                error: error.message 
              }, '*');
            }
          }
          
          // Ready signal
          parent.postMessage({ type: 'sandbox:ready' }, '*');
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate worker script with security restrictions
   */
  private generateWorkerScript(): string {
    return `
      // Worker sandbox environment
      const sandbox = {
        pluginId: '${this.pluginId}',
        allowedHosts: ${JSON.stringify(this.options.allowedHosts || [])},
        
        // Plugin API
        api: {
          emit: (event, data) => postMessage({ 
            type: 'plugin:event', 
            event, 
            data 
          }),
          
          request: async (method, args) => {
            const id = Date.now() + Math.random();
            postMessage({ 
              type: 'plugin:request', 
              id, 
              method, 
              args 
            });
            
            return new Promise((resolve, reject) => {
              const handler = (e) => {
                if (e.data.type === 'plugin:response' && e.data.id === id) {
                  self.removeEventListener('message', handler);
                  if (e.data.error) {
                    reject(new Error(e.data.error));
                  } else {
                    resolve(e.data.result);
                  }
                }
              };
              self.addEventListener('message', handler);
            });
          }
        }
      };
      
      // Message handling
      self.addEventListener('message', async (e) => {
        if (e.data.type === 'plugin:load') {
          try {
            // Dynamic import with restrictions
            const module = await import(e.data.path);
            postMessage({ 
              type: 'plugin:loaded', 
              exports: module.default || module 
            });
          } catch (error) {
            postMessage({ 
              type: 'plugin:error', 
              error: error.message 
            });
          }
        }
      });
      
      // Ready signal
      postMessage({ type: 'sandbox:ready' });
    `;
  }

  /**
   * Load a module in the sandbox
   */
  async loadModule(modulePath: string): Promise<any> {
    if (!this.iframe && !this.worker) {
      throw new Error('Sandbox not initialized');
    }

    return new Promise((resolve, reject) => {
      const messageId = this.messageCounter++;
      
      this.pendingMessages.set(String(messageId), { resolve, reject });

      if (this.iframe) {
        // Fetch module code
        fetch(modulePath)
          .then(res => res.text())
          .then(code => {
            this.iframe!.contentWindow?.postMessage({
              type: 'plugin:load',
              id: messageId,
              code
            }, '*');
          })
          .catch(reject);
      } else if (this.worker) {
        this.worker.postMessage({
          type: 'plugin:load',
          id: messageId,
          path: modulePath
        });
      }

      // Timeout
      setTimeout(() => {
        if (this.pendingMessages.has(String(messageId))) {
          this.pendingMessages.delete(String(messageId));
          reject(new Error('Plugin load timeout'));
        }
      }, this.options.timeout || 30000);
    });
  }

  /**
   * Call a method on the plugin
   */
  async call(method: string, ...args: any[]): Promise<any> {
    if (!this.iframe && !this.worker) {
      throw new Error('Sandbox not initialized');
    }

    return new Promise((resolve, reject) => {
      const messageId = this.messageCounter++;
      
      this.pendingMessages.set(String(messageId), { resolve, reject });

      const message = {
        type: 'plugin:call',
        id: messageId,
        method,
        args
      };

      if (this.iframe) {
        this.iframe.contentWindow?.postMessage(message, '*');
      } else if (this.worker) {
        this.worker.postMessage(message);
      }
    });
  }

  /**
   * Handle messages from sandbox
   */
  private handleMessage(event: MessageEvent): void {
    const { type, id, ...data } = event.data;

    switch (type) {
      case 'sandbox:ready':
        this.emit('ready');
        break;

      case 'plugin:loaded':
        const loadHandler = this.pendingMessages.get(String(id));
        if (loadHandler) {
          loadHandler.resolve(data.exports);
          this.pendingMessages.delete(String(id));
        }
        break;

      case 'plugin:error':
        const errorHandler = this.pendingMessages.get(String(id));
        if (errorHandler) {
          errorHandler.reject(new Error(data.error));
          this.pendingMessages.delete(String(id));
        }
        break;

      case 'plugin:event':
        this.emit('plugin:event', data);
        break;

      case 'plugin:request':
        this.handlePluginRequest(id, data.method, data.args);
        break;

      case 'plugin:response':
        const responseHandler = this.pendingMessages.get(String(id));
        if (responseHandler) {
          if (data.error) {
            responseHandler.reject(new Error(data.error));
          } else {
            responseHandler.resolve(data.result);
          }
          this.pendingMessages.delete(String(id));
        }
        break;
    }
  }

  /**
   * Handle plugin API requests
   */
  private async handlePluginRequest(id: string, method: string, args: any): Promise<void> {
    try {
      let result;

      switch (method) {
        case 'fetch':
          // Validate and proxy fetch request
          const { url, options } = args;
          const urlObj = new URL(url);
          
          if (!this.options.allowedHosts?.includes(urlObj.hostname)) {
            throw new Error(`Host not allowed: ${urlObj.hostname}`);
          }

          const response = await fetch(url, options);
          result = await response.json();
          break;

        case 'xhr':
          // Handle XHR request
          // Similar validation as fetch
          break;

        case 'websocket':
          // Handle WebSocket connection
          // Create proxy WebSocket
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      // Send response
      const target = this.iframe?.contentWindow || this.worker;
      target?.postMessage({
        type: 'plugin:response',
        id,
        result
      }, '*');
    } catch (error: any) {
      const target = this.iframe?.contentWindow || this.worker;
      target?.postMessage({
        type: 'plugin:response',
        id,
        error: error.message
      }, '*');
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: ErrorEvent): void {
    console.error('Sandbox error:', error);
    this.emit('error', error);
  }

  /**
   * Start monitoring sandbox metrics
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Update sandbox metrics
   */
  private updateMetrics(): void {
    // Update uptime
    this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();

    // In real implementation, would get actual metrics from container/process
    // For now, use placeholder values
    this.metrics.cpuUsage = Math.random() * 20; // 0-20%
    this.metrics.memoryUsage = Math.random() * 50 + 10; // 10-60MB

    this.emit('metrics', this.metrics);
  }

  /**
   * Get current metrics
   */
  getMetrics(): SandboxMetrics {
    return { ...this.metrics };
  }

  /**
   * Destroy the sandbox
   */
  async destroy(): Promise<void> {
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Cleanup iframe
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
      window.removeEventListener('message', this.handleMessage.bind(this));
    }

    // Cleanup worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clear pending messages
    this.pendingMessages.clear();

    this.emit('destroyed');
  }
}

/**
 * Create a plugin sandbox
 */
export async function createPluginSandbox(options: SandboxOptions): Promise<PluginSandbox> {
  const sandbox = new PluginSandbox(options);
  await sandbox.initialize();
  return sandbox;
}