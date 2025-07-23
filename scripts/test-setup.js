#!/usr/bin/env node

/**
 * Test setup script for Home Assistant integration
 * This script starts Home Assistant for testing purposes
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const TEST_CONFIG_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'config');

// Use existing config if available, otherwise create test config
const configDir = fs.existsSync(CONFIG_DIR) ? CONFIG_DIR : TEST_CONFIG_DIR;

// Ensure test config directory exists if we need to create it
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Initialize Home Assistant configuration if needed
function ensureConfig() {
  const configFile = path.join(configDir, 'configuration.yaml');

  if (!fs.existsSync(configFile)) {
    console.log('🔧 Creating Home Assistant configuration...');

    // Use hass script to ensure config
    // Filter PATH to only include fixed, unwritable directories
    const fixedPath = [
      '/usr/local/sbin',
      '/usr/local/bin',
      '/usr/sbin',
      '/usr/bin',
      '/sbin',
      '/bin'
    ].join(':');

    // Set PATH to only fixed, unwritable directories (no user/bin)
    const ensureConfigProcess = spawn('hass', [
      '--config', configDir,
      '--script', 'ensure_config'
    ], {
      stdio: 'inherit',
      env: {
      ...process.env,
      PATH: fixedPath // Only fixed system paths
      }
    });

    return new Promise((resolve, reject) => {
      ensureConfigProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Configuration created successfully');
          resolve();
        } else {
          reject(new Error(`Failed to create configuration (exit code ${code})`));
        }
      });
    });
  }

  return Promise.resolve();
}

// Add test resources to existing configuration
function addTestResources() {
  const configFile = path.join(configDir, 'configuration.yaml');
  let config = '';

  if (fs.existsSync(configFile)) {
    config = fs.readFileSync(configFile, 'utf8');
  }

  // Check if our test resources are already configured
  if (!config.includes('fluid-level-background-card.js')) {
    console.log('🔧 Adding test resources to configuration...');

    const testConfig = `
# Test configuration additions for fluid-level-background-card E2E tests

# Disable authentication for testing (ONLY FOR TESTING!)
homeassistant:
  auth_providers:
    - type: trusted_networks
      trusted_networks:
        - 127.0.0.1
        - ::1
        - 172.16.0.0/12
        - 192.168.0.0/16
        - 10.0.0.0/8
      allow_bypass_login: true

# Enable Lovelace (if not already configured)
lovelace:
  mode: yaml
  resources:
    - url: http://127.0.0.1:5000/fluid-level-background-card.js
      type: module

# Test entities for the card (if not already present)
input_number:
  test_level:
    name: Test Level
    min: 0
    max: 100
    step: 1
    initial: 50
    unit_of_measurement: "%"
    icon: mdi:water-percent

  test_battery:
    name: Test Battery
    min: 0
    max: 100
    step: 1
    initial: 75
    unit_of_measurement: "%"
    icon: mdi:battery

input_boolean:
  test_fill_state:
    name: Test Fill State
    initial: false
    icon: mdi:toggle-switch
`;

    fs.appendFileSync(configFile, testConfig);
  }

  // Create test dashboard
  const dashboardFile = path.join(configDir, 'ui-lovelace.yaml');
  if (!fs.existsSync(dashboardFile)) {
    console.log('🔧 Creating test dashboard...');

    const testDashboard = `
title: Fluid Level Background Card Test Dashboard
views:
  - title: Test Cards
    path: test
    cards:
      # Basic card test
      - type: custom:fluid-level-background-card
        entity: input_number.test_level
        card:
          type: entities
          entities:
            - input_number.test_level

      # Card with fill entity
      - type: custom:fluid-level-background-card
        entity: input_number.test_battery
        fill_entity: input_boolean.test_fill_state
        card:
          type: glance
          entities:
            - input_number.test_battery
            - input_boolean.test_fill_state

      # Card with custom colors and severity
      - type: custom:fluid-level-background-card
        entity: input_number.test_level
        background_color: [0, 0, 0, 0.3]
        level_color: [0, 150, 255, 1.0]
        severity:
          - color: [255, 0, 0, 1.0]
            value: 20
          - color: [255, 255, 0, 1.0]
            value: 50
          - color: [0, 255, 0, 1.0]
            value: 80
        card:
          type: entity
          entity: input_number.test_level

      # Card with top margin and random start
      - type: custom:fluid-level-background-card
        entity: input_number.test_battery
        top_margin: 5
        random_start: true
        card:
          type: button
          entity: input_number.test_battery

      # Card with click through enabled
      - type: custom:fluid-level-background-card
        entity: input_number.test_level
        allow_click_through: true
        card:
          type: entity
          entity: input_number.test_level
`;

    fs.writeFileSync(dashboardFile, testDashboard);
  }
}

// Function to start Home Assistant
async function startHomeAssistant() {
  console.log('🏠 Starting Home Assistant for testing...');

  try {
    await ensureConfig();
    addTestResources();

    const fixedPath = [
      '/usr/local/sbin',
      '/usr/local/bin',
      '/usr/sbin',
      '/usr/bin',
      '/sbin',
      '/bin'
    ].join(':');

    const haProcess = spawn('hass', [
      '--config', configDir,
      '--debug'
    ], {
      stdio: 'inherit',
      env: {
      ...process.env,
      PATH: fixedPath,
      PYTHONPATH: process.env.PYTHONPATH || ''
      }
    });

    haProcess.on('error', (error) => {
      console.error('❌ Failed to start Home Assistant:', error.message);
      process.exit(1);
    });

    haProcess.on('exit', (code) => {
      console.log(`🏠 Home Assistant exited with code ${code}`);
    });

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('🛑 Stopping Home Assistant...');
      haProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Stopping Home Assistant...');
      haProcess.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to setup Home Assistant:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startHomeAssistant();
}

module.exports = { startHomeAssistant };
