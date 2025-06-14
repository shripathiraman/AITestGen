document.addEventListener('DOMContentLoaded', async () => {
  console.log("[SP] DOM fully loaded and parsed.");

  // Fetch dropdown data from JSON file
  const response = await fetch('/src/data/dropdown-data.json');
  const dropdownData = await response.json();

  // Populate Automation Tool dropdown
  const automationToolDropdown = document.getElementById('automation-tool');
  dropdownData.automationTools.forEach(tool => {
    const option = document.createElement('option');
    option.value = tool.code;
    option.textContent = tool.description;
    automationToolDropdown.appendChild(option);
  });

  // Populate Programming Language dropdown based on selected Automation Tool
  const programmingLanguageDropdown = document.getElementById('language');
  automationToolDropdown.addEventListener('change', () => {
    const selectedTool = automationToolDropdown.value;
    programmingLanguageDropdown.innerHTML = ''; // Clear existing options

    dropdownData.programmingLanguages[selectedTool].forEach(language => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.description;
      programmingLanguageDropdown.appendChild(option);
    });
  });

  // Trigger initial population of Programming Language dropdown
  automationToolDropdown.dispatchEvent(new Event('change'));

  // Get references to the dropdowns (declared once)
  const llmProviderDropdown = document.getElementById('llm-provider');
  const llmModelDropdown = document.getElementById('llm-model');

  // Populate LLM Provider dropdown
  dropdownData.llmProviders.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider.code;
    option.textContent = provider.description;
    llmProviderDropdown.appendChild(option);
  });

  // Populate LLM Model dropdown based on selected LLM Provider
  llmProviderDropdown.addEventListener('change', () => {
    const selectedProvider = llmProviderDropdown.value;
    llmModelDropdown.innerHTML = ''; // Clear existing options

    dropdownData.llmModels[selectedProvider].forEach(model => {
      const option = document.createElement('option');
      option.value = model.code;
      option.textContent = model.description;
      llmModelDropdown.appendChild(option);
    });
  });

  // Trigger initial population of LLM Model dropdown
  llmProviderDropdown.dispatchEvent(new Event('change'));

  // Tab switching
  document.getElementById('generator-tab').addEventListener('click', () => {
    console.log("[SP] Generator tab clicked.");
    switchTab('generator');
  });
  document.getElementById('settings-tab').addEventListener('click', () => {
    console.log("[SP] Settings tab clicked.");
    switchTab('settings');
  });

  // Load saved settings
  console.log("[SP] Loading saved settings...");
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
    console.log("[SP] Initializing from storage:", result);
    if (result.selectedElements) {
      currentElements = result.selectedElements;
      console.log("[SP] Loaded selected elements:", currentElements);
      renderElements();
    }
    if (result.context) {
      contextInput.value = result.context;
      console.log("[SP] Loaded context:", result.context);
    }
  });

  // Tab switching function
  function switchTab(tabName) {
    console.log(`[SP] Switching to tab: ${tabName}`);
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
    console.log("[SP] Inspect button clicked.");
    // Reset inspection state if needed
    if (!isInspecting) {
      isInspecting = true;
    }
    inspectBtn.disabled = true;
    stopBtn.disabled = false;

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      console.log("[SP] Sending startInspect message to content script.");
      chrome.tabs.sendMessage(tabs[0].id, {action: "startInspect"});
    });
  });

  // Stop button
  stopBtn.addEventListener('click', () => {
    console.log("[SP] Stop button clicked.");
    stopInspection();
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
      // Ask for confirmation before resetting
      const confirmReset = confirm("Are you sure you want to reset? This will clear all selected elements, context, and generated output.");
      if (confirmReset) {
          console.log("[SP] Reset confirmed by user.");
        
          // Stop inspection if it's active
          stopInspection();

          // Clear selected elements
          // First send reset message to content script to clear highlights
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              console.log("[SP] Sending resetInspect message to content script.");
              chrome.tabs.sendMessage(tabs[0].id, { action: "resetInspect" }, () => {
                  // After highlights are cleared, reset local state
                  currentElements = [];
                  renderElements();

                  contextInput.value = ''; // Clear context input
                  outputArea.value = ''; // Clear the output area
                  
                  // Clear generated output
                  const outputSection = document.querySelector('.output-section');
                  outputSection.style.display = 'none'; // Hide the output section
              
                  // Remove data from storage
                  chrome.storage.local.remove(['selectedElements', 'context']);
                  console.log("[SP] Cleared selected elements, context, and output from storage.");

                  // Send reset message to content script
                  // Remove data from storage
                  chrome.storage.local.remove(['selectedElements', 'context']);
                  console.log("[SP] Cleared selected elements, context, and output from storage.");

              });
          });
      } else {
        console.log("[SP] Reset canceled by user.");
      }
  });

  // Generate button
  generateBtn.addEventListener('click', async () => {
    console.log("[SP] Generate button clicked.");
    const checkboxes = [
      document.getElementById('feature-test'),
      document.getElementById('test-page'),
      document.getElementById('test-script')
    ];

    if (!checkboxes.some(checkbox => checkbox.checked)) {
      console.log("[SP] No output type selected.");
      alert("Please select at least one output type");
      return;
    }

    if (currentElements.length === 0) {
      console.log("[SP] No elements selected.");
      alert("Please select at least one element");
      return;
    }

    // Save context
    const context = contextInput.value;
    chrome.storage.local.set({context});
    console.log("[SP] Saved context:", context);

    // Show output section
    document.querySelector('.output-section').style.display = 'block';
    console.log("[SP] Output section displayed.");

    // Get current settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get([
        'language', 
        'automationTool',
        'llmProvider',
        'llmModel'
      ], resolve);
    });
    console.log("[SP] Loaded settings:", settings);

    // Generate test cases
    const testCase = generateTestCase(currentElements, context, settings);
    console.log("[SP] Generated test case:", testCase);
    outputArea.value = testCase;
  });

  // Copy button
  copyBtn.addEventListener('click', () => {
    console.log("[SP] Copy button clicked.");
    outputArea.select();
    document.execCommand('copy');
    alert("Copied to clipboard!");
  });

  // Download button
  downloadBtn.addEventListener('click', () => {
    console.log("[SP] Download button clicked.");
    const blob = new Blob([outputArea.value], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-case.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("[SP] Test case downloaded.");
  });

  // Stop inspection function
  function stopInspection() {
    console.log("[SP] Stopping inspection.");
    isInspecting = false;
    inspectBtn.disabled = false;
    stopBtn.disabled = true;

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      console.log("[SP] Sending stopInspect message to content script.");
      chrome.tabs.sendMessage(tabs[0].id, {action: "stopInspect"});
    });
  }

  // Render selected elements
  function renderElements() {
    console.log("[SP] Rendering selected elements:", currentElements);
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
      // In renderElements() function, update the remove event listener:
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        console.log(`[SP] Removing element at index ${index}.`);
        
        // Check if the element exists at this index
        if (index >= 0 && index < currentElements.length) {
          const selectorToRemove = currentElements[index].selector;
          
          // Send message to content script to remove highlight
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "removeHighlight",
                selector: selectorToRemove
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("[SP] Error sending removeHighlight:", chrome.runtime.lastError);
                } else {
                  console.log("[SP] Remove highlight response:", response);
                  // Remove from local array and update storage
                  currentElements.splice(index, 1);
                  chrome.storage.local.set({selectedElements: currentElements}, () => {
                    renderElements();
                  });
                }
              });
            }
          });

        } else {
          console.error("[SP] Invalid index for removal:", index);
        }
      });
    });
  }

  // Generate test case
  function generateTestCase(elements, context, settings) {
    console.log("[SP] Generating test case with elements:", elements, "context:", context, "settings:", settings);
    const featureName = "Form Submission Validation";
    const elementsList = elements.map(e => `- ${e.name || e.selector}`).join('\n');

    let testScript = '';
    if (settings.automationTool === 'playwright') {
      testScript = `import { test, expect } from '@playwright/test`;

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
- Model: ${settings.llmModel || 'GPT-4'}

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
    console.log("[SP] Received message from content script:", request);
    if (request.action === "elementSelected") {
      currentElements.push({
        selector: request.selector,
        name: request.name,
        xpath: request.xpath,
        html: request.html, /*111*/
        attributes: request.attributes || {} // Ensure attributes are included
      });
      chrome.storage.local.set({selectedElements: currentElements});
      renderElements();
    }
  });

  // Settings tab functionality
  document.getElementById('save-settings').addEventListener('click', () => {
    console.log("[SP] Save settings button clicked.");
    saveSettings();

    // Save checkbox states for "AI Output's"
    const featureTest = document.getElementById('feature-test').checked;
    const testPage = document.getElementById('test-page').checked;
    const testScript = document.getElementById('test-script').checked;

    chrome.storage.local.set({ featureTest, testPage, testScript }, () => {
      console.log("[SP] Saved AI Output's settings:", { featureTest, testPage, testScript });
    });
  });

  // Toggle switch functionality
  document.querySelectorAll('.switch input').forEach(switchInput => {
    switchInput.addEventListener('change', function() {
      console.log(`[SP] Switch toggled: ${this.id}, checked: ${this.checked}`);
    });
  });

  // Define LLM Models for each provider
  const llmModels = {
    openai: ['GPT-4', 'GPT-3.5', 'Davinci'],
    groq: ['Palm-2', 'Bard'],
    testleaf: ['Azure GPT-4', 'Azure GPT-3.5']
  };

  // Function to update LLM Model options
  const updateLLMModels = () => {
    const selectedProvider = llmProviderDropdown.value;

    // Clear existing options
    llmModelDropdown.innerHTML = '';

    // Populate new options based on the selected provider
    llmModels[selectedProvider].forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      llmModelDropdown.appendChild(option);
    });
  };

  // Add event listener to LLM Provider dropdown
  llmProviderDropdown.addEventListener('change', updateLLMModels);

  // Initial population of LLM Models
  updateLLMModels();

  // Load saved settings
  function loadSettings() {
    console.log("[SP] Loading settings from storage...");
    chrome.storage.local.get([
      'language',
      'automationTool',
      'llmProvider',
      'llmModel',
      'apiKey',
      'outputFormat',
      'multiPage',
      'testExecution',
      'featureTest',
      'testPage',
      'testScript'
    ], (settings) => {
      console.log("[SP] Settings loaded:", settings);
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
      if (settings.outputFormat) {
        document.querySelectorAll('.dual-option').forEach(option => {
          option.classList.remove('active');
          if (option.dataset.value === settings.outputFormat) {
            option.classList.add('active');
          }
        });
      }
      if (settings.multiPage !== undefined) {
        document.getElementById('multi-page').checked = settings.multiPage;
      }
      if (settings.testExecution !== undefined) {
        document.getElementById('test-execution').checked = settings.testExecution;
      }
      if (settings.featureTest !== undefined) {
        document.getElementById('feature-test').checked = settings.featureTest;
      }
      if (settings.testPage !== undefined) {
        document.getElementById('test-page').checked = settings.testPage;
      }
      if (settings.testScript !== undefined) {
        document.getElementById('test-script').checked = settings.testScript;
      }
      console.log("[SP] Settings loaded and applied to UI.");
    });
  }

  function saveSettings() {
    console.log("[SP] Saving settings...");

    const apiKeyInput = document.getElementById('api-key');
    const apiKey = apiKeyInput.value;

    // Check if API key is provided
    if (!apiKey) {
      console.log("[SP] API key is missing.");

      // Highlight the input field
      apiKeyInput.classList.add('error-border');

      // Remove existing error message if present
      const existingError = document.getElementById('api-key-error');
      if (existingError) {
        existingError.remove();
      }

      // Create and display error message
      const errorMessage = document.createElement('div');
      errorMessage.id = 'api-key-error';
      errorMessage.textContent = 'API Key is mandatory. Please provide a valid API Key.';
      errorMessage.classList.add('error-message');
      apiKeyInput.parentNode.insertBefore(errorMessage, apiKeyInput.nextSibling);

      // Set focus on the API key input field
      apiKeyInput.focus();

      // Add event listener to remove error styling when input is corrected
      apiKeyInput.addEventListener('input', () => {
        if (apiKeyInput.value.trim() !== '') {
          apiKeyInput.classList.remove('error-border');
          const errorElement = document.getElementById('api-key-error');
          if (errorElement) {
            errorElement.remove();
          }
        }
      });

      return; // Exit the function without saving
    }

    const settings = {
      language: document.getElementById('language').value,
      automationTool: document.getElementById('automation-tool').value,
      llmProvider: document.getElementById('llm-provider').value,
      llmModel: document.getElementById('llm-model').value,
      apiKey: document.getElementById('api-key').value,
      outputFormat: document.querySelector('.dual-option.active').dataset.value,
      multiPage: document.getElementById('multi-page').checked,
      testExecution: document.getElementById('test-execution').checked,
      featureTest: document.getElementById('feature-test').checked,
      testPage: document.getElementById('test-page').checked,
      testScript: document.getElementById('test-script').checked
    };

    chrome.storage.local.set(settings, () => {
      console.log("[SP] Settings saved:", settings);
      // Animation for save button
      const saveBtn = document.getElementById('save-settings');
      const originalText = saveBtn.textContent;
      const originalBg = saveBtn.style.background;

      saveBtn.textContent = 'Settings Saved!';
      saveBtn.style.background = '#10b981';

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = originalBg;
      }, 2000);
    });
  }

  const featureTestCheckboxLabel = document.querySelector('label[for="feature-test"]');
  const dualToggleOptions = document.querySelectorAll('.dual-option');

  // Function to update the label based on the selected option
  const updateFeatureTestLabel = () => {
    const selectedOption = document.querySelector('.dual-option.active').dataset.value;
    console.log("[SP] Updating feature test label based on selected option:", selectedOption);

    const featureTestCheckbox = document.getElementById('feature-test');
    const featureTestCheckboxLabel = document.querySelector('label[for="feature-test"]');

    // Update the label text based on the selected option
    featureTestCheckboxLabel.innerHTML = `${selectedOption === 'manual' ? 'Manual Test Case' : 'Feature Test Case'}`;
  };

  // Add event listeners to toggle options
  dualToggleOptions.forEach(option => {
    option.addEventListener('click', () => {
      console.log("[SP] Dual toggle option clicked:", option.textContent);
      // Update active class
      dualToggleOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      // Update the label
      updateFeatureTestLabel();
    });
  });

  // Initial label update
  updateFeatureTestLabel();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[SP] Received message from content script:", request);
    if (request.action === "updateSelectedElements") {
        currentElements = request.elements.map(element => ({
            selector: element.selector,
            name: element.name,
            xpath: element.xpath,
            html: element.html,
            attributes: element.attributes || {} // Ensure attributes are included
        }));
        chrome.storage.local.set({ selectedElements: currentElements }, () => {
          try {
              renderElements();
              sendResponse({ status: "elements updated" });
          } catch (error) {
              console.error("[SP] Error updating elements:", error);
              sendResponse({ status: "error", error: error.message });
          }
        });
        return true; // Indicate asynchronous response
    }
    console.log("[SP] Action not recognized:", request.action);
    sendResponse({ status: "unknown action" });
    return false; // No asynchronous response needed
  });
});