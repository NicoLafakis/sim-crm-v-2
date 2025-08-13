/**
 * Rate Limiting and Concurrency Control System
 * 
 * Prevents hitting provider limits for CRM and LLM API calls with:
 * - Global concurrency limiting (configurable)
 * - Exponential backoff for 429 responses
 * - Retry-After header handling
 * - Jittered delays to prevent thundering herd
 * - Per-provider rate limiting
 */

interface RateLimitConfig {
  maxConcurrentRequests: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  resetWindowMs: number;
}

interface ProviderStats {
  activeRequests: number;
  totalRequests: number;
  rateLimitHits: number;
  lastRateLimitReset: number;
  consecutiveErrors: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private providers: Map<string, ProviderStats> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      baseDelayMs: parseInt(process.env.BASE_DELAY_MS || '1000'),
      maxDelayMs: parseInt(process.env.MAX_DELAY_MS || '30000'),
      jitterFactor: parseFloat(process.env.JITTER_FACTOR || '0.1'),
      resetWindowMs: parseInt(process.env.RATE_LIMIT_RESET_WINDOW_MS || '60000'),
      ...config
    };
  }

  /**
   * Get or initialize provider stats
   */
  private getProviderStats(provider: string): ProviderStats {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        activeRequests: 0,
        totalRequests: 0,
        rateLimitHits: 0,
        lastRateLimitReset: Date.now(),
        consecutiveErrors: 0
      });
    }
    return this.providers.get(provider)!;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number, retryAfterMs?: number): number {
    if (retryAfterMs) {
      // Honor Retry-After header with jitter
      const jitter = retryAfterMs * this.config.jitterFactor * Math.random();
      return Math.min(retryAfterMs + jitter, this.config.maxDelayMs);
    }

    // Exponential backoff: 2^attempt * baseDelay
    const exponentialDelay = Math.pow(2, attempt) * this.config.baseDelayMs;
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelayMs);
  }

  /**
   * Parse Retry-After header from response
   */
  private parseRetryAfter(retryAfterHeader: string | null): number | undefined {
    if (!retryAfterHeader) return undefined;
    
    // Try parsing as seconds
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to milliseconds
    }
    
    // Try parsing as HTTP date
    const date = new Date(retryAfterHeader);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
    
    return undefined;
  }

  /**
   * Check if provider can accept new requests
   */
  private canAcceptRequest(provider: string): boolean {
    const stats = this.getProviderStats(provider);
    
    // Check global concurrency limit
    const totalActiveRequests = Array.from(this.providers.values())
      .reduce((sum, s) => sum + s.activeRequests, 0);
    
    if (totalActiveRequests >= this.config.maxConcurrentRequests) {
      return false;
    }
    
    // Check if we're in a rate limit backoff period
    const timeSinceLastRateLimit = Date.now() - stats.lastRateLimitReset;
    if (stats.consecutiveErrors > 0 && timeSinceLastRateLimit < this.config.resetWindowMs) {
      return false;
    }
    
    return true;
  }

  /**
   * Wait for available slot with queue management
   */
  private async waitForSlot(provider: string): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.canAcceptRequest(provider)) {
          const stats = this.getProviderStats(provider);
          stats.activeRequests++;
          stats.totalRequests++;
          resolve();
        } else {
          // Add to queue and check again later
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * Execute request with rate limiting and retry logic
   */
  async executeWithRateLimit<T>(
    provider: string,
    requestFn: () => Promise<T>,
    options?: { 
      maxRetries?: number;
      onRetry?: (attempt: number, error: any) => void;
      onRateLimit?: (retryAfterMs: number) => void;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for available slot
        await this.waitForSlot(provider);
        
        const stats = this.getProviderStats(provider);
        
        try {
          // Execute the request
          const result = await requestFn();
          
          // Success - reset consecutive errors
          stats.consecutiveErrors = 0;
          stats.lastRateLimitReset = Date.now();
          
          return result;
          
        } catch (error: any) {
          // Check if it's a rate limit error (429)
          if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit')) {
            stats.rateLimitHits++;
            stats.consecutiveErrors++;
            stats.lastRateLimitReset = Date.now();
            
            // Extract Retry-After from error or response
            let retryAfterMs: number | undefined;
            if (error.headers?.['retry-after']) {
              retryAfterMs = this.parseRetryAfter(error.headers['retry-after']);
            } else if (error.response?.headers?.['retry-after']) {
              retryAfterMs = this.parseRetryAfter(error.response.headers['retry-after']);
            }
            
            if (attempt < maxRetries) {
              const delayMs = this.calculateDelay(attempt, retryAfterMs);
              
              console.log(`🚦 Rate limit hit for ${provider} (attempt ${attempt + 1}/${maxRetries + 1}). Backing off for ${delayMs}ms`);
              
              options?.onRateLimit?.(delayMs);
              options?.onRetry?.(attempt, error);
              
              await new Promise(resolve => setTimeout(resolve, delayMs));
              lastError = error;
              continue; // Retry
            }
          }
          
          // Non-rate-limit error or max retries exceeded
          stats.consecutiveErrors++;
          throw error;
        }
        
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Non-rate-limit retry with backoff
          const delayMs = this.calculateDelay(attempt);
          console.log(`⚠️ Request failed for ${provider} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms`);
          
          options?.onRetry?.(attempt, error);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } finally {
        // Always decrement active requests
        const stats = this.getProviderStats(provider);
        stats.activeRequests = Math.max(0, stats.activeRequests - 1);
      }
    }
    
    // All retries exhausted
    throw lastError;
  }

  /**
   * Get current provider statistics
   */
  getStats(provider?: string): ProviderStats | Record<string, ProviderStats> {
    if (provider) {
      return this.getProviderStats(provider);
    }
    
    const allStats: Record<string, ProviderStats> = {};
    for (const [providerName, stats] of Array.from(this.providers.entries())) {
      allStats[providerName] = { ...stats };
    }
    return allStats;
  }

  /**
   * Reset provider statistics
   */
  resetStats(provider?: string): void {
    if (provider) {
      this.providers.delete(provider);
    } else {
      this.providers.clear();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(updates: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

export { RateLimiter, rateLimiter };
export type { RateLimitConfig, ProviderStats };