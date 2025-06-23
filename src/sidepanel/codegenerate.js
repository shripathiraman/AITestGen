export class CodeGenerator {
  constructor() {
    this.debugMode = true; // Set to false to disable logs
    this.elements = {}; // Cache for frequently accessed DOM elements
    this.currentElements = []; // To store elements selected for code generation
    this.initialize();
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[CodeGenerator] ${message}`, ...args);
    }
  }

  cacheElements() {
    this.elements['generate-btn'] = document.getElementById('generate-btn');
    this.elements['copy-btn'] = document.getElementById('copy-btn');
    this.elements['download-btn'] = document.getElementById('download-btn');
    this.elements['context-input'] = document.getElementById('context-input');
    this.elements['output-area'] = document.getElementById('output-area');
    this.elements['output-section'] = document.querySelector('.output-section');
  }

  async initialize() {
    this.log("Initializing CodeGenerator.");
    this.cacheElements();
    this.setupEventListeners();
    await this.loadInitialData();
  }

  setupEventListeners() {
    this.log("Setting up event listeners for generator.");
    this.elements['generate-btn'].addEventListener('click', this.handleGenerateClick.bind(this));
    this.elements['copy-btn'].addEventListener('click', this.handleCopyClick.bind(this));
    this.elements['download-btn'].addEventListener('click', this.handleDownloadClick.bind(this));
  }

  async loadInitialData() {
    const result = await chrome.storage.local.get(['selectedElements', 'context']);
    if (result.selectedElements) {
      this.currentElements = result.selectedElements;
      this.log("Loaded selected elements:", this.currentElements);
    }
    if (result.context && this.elements['context-input']) {
      this.elements['context-input'].value = result.context;
      this.log("Loaded context:", result.context);
    }
  }

  updateSelectedElements(elements) {
    this.currentElements = elements;
    this.log("CodeGenerator updated with new elements:", this.currentElements);
  }

  async handleGenerateClick() {

    this.log("Generate button clicked.");

    // Retrieve latest settings from storage
    const settings = await chrome.storage.local.get([
      'language',
      'automationTool',
      'llmProvider',
      'llmModel',
      'apiKey' // Add apiKey to the retrieved settings
    ]);
    this.log("Settings retrieved for generation:", settings);

    // Check 1: No elements selected
    if (this.currentElements.length === 0) {
      this.log("No elements selected.");
      alert("Please select at least one element to generate a test case.");
      return;
    }

    // Check 2: Missing Automation Tool
    if (!settings.automationTool) {
      alert("Please select an Automation Tool in Settings.");
      return;
    }

    // Check 3: Missing Language
    if (!settings.language) {
      alert("Please select a Programming Language in Settings.");
      return;
    }

    // Check 4: Missing LLM Provider
    if (!settings.llmProvider) {
      alert("Please select an LLM Provider in Settings.");
      return;
    }

    // Check 5: Missing LLM Model
    if (!settings.llmModel) {
      alert("Please select an LLM Model in Settings.");
      return;
    }

    // Check 6: Missing API Key
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      // You could also call a method from SettingsManager to show an inline error,
      // but for an immediate block, an alert is effective.
      alert("API Key is mandatory. Please provide a valid API Key in Settings.");
      return;
    }    

    if (this.currentElements.length === 0) {
      this.log("No elements selected.");
      alert("Please select at least one element");
      return;
    }

    const context = this.elements['context-input'].value;
    await chrome.storage.local.set({ context });
    this.log("Saved context:", context);

    if (this.elements['output-section']) {
      this.elements['output-section'].style.display = 'block';
      this.log("Output section displayed.");
    }

    const testCase = this.generateTestCase(this.currentElements, context, settings);
    this.log("Generated test case:", testCase);
    if (this.elements['output-area']) {
      this.elements['output-area'].value = testCase;
    }
  }

  handleCopyClick() {
    this.log("Copy button clicked.");
    if (this.elements['output-area']) {
      this.elements['output-area'].select();
      document.execCommand('copy');
      alert("Copied to clipboard!");
    }
  }

  handleDownloadClick() {
    this.log("Download button clicked.");
    if (this.elements['output-area']) {
      const blob = new Blob([this.elements['output-area'].value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-case.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.log("Test case downloaded.");
    }
  }

  generateTestCase(elements, context, settings) {
    this.log("Generating test case with elements:", elements, "context:", context, "settings:", settings);
    const featureName = "Form Submission Validation";
    const elementsList = elements.map(e => `- ${e.name || e.selector}`).join('\n');

    let testScript = '';
    if (settings.automationTool === 'playwright') {
      testScript = `import { test, expect } from '@playwright/test';`;

      testScript += `
      test('validate form submission', async ({ page }) => {
        await page.goto('https://example.com');
        ${elements.map(e => {
              if (e.selector.startsWith('input')) {
                return `await page.locator('${e.selector}').fill('test data');`;
              } else if (e.selector.startsWith('button')) {
                return `await page.locator('${e.selector}').click();`;
              }
              return '';
            }).filter(Boolean).join('\n  ')}
      });`;
    } else {
      testScript = `// Selenium test script would be generated here`;
    }

    return `Generated using:
    - Language: ${settings.language || 'TypeScript'}
    - Tool: ${settings.automationTool || 'Playwright'}
    - Model: ${settings.llmModel || 'Deepseek'}

    Feature: ${featureName}
    As a user
    I want to submit valid form data
    So that I can successfully complete the registration process

    Elements Selected:
    ${elementsList}

    Elements JSON:
    ${JSON.stringify(elements, null, 2)}

    User Context:
    ${context || "No additional context provided"}

    Generated Test Case:
    Scenario: Validate form submission with valid data
    Given I am on the registration page
    When I enter valid username
    And I enter valid password
    And I click the submit button
    Then I should see the welcome message

    Test Script:
    ${testScript}`;
  }
}