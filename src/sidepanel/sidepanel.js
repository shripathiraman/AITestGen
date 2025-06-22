document.addEventListener('DOMContentLoaded', async () => {
  console.log("[SP] DOM fully loaded and parsed.");

  // Tab switching
  document.getElementById('generator-tab').addEventListener('click', () => {
    console.log("[SP] Generator tab clicked.");
    switchTab('generator');
  });
  document.getElementById('settings-tab').addEventListener('click', () => {
    console.log("[SP] Settings tab clicked.");
    switchTab('settings');
  });

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

  // Initialize from storage for generator-specific elements and context
  chrome.storage.local.get(['selectedElements', 'context'], (result) => {
    console.log("[SP] Initializing Generator from storage:", result);
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
      const confirmReset = confirm("Are you sure you want to reset? This will clear all selected elements, context, and generated output.");
      if (confirmReset) {
          console.log("[SP] Reset confirmed by user.");
          stopInspection();

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              console.log("[SP] Sending resetInspect message to content script.");
              chrome.tabs.sendMessage(tabs[0].id, { action: "resetInspect" }, () => {
                  currentElements = [];
                  renderElements();
                  contextInput.value = '';
                  outputArea.value = '';
                  document.querySelector('.output-section').style.display = 'none';
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
    // Retrieve latest settings from storage (these are managed by SettingsManager)
    const settings = await new Promise(resolve => {
      chrome.storage.local.get([
        'featureTest',
        'testPage',
        'testScript',
        'language',
        'automationTool',
        'llmProvider',
        'llmModel'
      ], resolve);
    });

    const checkboxesChecked = settings.featureTest || settings.testPage || settings.testScript;

    if (!checkboxesChecked) {
      console.log("[SP] No output type selected based on settings.");
      alert("Please select at least one output type in Settings (Manual Test Case, Page Object Model, or Test Script).");
      return;
    }

    if (currentElements.length === 0) {
      console.log("[SP] No elements selected.");
      alert("Please select at least one element");
      return;
    }

    const context = contextInput.value;
    chrome.storage.local.set({context});
    console.log("[SP] Saved context:", context);

    document.querySelector('.output-section').style.display = 'block';
    console.log("[SP] Output section displayed.");

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

    document.querySelectorAll('.element-item .remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        console.log(`[SP] Removing element at index ${index}.`);
        
        if (index >= 0 && index < currentElements.length) {
          const selectorToRemove = currentElements[index].selector;
          
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
        html: request.html,
        attributes: request.attributes || {}
      });
      chrome.storage.local.set({selectedElements: currentElements});
      renderElements();
    } else if (request.action === "updateSelectedElements") {
        currentElements = request.elements.map(element => ({
            selector: element.selector,
            name: element.name,
            xpath: element.xpath,
            html: element.html,
            attributes: element.attributes || {}
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
        return true;
    }
    console.log("[SP] Action not recognized:", request.action);
    sendResponse({ status: "unknown action" });
    return false;
  });
});