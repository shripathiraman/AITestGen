// Set side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Handle messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "elementSelected") {
    // Forward to side panel
    chrome.runtime.sendMessage(message);
  }
});

// Persist elements when panel is closed
chrome.storage.local.get(['selectedElements'], (result) => {
  if (!result.selectedElements) {
    chrome.storage.local.set({selectedElements: []});
  }
});