# Testing Guide for Fluid Level Background Card

This document describes the testing setup and how to run tests for the fluid-level-background-card component.

## Test Structure

The testing framework consists of two main types of tests:

### 📋 Unit Tests
- **Framework**: Vitest with Happy DOM
- **Location**: `tests/unit/`
- **Purpose**: Test individual functions and component logic
- **Coverage**: Editor methods, configuration validation, utility functions

### 🌐 E2E Tests  
- **Framework**: Playwright
- **Location**: `tests/e2e/`
- **Purpose**: Test the card in a real Home Assistant environment
- **Coverage**: Card rendering, user interactions, state changes, editor functionality

## Prerequisites

- Node.js 18 or later
- npm
- Docker and Docker Compose (recommended for E2E tests)
- Home Assistant (for local development)

## Installation

Install test dependencies:

```bash
npm ci --legacy-peer-deps
```

## Running Tests

### Quick Start

Use the test runner script for the easiest experience:

```bash
# Run all tests
./scripts/test-runner.sh

# Run only unit tests
./scripts/test-runner.sh --unit

# Run only E2E tests
./scripts/test-runner.sh --e2e

# Setup test environment only
./scripts/test-runner.sh --setup

# Cleanup test environment
./scripts/test-runner.sh --cleanup
```

### Manual Test Execution

#### Unit Tests

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

#### E2E Tests

```bash
# Build the card first
npm run build

# Start test environment (Docker)
docker-compose -f docker-compose.test.yml up -d

# Run E2E tests
npm run test:e2e

# Run E2E tests with browser UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## Test Environment

### Home Assistant Test Configuration

The E2E tests use a dedicated Home Assistant configuration located in `tests/fixtures/config/`. This includes:

- Test entities (`input_number.test_level`, `input_number.test_battery`, etc.)
- Test dashboard with various card configurations
- Minimal Home Assistant setup optimized for testing

### Test Cards

The test dashboard includes cards testing:

1. **Basic functionality** - Simple card with entity
2. **Fill entity** - Card with additional fill state entity
3. **Custom colors and severity** - Card with color customization and severity levels
4. **Layout options** - Card with top margin and random start
5. **Click-through behavior** - Card with click-through enabled

## CI/CD Integration

### GitHub Actions

The project includes GitHub Actions workflows that:

- Run unit tests on every PR and push
- Run E2E tests with Docker-based Home Assistant
- Generate test reports and artifacts
- Cache dependencies for faster runs

### Local CI Simulation

To simulate CI behavior locally:

```bash
# Run the same tests as CI
./scripts/test-runner.sh --all

# Or manually:
npm run test && npm run test:e2e
```

## Writing Tests

### Unit Tests

Create unit tests in `tests/unit/` following this pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### E2E Tests

Create E2E tests in `tests/e2e/` following this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lovelace/test');
    await page.waitForSelector('hui-view');
  });

  test('should work correctly', async ({ page }) => {
    // Test implementation
    const element = page.locator('my-element');
    await expect(element).toBeVisible();
  });
});
```

## Test Data and Fixtures

### Entity States

Test entities are defined in the Home Assistant configuration:

- `input_number.test_level` - Main test entity (0-100%)
- `input_number.test_battery` - Secondary test entity (0-100%)
- `input_boolean.test_fill_state` - Fill state toggle

### Card Configurations

Various card configurations are tested in the dashboard to ensure:

- Different entity types work correctly
- Color customization functions properly
- Layout options render correctly
- User interactions behave as expected

## Debugging Tests

### Unit Test Debugging

```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- tests/unit/editor.test.ts

# Debug with browser DevTools
npm run test:ui
```

### E2E Test Debugging

```bash
# Run with headed browser (visible)
npm run test:e2e:headed

# Run with Playwright inspector
npm run test:e2e:ui

# Generate trace files
npm run test:e2e -- --trace=on

# Take screenshots on failure (enabled by default)
npm run test:e2e
```

### Home Assistant Logs

When using Docker:

```bash
# View Home Assistant logs
docker-compose -f docker-compose.test.yml logs homeassistant

# Follow logs in real-time  
docker-compose -f docker-compose.test.yml logs -f homeassistant
```

## Troubleshooting

### Common Issues

1. **Home Assistant fails to start**
   - Check Docker is running
   - Verify configuration files in `tests/fixtures/config/`
   - Check port 8123 is not in use

2. **E2E tests timeout**
   - Increase timeout in `playwright.config.ts`
   - Check network connectivity
   - Verify card is built correctly

3. **Unit tests fail**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
   - Check for TypeScript errors: `npm run lint`

4. **Card not loading in tests**
   - Verify build output exists: `ls dist/`
   - Check resource URL in dashboard configuration
   - Ensure development server is running on port 5000

### Performance Optimization

- Use `test.describe.parallel()` for independent tests
- Minimize page navigation in E2E tests
- Use `test.beforeAll()` for expensive setup
- Cache build artifacts between test runs

## Contributing

When adding new features:

1. Add unit tests for logic/utility functions
2. Add E2E tests for user-visible behavior
3. Update test configurations if new entities are needed
4. Ensure tests pass in CI environment

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Home Assistant Development](https://developers.home-assistant.io/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles/)
