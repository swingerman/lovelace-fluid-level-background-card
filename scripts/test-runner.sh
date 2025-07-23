#!/bin/bash

# Test runner script for fluid-level-background-card
# This script helps run tests both locally and in CI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Default test type
TEST_TYPE="all"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --e2e)
            TEST_TYPE="e2e"
            shift
            ;;
        --all)
            TEST_TYPE="all"
            shift
            ;;
        --setup)
            TEST_TYPE="setup"
            shift
            ;;
        --cleanup)
            TEST_TYPE="cleanup"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--unit|--e2e|--all|--setup|--cleanup|--help]"
            echo ""
            echo "Options:"
            echo "  --unit      Run only unit tests"
            echo "  --e2e       Run only E2E tests"
            echo "  --all       Run all tests (default)"
            echo "  --setup     Setup test environment only"
            echo "  --cleanup   Cleanup test environment only"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option $1"
            exit 1
            ;;
    esac
done

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm ci --legacy-peer-deps
fi

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Build the card first
    log_info "Building card..."
    npm run build
    
    # Check if Docker is available for E2E tests
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log_info "Starting test environment with Docker..."
        docker-compose -f docker-compose.test.yml up -d
        
        # Wait for Home Assistant to be ready
        log_info "Waiting for Home Assistant to start..."
        timeout 300 bash -c 'until curl -f http://localhost:8123 >/dev/null 2>&1; do sleep 5; done' || {
            log_error "Home Assistant failed to start within timeout"
            docker-compose -f docker-compose.test.yml logs
            exit 1
        }
        
        log_success "Test environment is ready!"
    else
        log_warning "Docker not available. E2E tests will use local setup."
        log_info "Starting Home Assistant locally..."
        npm run test:setup &
        HASS_PID=$!
        
        # Wait for Home Assistant to be ready
        log_info "Waiting for Home Assistant to start..."
        timeout 120 bash -c 'until curl -f http://localhost:8123 >/dev/null 2>&1; do sleep 5; done' || {
            log_error "Home Assistant failed to start within timeout"
            kill $HASS_PID 2>/dev/null || true
            exit 1
        }
        
        log_success "Home Assistant is ready!"
    fi
}

# Cleanup test environment
cleanup_test_env() {
    log_info "Cleaning up test environment..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.test.yml down >/dev/null 2>&1 || true
    fi
    
    # Kill any local Home Assistant processes
    pkill -f "hass.*config.*test" 2>/dev/null || true
    pkill -f "test-setup.js" 2>/dev/null || true
    
    log_success "Cleanup complete!"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    npm run test
    log_success "Unit tests completed!"
}

# Run E2E tests
run_e2e_tests() {
    log_info "Installing Playwright browsers if needed..."
    npx playwright install --with-deps >/dev/null 2>&1 || true
    
    log_info "Running E2E tests..."
    npm run test:e2e
    log_success "E2E tests completed!"
}

# Main execution
case $TEST_TYPE in
    "setup")
        setup_test_env
        ;;
    "cleanup")
        cleanup_test_env
        ;;
    "unit")
        run_unit_tests
        ;;
    "e2e")
        setup_test_env
        trap cleanup_test_env EXIT
        run_e2e_tests
        ;;
    "all")
        log_info "Running all tests..."
        
        # Run unit tests first
        run_unit_tests
        
        # Setup environment for E2E tests
        setup_test_env
        trap cleanup_test_env EXIT
        
        # Run E2E tests
        run_e2e_tests
        
        log_success "All tests completed successfully! 🎉"
        ;;
esac
