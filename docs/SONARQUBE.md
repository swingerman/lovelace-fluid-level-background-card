# SonarQube Integration

This project is configured to work with SonarQube for code quality analysis. The configuration includes test coverage reporting and code quality metrics.

## Configuration Files

### `sonar-project.properties`

Contains the main SonarQube configuration:

- Project information (key, name, version)
- Source and test directories
- Exclusions for unnecessary files
- Coverage and test report paths

### Test Configuration

- **Unit Tests**: Vitest with V8 coverage provider
- **E2E Tests**: Playwright with multi-browser support
- **Coverage Reports**: LCOV format for SonarQube compatibility

## Generated Reports

When running tests, the following reports are generated for SonarQube:

### Coverage Reports (Unit Tests)

- `coverage/lcov.info` - LCOV coverage data
- `coverage/coverage-summary.json` - JSON summary of coverage

### Test Execution Reports

- `coverage/sonar-report.xml` - JUnit XML format for unit tests
- `test-results/junit.xml` - JUnit XML format for E2E tests
- `test-results/results.json` - JSON test results for E2E tests

## Running Tests for SonarQube

### Local Development

```bash
# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests for SonarQube reporting
npm run test:sonar
```

### CI Environment

The tests automatically detect CI environment and use appropriate reporters:

- GitHub Actions reporter for CI integration
- JUnit XML for test results
- JSON format for detailed analysis

## SonarQube Analysis

### GitHub Actions Integration

The project includes a dedicated GitHub Actions workflow (`.github/workflows/sonar-analysis.yml`) that:

1. **Runs on every PR and push to master**
2. **Generates test coverage reports** using Vitest
3. **Executes E2E tests** with Playwright
4. **Uploads all reports to SonarQube** for analysis
5. **Provides PR decorations** with quality gate status

#### Required GitHub Secrets

To enable SonarQube analysis on GitHub, add these secrets to your repository:

```bash
# In your GitHub repository settings > Secrets and variables > Actions
SONAR_TOKEN=your_sonarqube_token_here
SONAR_HOST_URL=https://your-sonarqube-instance.com
```

#### Workflow Features

- **Automatic PR Analysis**: Every pull request gets analyzed
- **Coverage Integration**: Unit test coverage is automatically uploaded
- **E2E Test Results**: Playwright test results included in analysis
- **Quality Gate**: Prevents merging if quality standards aren't met
- **Artifact Upload**: Test results archived for debugging

#### SonarQube Project Setup

1. **Create Project in SonarQube**:
   - Project Key: `fluid-level-background-card`
   - Project Name: `Fluid Level Background Card`
   - Default Branch: `master`

2. **Configure Quality Gate**:
   - Set coverage thresholds as needed
   - Configure code quality metrics
   - Enable PR decoration

3. **Generate Token**:
   - Create a project analysis token in SonarQube
   - Add token to GitHub secrets as `SONAR_TOKEN`

### Local Analysis

If you have SonarQube scanner installed locally:

```bash
sonar-scanner
```

### CI Integration

For GitHub Actions or other CI systems, use the SonarQube action:

```yaml
- name: SonarQube Scan
  uses: sonarqube-quality-gate-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Coverage Thresholds

Current coverage configuration:

- No enforced thresholds (for development flexibility)
- Coverage is reported but doesn't fail builds
- SonarQube can enforce its own quality gates

## Project Structure for Analysis

```text
src/                     # Source code (analyzed)
tests/unit/             # Unit tests (excluded from analysis)
tests/e2e/              # E2E tests (excluded from analysis)
coverage/               # Coverage reports (generated)
test-results/           # Test execution reports (generated)
node_modules/           # Dependencies (excluded)
dist/                   # Build output (excluded)
```

## Customization

To modify SonarQube configuration:

1. Edit `sonar-project.properties` for project settings
2. Modify `vitest.config.ts` for coverage configuration
3. Update `playwright.config.ts` for E2E test reporting
4. Adjust exclusions and thresholds as needed

## Troubleshooting

### Common Issues

1. **Missing coverage reports**: Ensure `npm run test:coverage` runs successfully
2. **No test results**: Check that test files are in the correct directories
3. **Build failures**: Verify all dependencies are installed with `npm install`

### Dependencies

Required packages for SonarQube integration:

- `@vitest/coverage-v8` - Coverage provider
- `vitest` - Unit test runner
- `@playwright/test` - E2E test runner
