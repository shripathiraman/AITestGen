document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.getElementById('generator-tab').addEventListener('click', () => switchTab('generator'));
  document.getElementById('settings-tab').addEventListener('click', () => switchTab('settings'));

  // Load saved settings
  loadSettings();

  // Generator tab functionality
  const inspectBtn = document.getElementById('inspect-btn');
  const stopBtn = document.getElementById('stop-btn');
  const resetBtn = document.getElementById('reset-btn');
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const contextInput = document.getElementById('context-input');
  const outputArea = document.getElementById('output-area');
  const selectedElements = document.getElementById('selected-elements');
  const elementCount = document.getElementById('element-count');
  
  let currentElements = [];
  let isInspecting = false;

  // Initialize from storage
  chrome.storage.local.get(['selectedElements', 'context'], (result) => {
    if (result.selectedElements) {
      currentElements = result.selectedElements;
      renderElements();
    }
    if (result.context) {
      contextInput.value = result.context;
    }
  });

  // Tab switching function
  function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
  }

  // Inspect button
  inspectBtn.addEventListener('click', () => {
    isInspecting = true;
    inspectBtn.disabled = true;
    stopBtn.disabled = false;
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "startInspect"});
    });
  });

  // Stop button
  stopBtn.addEventListener('click', () => {
    stopInspection();
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    currentElements = [];
    renderElements();
    contextInput.value = '';
    chrome.storage.local.remove(['selectedElements', 'context']);
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "resetInspect"});
    });
  });

  // Generate button
  generateBtn.addEventListener('click', async () => {
    const checkboxes = [
      document.getElementById('feature-test'),
      document.getElementById('test-page'),
      document.getElementById('test-script')
    ];
    
    if (!checkboxes.some(checkbox => checkbox.checked)) {
      alert("Please select at least one output type");
      return;
    }
    
    if (currentElements.length === 0) {
      alert("Please select at least one element");
      return;
    }
    
    // Save context
    const context = contextInput.value;
    chrome.storage.local.set({context});
    
    // Show output section
    document.querySelector('.output-section').style.display = 'block';
    
    // Get current settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get([
        'language', 
        'automationTool',
        'llmProvider',
        'llmModel'
      ], resolve);
    });
    
    // Generate test cases
    const testCase = generateTestCase(currentElements, context, settings);
    outputArea.value = testCase;
  });

  // Copy button
  copyBtn.addEventListener('click', () => {
    outputArea.select();
    document.execCommand('copy');
    alert("Copied to clipboard!");
  });

  // Download button
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([outputArea.value], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-case.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Stop inspection function
  function stopInspection() {
    isInspecting = false;
    inspectBtn.disabled = false;
    stopBtn.disabled = true;
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopInspect"});
    });
  }

  // Render selected elements
  function renderElements() {
    selectedElements.innerHTML = '';
    elementCount.textContent = currentElements.length;
    
    currentElements.forEach((element, index) => {
      const elemDiv = document.createElement('div');
      elemDiv.className = 'element-item';
      elemDiv.innerHTML = `
        ${element.name || element.selector}
        <span class="remove" data-index="${index}">×</span>
      `;
      selectedElements.appendChild(elemDiv);
    });
    
    // Add remove event listeners
    document.querySelectorAll('.element-item .remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        currentElements.splice(index, 1);
        chrome.storage.local.set({selectedElements: currentElements});
        renderElements();
        
        // Remove highlight from page
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "removeHighlight",
            selector: currentElements[index].selector
          });
        });
      });
    });
  }

  // Generate test case
  function generateTestCase(elements, context, settings) {
    const featureName = "Form Submission Validation";
    const elementsList = elements.map(e => `- ${e.name || e.selector}`).join('\n');
    
    let testScript = '';
    if (settings.automationTool === 'playwright') {
      testScript = `import { test, expect } from '@playwright/test';

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
- Language: ${settings.language}
- Tool: ${settings.automationTool}
- Model: ${settings.llmModel}

Feature: ${featureName}
As a user
I want to submit valid form data
So that I can successfully complete the registration process

Elements Selected:
${elementsList}

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

  // Listen for element selections from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementSelected") {
      currentElements.push({
        selector: request.selector,
        name: request.name,
        xpath: request.xpath
      });
      chrome.storage.local.set({selectedElements: currentElements});
      renderElements();
    }
  });

  // Settings tab functionality
  document.getElementById('save-settings').addEventListener('click', saveSettings);

  function loadSettings() {
    chrome.storage.local.get([
      'language', 
      'automationTool',
      'llmProvider',
      'llmModel',
      'apiKey',
      'outputFormat',
      'multiPage',
      'testExecution'
    ], (settings) => {
      if (settings.language) {
        document.getElementById('language').value = settings.language;
      }
      if (settings.automationTool) {
        document.getElementById('automation-tool').value = settings.automationTool;
      }
      if (settings.llmProvider) {
        document.getElementById('llm-provider').value = settings.llmProvider;
      }
      if (settings.llmModel) {
        document.getElementById('llm-model').value = settings.llmModel;
      }
      if (settings.apiKey) {
        document.getElementById('api-key').value = settings.apiKey;
      }
      if (settings.outputFormat !== undefined) {
        document.getElementById('output-format').checked = settings.outputFormat;
      }
      if (settings.multiPage !== undefined) {
        document.getElementById('multi-page').checked = settings.multiPage;
      }
      if (settings.testExecution !== undefined) {
        document.getElementById('test-execution').checked = settings.testExecution;
      }
    });
  }

  function saveSettings() {
    const settings = {
      language: document.getElementById('language').value,
      automationTool: document.getElementById('automation-tool').value,
      llmProvider: document.getElementById('llm-provider').value,
      llmModel: document.getElementById('llm-model').value,
      apiKey: document.getElementById('api-key').value,
      outputFormat: document.getElementById('output-format').checked,
      multiPage: document.getElementById('multi-page').checked,
      testExecution: document.getElementById('test-execution').checked
    };
    
    chrome.storage.local.set(settings, () => {
      alert('Settings saved successfully!');
    });
  }
});