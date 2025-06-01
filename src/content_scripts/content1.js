// procedure way
// Highlight style
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
  .element-highlight {
    outline: 2px solid #f59e0b !important;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3) !important;
    position: relative;
    z-index: 9999;
  }
  
  .element-tooltip {
    position: absolute;
    background: #1e293b;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    transform: translateY(-100%);
    white-space: nowrap;
  }
`;
document.head.appendChild(highlightStyle);
console.log("[CON] Highlight styles added to document head");

let isInspecting = false; // Flag to track inspection state
let currentHighlight = null; // Currently highlighted element
let selectedElements = []; // Array to store selected elements

// Start inspection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[CON] Received message:", request);

  if (request.action === "startInspect") {
    console.log("[CON] Starting inspection");
    startInspection();
  }
  else if (request.action === "stopInspect") {
    console.log("[CON] Stopping inspection");
    stopInspection();
  }
  else if (request.action === "resetInspect") {
    console.log("[CON] Resetting inspection");
    resetInspection();
  }
  else if (request.action === "removeHighlight") {
    console.log("[CON] Removing highlight for selector:", request.selector);
    const element = document.querySelector(request.selector);
    if (element) {
      element.classList.remove('element-highlight');
      const tooltip = element.querySelector('.element-tooltip');
      if (tooltip) tooltip.remove();
      console.log("[CON] Highlight removed for element:", element);
    }
  }
});

function startInspection() {
  isInspecting = true;
  console.log("[CON] Inspection started");
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleElementClick, true);
}

function stopInspection() {
  isInspecting = false;
  console.log("[CON] Inspection stopped");
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleElementClick, true);
  removeHighlight();
}

function resetInspection() {
  selectedElements = [];
  console.log("[CON] Inspection reset, selected elements cleared");
  removeHighlight();
}

function handleMouseMove(e) {
  if (!isInspecting) return;

  const element = e.target;
  console.log("[CON] Mouse moved over element:", element);

  if (element === currentHighlight) return;

  removeHighlight();
  highlightElement(element);
}

function highlightElement(element) {
  console.log("[CON] Highlighting element:", element);
  element.classList.add('element-highlight');

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'element-tooltip';
  tooltip.textContent = getElementSelector(element);
  element.appendChild(tooltip);
  console.log("[CON] Tooltip added to element:", tooltip);

  currentHighlight = element;
}

function removeHighlight() {
  if (currentHighlight) {
    console.log("[CON] Removing highlight from element:", currentHighlight);
    currentHighlight.classList.remove('element-highlight');
    const tooltip = currentHighlight.querySelector('.element-tooltip');
    if (tooltip) tooltip.remove();
    console.log("[CON] Tooltip removed from element:", currentHighlight);
    currentHighlight = null;
  }
}

function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log("[CON] Element clicked:", e.target);

  if (!isInspecting) return;

  const element = e.target;
  const selector = getElementSelector(element);
  console.log("[CON] Element selector:", selector);

  // Add to selected elements
  if (!selectedElements.includes(selector)) {
    selectedElements.push(selector);
    console.log("[CON] Element added to selected elements:", selector);

    // Send to background
    chrome.runtime.sendMessage({
      action: "elementSelected",
      selector: selector,
      name: getElementName(element),
      xpath: getElementXPath(element)
    });
    console.log("[CON] Message sent to background with element details");
  }

  // Keep inspecting for more elements
  return false;
}

function getElementSelector(element) {
  if (element.id) {
    console.log("[CON] Element has ID:", element.id);
    return `#${element.id}`;
  }

  // Simple selector logic (in real implementation, use more robust method)
  if (element.className && typeof element.className === 'string') {
    console.log("[CON] Element has class:", element.className);
    return `.${element.className.split(' ').join('.')}`;
  }

  console.log("[CON] Element selector is tag name:", element.tagName.toLowerCase());
  return element.tagName.toLowerCase();
}

function getElementXPath(element) {
  // Simplified XPath generator
  if (element.id) {
    console.log("[CON] Element has ID for XPath:", element.id);
    return `//*[@id="${element.id}"]`;
  }

  const paths = [];
  for (; element && element.nodeType === 1; element = element.parentNode) {
    let index = 0;
    for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) index++;
    }

    const tagName = element.tagName.toLowerCase();
    const pathIndex = (index ? `[${index + 1}]` : '');
    paths.unshift(tagName + pathIndex);
  }

  const xpath = paths.length ? '/' + paths.join('/') : null;
  console.log("[CON] Generated XPath:", xpath);
  return xpath;
}

function getElementName(element) {
  // Try to get meaningful name
  if (element.getAttribute('name')) {
    console.log("[CON] Element has name attribute:", element.getAttribute('name'));
    return element.getAttribute('name');
  }
  if (element.getAttribute('aria-label')) {
    console.log("[CON] Element has aria-label attribute:", element.getAttribute('aria-label'));
    return element.getAttribute('aria-label');
  }
  if (element.getAttribute('data-testid')) {
    console.log("[CON] Element has data-testid attribute:", element.getAttribute('data-testid'));
    return element.getAttribute('data-testid');
  }
  if (element.innerText && element.innerText.trim().length > 0) {
    const text = element.innerText.trim();
    console.log("[CON] Element has inner text:", text);
    return text.substring(0, 20) + (text.length > 20 ? '...' : '');
  }
  console.log("[CON] Element name is tag name:", element.tagName.toLowerCase());
  return element.tagName.toLowerCase();
}