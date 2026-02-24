/**
 * Minimal Test Runner
 * 
 * No external dependencies - pure Node.js
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: string = '';
  private beforeEachFn: (() => void) | null = null;
  private afterEachFn: (() => void) | null = null;

  describe(name: string, fn: () => void): void {
    this.currentSuite = name;
    const suite: TestSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    };
    
    const startTime = Date.now();
    
    try {
      fn();
    } finally {
      suite.duration = Date.now() - startTime;
      this.suites.push(suite);
      this.currentSuite = '';
    }
  }

  it(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) {
      throw new Error('Tests must be inside a describe block');
    }

    const suite = this.suites[this.suites.length - 1];
    
    const testResult: TestResult = {
      name,
      passed: false,
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Run beforeEach
      if (this.beforeEachFn) this.beforeEachFn();

      const result = fn();
      
      // Handle async
      if (result instanceof Promise) {
        throw new Error('Async tests not supported in this runner. Use async/await with try/catch.');
      }

      testResult.passed = true;
      suite.passed++;
    } catch (error) {
      testResult.passed = false;
      testResult.error = error instanceof Error ? error.message : String(error);
      suite.failed++;
    } finally {
      testResult.duration = Date.now() - startTime;
      suite.tests.push(testResult);
      
      // Run afterEach
      if (this.afterEachFn) this.afterEachFn();
    }
  }

  beforeEach(fn: () => void): void {
    this.beforeEachFn = fn;
  }

  afterEach(fn: () => void): void {
    this.afterEachFn = fn;
  }

  expect<T>(actual: T): Expectation<T> {
    return new Expectation(actual);
  }

  printResults(): void {
    console.log('\n🧪 Test Results\n' + '='.repeat(50));
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const suite of this.suites) {
      console.log(`\n📦 ${suite.name}`);
      console.log('-'.repeat(40));

      for (const test of suite.tests) {
        const icon = test.passed ? '✅' : '❌';
        const duration = test.duration < 1 ? '<1ms' : `${test.duration}ms`;
        console.log(`  ${icon} ${test.name} (${duration})`);
        
        if (!test.passed && test.error) {
          console.log(`     Error: ${test.error}`);
        }
      }

      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalDuration += suite.duration;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Total: ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`⏱️  Duration: ${totalDuration}ms`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed`);
      process.exit(1);
    }
  }
}

class Expectation<T> {
  constructor(private actual: T) {}

  toBe(expected: T): void {
    if (this.actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toEqual(expected: T): void {
    if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toBeDefined(): void {
    if (this.actual === undefined) {
      throw new Error(`Expected value to be defined, but got undefined`);
    }
  }

  toBeUndefined(): void {
    if (this.actual !== undefined) {
      throw new Error(`Expected value to be undefined, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toBeNull(): void {
    if (this.actual !== null) {
      throw new Error(`Expected null, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toBeTruthy(): void {
    if (!this.actual) {
      throw new Error(`Expected truthy value, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toBeFalsy(): void {
    if (this.actual) {
      throw new Error(`Expected falsy value, but got ${JSON.stringify(this.actual)}`);
    }
  }

  toBeGreaterThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`Expected number, but got ${typeof this.actual}`);
    }
    if (this.actual <= expected) {
      throw new Error(`Expected ${this.actual} to be greater than ${expected}`);
    }
  }

  toBeLessThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(`Expected number, but got ${typeof this.actual}`);
    }
    if (this.actual >= expected) {
      throw new Error(`Expected ${this.actual} to be less than ${expected}`);
    }
  }

  toContain(expected: string | T): void {
    if (typeof this.actual === 'string' && typeof expected === 'string') {
      if (!this.actual.includes(expected)) {
        throw new Error(`Expected string to contain "${expected}"`);
      }
    } else if (Array.isArray(this.actual)) {
      if (!this.actual.includes(expected as T)) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      }
    } else {
      throw new Error(`toContain only works with strings and arrays`);
    }
  }

  toHaveLength(expected: number): void {
    if (!Array.isArray(this.actual) && typeof this.actual !== 'string') {
      throw new Error(`Expected array or string, but got ${typeof this.actual}`);
    }
    if (this.actual.length !== expected) {
      throw new Error(`Expected length ${expected}, but got ${this.actual.length}`);
    }
  }

  toThrow(): void {
    if (typeof this.actual !== 'function') {
      throw new Error(`Expected function, but got ${typeof this.actual}`);
    }
    
    try {
      this.actual();
      throw new Error(`Expected function to throw, but it didn't`);
    } catch (e) {
      // Expected to throw, do nothing
    }
  }
}

// Create singleton instance
const runner = new TestRunner();

// Export convenience functions
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);
export const expect = runner.expect.bind(runner);
export const beforeEach = runner.beforeEach.bind(runner);
export const afterEach = runner.afterEach.bind(runner);
export const printResults = runner.printResults.bind(runner);

export default runner;