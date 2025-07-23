/**
 * Global teardown for Playwright E2E tests
 * This runs once after all tests complete
 */
async function globalTeardown(): Promise<void> {
  console.log('🧹 Cleaning up after E2E tests...');
  // Additional cleanup if needed
  return Promise.resolve();
}

export default globalTeardown;
