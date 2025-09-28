# Dependabot Auto-Merge Setup

This repository is configured with comprehensive Dependabot automation to keep dependencies up-to-date while maintaining security and code quality.

## 🔧 Configuration Overview

### Dependabot Configuration (`.github/dependabot.yaml`)
- **Weekly updates** for both npm and GitHub Actions
- **Grouped updates** for development and production dependencies
- **Automatic reviewers and assignees** for manual review when needed
- **Commit message standardization** with proper prefixes

### Workflows

#### 1. **Dependabot Auto-Merge** (`.github/workflows/dependabot-auto-merge.yml`)
- Automatically merges **minor and patch updates** that pass all tests
- **Blocks major version updates** for manual review
- Runs comprehensive safety checks before auto-merging
- Adds informative comments to PRs

#### 2. **Dependabot PR Handler** (`.github/workflows/dependabot-pr-handler.yml`)
- Analyzes Dependabot PRs and adds appropriate labels
- Provides detailed analysis comments
- Identifies major updates and non-package changes
- Runs tests and builds to verify compatibility

#### 3. **Dependency Review** (`.github/workflows/dependency-review.yml`)
- Security scanning for all dependency updates
- License compliance checking
- Vulnerability detection with moderate+ severity blocking
- Automatic PR comments with security analysis

#### 4. **Security Scan** (`.github/workflows/security.yml`)
- Weekly security scans
- npm audit with vulnerability detection
- CodeQL analysis for security issues
- Comprehensive security reporting

#### 5. **Enhanced Build Workflow** (`.github/workflows/build.yml`)
- Bundle size monitoring (500KB limit)
- Coverage reporting with PR comments
- Optimized caching for faster builds
- Comprehensive test execution

## 🚀 How It Works

### For Minor/Patch Updates
1. Dependabot creates a PR
2. **Dependabot PR Handler** analyzes the changes
3. Tests and builds run automatically
4. If all checks pass → **Auto-merge** happens
5. PR is automatically merged with a success comment

### For Major Updates
1. Dependabot creates a PR
2. **Dependabot PR Handler** identifies it as a major update
3. Adds `major-update` and `needs-review` labels
4. **Blocks auto-merge** for manual review
5. Maintainer reviews and merges manually

### Security Updates
1. **Dependency Review** scans for vulnerabilities
2. **Security Scan** runs comprehensive checks
3. High/critical vulnerabilities **block merging**
4. Security reports are generated and uploaded

## 🛡️ Safety Features

- **Major version updates** require manual review
- **Non-package file changes** trigger manual review
- **Security vulnerabilities** block auto-merge
- **Bundle size limits** prevent bloated releases
- **Comprehensive testing** before any merge
- **License compliance** checking

## 📊 Monitoring

### Labels Applied Automatically
- `dependencies` - All Dependabot PRs
- `auto-merge-candidate` - Safe for auto-merge
- `major-update` - Major version updates
- `needs-review` - Requires manual review
- `manual-review-required` - Non-package changes

### Reports Generated
- **Coverage reports** with PR comments
- **Security audit results** as artifacts
- **Bundle size monitoring** with limits
- **Dependency analysis** with recommendations

## 🔍 Manual Override

If you need to disable auto-merge for a specific PR:
1. Add the `manual-review-required` label
2. Or comment with `@dependabot cancel merge`

## 📈 Benefits

- **Automated dependency management** with minimal manual intervention
- **Security-first approach** with comprehensive vulnerability scanning
- **Quality assurance** through automated testing and builds
- **Transparent process** with detailed comments and labels
- **Flexible control** with manual override options

## 🚨 Troubleshooting

### Auto-merge Not Working
- Check if PR has `manual-review-required` label
- Verify all tests are passing
- Ensure no security vulnerabilities are detected
- Check if it's a major version update

### Security Issues
- Review the security scan results
- Check the dependency review comments
- Update vulnerable packages manually if needed

### Build Failures
- Check the build logs for specific errors
- Verify all dependencies are compatible
- Review bundle size limits

This setup ensures your dependencies stay up-to-date while maintaining the highest standards of security and code quality.