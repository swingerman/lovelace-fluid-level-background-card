# SonarQube PR Analysis Setup Guide

This guide explains how to set up SonarQube to analyze your GitHub Pull Requests and pick up test results.

## 🎯 What's Already Configured

✅ **SonarQube Configuration** (`sonar-project.properties`)
✅ **Test Coverage Reporting** (Vitest with LCOV output)
✅ **E2E Test Reporting** (Playwright with JUnit XML)
✅ **GitHub Actions Workflow** (`.github/workflows/sonar-analysis.yml`)
✅ **Test Scripts** (`npm run test:coverage`, `npm run test:sonar`)

## 🚀 Setup Steps

### 1. SonarQube Server Setup

**Option A: SonarCloud (Recommended)**
1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Sign in with your GitHub account
3. Import your `fluid-progress-bar-card` repository
4. Project key will be: `swingerman_fluid-progress-bar-card`

**Option B: Self-hosted SonarQube**
1. Set up your SonarQube server
2. Create a new project manually with key: `fluid-level-background-card`

### 2. Generate Authentication Token

**In SonarQube/SonarCloud:**
1. Go to **My Account** → **Security** → **Generate Tokens**
2. Create a token named "GitHub Actions"
3. Copy the generated token

### 3. Configure GitHub Secrets

**In your GitHub repository:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:

```
Name: SONAR_TOKEN
Value: [your_sonarqube_token_from_step_2]

Name: SONAR_HOST_URL
Value: https://sonarcloud.io  (for SonarCloud)
   OR: https://your-sonar-instance.com  (for self-hosted)
```

### 4. Configure SonarQube Project

**Project Settings:**
- **Project Key**: `fluid-level-background-card` (or auto-generated for SonarCloud)
- **Default Branch**: `master`
- **Language**: TypeScript/JavaScript

**Quality Gate Configuration:**
- Enable "Sonar way" quality gate or create custom rules
- Set coverage thresholds (recommend 60%+ for new code)
- Configure code duplication limits

**Pull Request Analysis:**
- Enable PR decoration in project settings
- Configure GitHub integration if using self-hosted SonarQube

## 🔄 How It Works

### When a PR is Created/Updated:

1. **GitHub Actions triggers** the `sonar-analysis.yml` workflow
2. **Dependencies are installed** (`npm ci --legacy-peer-deps`)
3. **Project is built** (`npm run build`)
4. **Unit tests run with coverage** (`npm run test:coverage`)
   - Generates: `coverage/lcov.info` (LCOV format)
   - Generates: `coverage/coverage-summary.json` (JSON summary)
5. **E2E tests execute** (`npm run test:e2e`)
   - Generates: `test-results/junit.xml` (JUnit XML format)
   - Generates: `test-results/results.json` (detailed results)
6. **SonarQube analysis runs** using all generated reports
7. **Results posted to PR** as status checks and comments

### Reports Sent to SonarQube:

- **Code Coverage**: From unit tests via LCOV format
- **Test Results**: From E2E tests via JUnit XML
- **Code Quality**: Static analysis of TypeScript/JavaScript
- **Security**: Vulnerability detection
- **Maintainability**: Code smells and technical debt

## 🧪 Test the Setup

### 1. Create a Test PR

1. Make a small change to your code
2. Create a pull request
3. Check the **Actions** tab for workflow execution
4. Look for SonarQube status checks on the PR

### 2. Verify Reports

**Expected Artifacts:**
- Coverage reports in workflow artifacts
- SonarQube status check (pass/fail)
- PR comment with quality gate results
- Detailed analysis on SonarQube dashboard

### 3. Debug Common Issues

**Workflow fails with "SONAR_TOKEN not found":**
- Verify secret is added to repository settings
- Check secret name spelling: `SONAR_TOKEN`

**No coverage data in SonarQube:**
- Check `coverage/lcov.info` exists in workflow artifacts
- Verify `sonar.javascript.lcov.reportPaths` in properties file

**E2E test results missing:**
- Check `test-results/junit.xml` exists in workflow artifacts
- Verify `sonar.testExecutionReportPaths` in properties file

## 📊 Expected Results

Once setup is complete, every PR will show:

- ✅ **Code Coverage**: Percentage from unit tests
- ✅ **Test Execution**: Results from E2E tests
- ✅ **Quality Gate**: Pass/fail status
- ✅ **Code Analysis**: Issues, bugs, vulnerabilities
- ✅ **PR Decoration**: Inline comments on changed lines

## 🛠️ Customization

**Adjust Coverage Thresholds:**
Edit `sonar-project.properties`:
```properties
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts,**/tests/**
```

**Modify Quality Gate:**
- Change in SonarQube project settings
- Set stricter or more lenient rules as needed

**Update Test Paths:**
- Coverage: `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
- Tests: `sonar.testExecutionReportPaths=test-results/junit.xml`

---

🎉 **You're all set!** SonarQube will now analyze every PR and provide quality feedback with full test coverage integration.
