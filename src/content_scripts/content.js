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

let isInspecting = false;
let currentHighlight = null;
let selectedElements = [];

// Start inspection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startInspect") {
    startInspection();
  }
  else if (request.action === "stopInspect") {
    stopInspection();
  }
  else if (request.action === "resetInspect") {
    resetInspection();
  }
  else if (request.action === "removeHighlight") {
    const element = document.querySelector(request.selector);
    if (element) {
      element.classList.remove('element-highlight');
      const tooltip = element.querySelector('.element-tooltip');
      if (tooltip) tooltip.remove();
    }
  }
});

function startInspection() {
  isInspecting = true;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleElementClick, true);
}

function stopInspection() {
  isInspecting = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleElementClick, true);
  removeHighlight();
}

function resetInspection() {
  selectedElements = [];
  removeHighlight();
}

function handleMouseMove(e) {
  if (!isInspecting) return;
  
  const element = e.target;
  if (element === currentHighlight) return;
  
  removeHighlight();
  highlightElement(element);
}

function highlightElement(element) {
  element.classList.add('element-highlight');
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'element-tooltip';
  tooltip.textContent = getElementSelector(element);
  element.appendChild(tooltip);
  
  currentHighlight = element;
}

function removeHighlight() {
  if (currentHighlight) {
    currentHighlight.classList.remove('element-highlight');
    const tooltip = currentHighlight.querySelector('.element-tooltip');
    if (tooltip) tooltip.remove();
    currentHighlight = null;
  }
}

function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!isInspecting) return;
  
  const element = e.target;
  const selector = getElementSelector(element);
  
  // Add to selected elements
  if (!selectedElements.includes(selector)) {
    selectedElements.push(selector);
    
    // Send to background
    chrome.runtime.sendMessage({
      action: "elementSelected",
      selector: selector,
      name: getElementName(element),
      xpath: getElementXPath(element)
    });
  }
  
  // Keep inspecting for more elements
  return false;
}

function getElementSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Simple selector logic (in real implementation, use more robust method)
  if (element.className && typeof element.className === 'string') {
    return `.${element.className.split(' ').join('.')}`;
  }
  
  return element.tagName.toLowerCase();
}

function getElementXPath(element) {
  // Simplified XPath generator
  if (element.id) return `//*[@id="${element.id}"]`;
  
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
  
  return paths.length ? '/' + paths.join('/') : null;
}

function getElementName(element) {
  // Try to get meaningful name
  if (element.getAttribute('name')) return element.getAttribute('name');
  if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.getAttribute('data-testid')) return element.getAttribute('data-testid');
  if (element.innerText && element.innerText.trim().length > 0) {
    return element.innerText.trim().substring(0, 20) + (element.innerText.trim().length > 20 ? '...' : '');
  }
  return element.tagName.toLowerCase();
}