/**
 * Rate Limiting Testing System
 * 
 * Provides controlled simulation of 429 rate limit responses for testing
 * rate limiting behavior under various conditions
 */

import { rateLimiter } from './rate-limiter';

interface TestConfig {
  simulateRateLimitEveryNth: number;
  simulateDuration: number;
  providers: string[];
  concurrentRequests: number;
  testRetryAfterHeader: boolean;
}

class RateLimitTester {
  private simulationMode = false;
  private requestCount = 0;
  private simulationConfig: TestConfig = {
    simulateRateLimitEveryNth: 3,
    simulateDuration: 30000, // 30 seconds
    providers: ['hubspot', 'openai'],
    concurrentRequests: 10,
    testRetryAfterHeader: true
  };

  /**
   * Enable rate limit simulation mode
   */
  enableSimulation(config?: Partial<TestConfig>): void {
    this.simulationMode = true;
    this.requestCount = 0;
    this.simulationConfig = { ...this.simulationConfig, ...config };
    
    console.log('🧪 Rate limit simulation enabled:', this.simulationConfig);
    
    // Auto-disable after duration
    setTimeout(() => {
      this.disableSimulation();
    }, this.simulationConfig.simulateDuration);
  }

  /**
   * Disable rate limit simulation mode
   */
  disableSimulation(): void {
    this.simulationMode = false;
    this.requestCount = 0;
    console.log('✅ Rate limit simulation disabled');
  }

  /**
   * Check if current request should be rate limited
   */
  shouldSimulateRateLimit(provider: string): boolean {
    if (!this.simulationMode) return false;
    if (!this.simulationConfig.providers.includes(provider)) return false;

    this.requestCount++;
    return this.requestCount % this.simulationConfig.simulateRateLimitEveryNth === 0;
  }

  /**
   * Create simulated 429 error with proper headers
   */
  createSimulated429Error(provider: string): Error {
    const retryAfterSeconds = Math.floor(Math.random() * 10) + 5; // 5-15 seconds
    const error = new Error(`Simulated rate limit for ${provider} (429)`);
    
    (error as any).status = 429;
    (error as any).headers = this.simulationConfig.testRetryAfterHeader ? {
      'retry-after': retryAfterSeconds.toString()
    } : {};

    console.log(`🚦 Simulated 429 for ${provider} (Retry-After: ${retryAfterSeconds}s)`);
    return error;
  }

  /**
   * Wrap API function with rate limit simulation
   */
  wrapWithSimulation<T>(provider: string, originalFn: () => Promise<T>): () => Promise<T> {
    return async (): Promise<T> => {
      if (this.shouldSimulateRateLimit(provider)) {
        throw this.createSimulated429Error(provider);
      }
      return originalFn();
    };
  }

  /**
   * Run comprehensive rate limit tests
   */
  async runComprehensiveTest(): Promise<{
    testResults: any[];
    summary: {
      totalRequests: number;
      successfulRequests: number;
      rateLimitHits: number;
      totalRetries: number;
      avgResponseTime: number;
    };
  }> {
    console.log('🚀 Starting comprehensive rate limit test...');
    
    const testResults: any[] = [];
    let totalRetries = 0;
    let rateLimitHits = 0;
    const startTime = Date.now();

    // Enable simulation for test
    this.enableSimulation({
      simulateRateLimitEveryNth: 5, // Every 5th request gets rate limited
      simulateDuration: 60000, // 1 minute test
      concurrentRequests: 8
    });

    // Create test requests for different providers
    const testRequests = [];
    for (let i = 0; i < this.simulationConfig.concurrentRequests; i++) {
      // Test HubSpot API calls
      testRequests.push(this.testProviderRequests('hubspot', 5));
      
      // Test OpenAI API calls
      testRequests.push(this.testProviderRequests('openai', 3));
    }

    // Execute all tests concurrently
    const results = await Promise.allSettled(testRequests);
    
    // Collect results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        testResults.push(...result.value);
        totalRetries += result.value.reduce((sum: number, r: any) => sum + r.retries, 0);
        rateLimitHits += result.value.reduce((sum: number, r: any) => sum + (r.rateLimited ? 1 : 0), 0);
      }
    }

    const endTime = Date.now();
    const totalRequests = testResults.length;
    const successfulRequests = testResults.filter(r => r.success).length;

    // Get final provider stats
    const providerStats = rateLimiter.getStats();

    const summary = {
      totalRequests,
      successfulRequests,
      rateLimitHits,
      totalRetries,
      avgResponseTime: totalRequests > 0 ? (endTime - startTime) / totalRequests : 0,
      providerStats
    };

    console.log('📊 Rate limit test completed:', summary);
    
    this.disableSimulation();
    return { testResults, summary };
  }

  /**
   * Test multiple requests to a specific provider
   */
  private async testProviderRequests(provider: string, count: number): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const startTime = Date.now();
      let retries = 0;
      let rateLimited = false;
      let success = false;
      
      try {
        await rateLimiter.executeWithRateLimit(provider, 
          this.wrapWithSimulation(provider, async () => {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
            return { data: `test-${i}`, provider };
          }),
          {
            onRetry: (attempt) => {
              retries = attempt + 1;
            },
            onRateLimit: () => {
              rateLimited = true;
            }
          }
        );
        success = true;
      } catch (error) {
        // Request failed after all retries
        success = false;
      }
      
      results.push({
        provider,
        requestId: i,
        success,
        retries,
        rateLimited,
        responseTime: Date.now() - startTime
      });
    }
    
    return results;
  }

  /**
   * Get current simulation status
   */
  getSimulationStatus(): { 
    enabled: boolean; 
    config: TestConfig; 
    requestCount: number;
    providerStats: any;
  } {
    return {
      enabled: this.simulationMode,
      config: this.simulationConfig,
      requestCount: this.requestCount,
      providerStats: rateLimiter.getStats()
    };
  }
}

// Global tester instance
const rateLimitTester = new RateLimitTester();

export { RateLimitTester, rateLimitTester };
export type { TestConfig };