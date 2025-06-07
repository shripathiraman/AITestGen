// Set side panel behavior
console.log("[BG] Setting side panel behavior...");
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => console.log("[BG] Side panel behavior set successfully."))
  .catch((error) => console.error("[BG] Error setting side panel behavior:", error));

// Handle messages between content script and side panel
console.log("[BG] Adding message listener...");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[BG] Received message:", message);
  console.log("[BG] Message sender:", sender);

  if (   message.action === "elementSelected" 
      || message.action === "removeHighlight"
      || message.action === "clearAll" ) {
    console.log("[BG] Action is 'elementSelected'. Forwarding message to side panel...");
    // Forward to side panel
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error("[BG] Error forwarding message:", chrome.runtime.lastError);
            sendResponse({ status: "error", error: chrome.runtime.lastError });
        } else {
            sendResponse({ status: "forwarded", response });
        }
    });
    return true; // Indicate asynchronous response
  } else {
    console.log("[BG] Action not recognized:", message.action);
    sendResponse({ status: "unknown action" });
    return false; // No asynchronous response needed
  }
});

// Persist elements when panel is closed
console.log("[BG] Checking for persisted elements...");
chrome.storage.local.get(['selectedElements'], (result) => {
  console.log("[BG] Retrieved selectedElements from storage:", result.selectedElements);

  if (!result.selectedElements) {
    console.log("[BG] No selectedElements found. Initializing storage with an empty array...");
    chrome.storage.local.set({ selectedElements: [] }, () => {
      console.log("[BG] Storage initialized with empty selectedElements array.");
    });
  } else {
    console.log("[BG] selectedElements already exist in storage.");
  }
});