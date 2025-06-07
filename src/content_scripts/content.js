// content.js
// Only initialize if not already initialized
if (!window.elementInspector) {
    class ElementInspector {
        constructor() {
            this.isActive = false; // Flag to track inspection state
            this.selectedElements = new Map(); // Using Map to store selector -> element details
            this.highlightedElement = null; // Currently highlighted element
            this.currentPort = null; // Port for long-lived connection if needed
            this.highlightStyleAdded = false; // Flag to ensure style is added once
        }

        init() {
            if (!this.highlightStyleAdded) {
                this.addHighlightStyles();
                this.highlightStyleAdded = true;
            }

            // Bind event handlers to the class instance
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleElementClick = this.handleElementClick.bind(this);

            // Listen for messages from the extension (e.g., popup or background)
            chrome.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this));

            console.log("[ElementInspector] Initialized.");
        }

        addHighlightStyles() {
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
                .element-selected-highlight {
                    outline: 2px dashed #10B981 !important;
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3) !important;
                    position: relative;
                    z-index: 9998;
                }
            `;
            document.head.appendChild(highlightStyle);
            console.log("[ElementInspector] Highlight styles added.");
        }

        handleRuntimeMessage(request, sender, sendResponse) {
            console.log("[ElementInspector] Received message:", request.action);
            switch (request.action) {
                case "startInspect":
                    this.startInspection();
                    sendResponse({ status: "started" }); // Ensure sendResponse is called
                    break;
                case "stopInspect":
                    this.stopInspection();
                    sendResponse({ status: "stopped" }); // Ensure sendResponse is called
                    break;
                case "resetInspect":
                    this.resetInspection();
                    sendResponse({ status: "reset" }); // Ensure sendResponse is called
                    break;
                case "removeHighlight":
                    this.removeSpecificHighlight(request.selector);
                    sendResponse({status: "removed"}); //*** remove the highlighted element */
                    break;
                case "clearAll":
                    this.clearAllStates();
                    sendResponse({ status: "cleared" });
                    break;
                default:
                    sendResponse({ status: "unknown action" });
                    break;
            }
            return true; // Indicates async response
        }

        clearAllStates() {
            this.isActive = false;
            this.selectedElements.clear();
            this.highlightedElement = null;
            
            // Remove all highlights from the page
            document.querySelectorAll('.element-highlight, .element-selected-highlight').forEach(el => {
                el.classList.remove('element-highlight', 'element-selected-highlight');
            });
            
            // Remove all tooltips
            document.querySelectorAll('.element-tooltip').forEach(tooltip => {
                tooltip.remove();
            });
            
            // Reset cursor
            document.body.style.cursor = '';
            
            // Remove event listeners if they exist
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('click', this.handleElementClick, true);
            
            console.log("[ElementInspector] All states cleared.");
        }

        startInspection() {
            if (this.isActive) return;
            this.isActive = true;
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('click', this.handleElementClick, true);
            document.body.style.cursor = 'crosshair';
            console.log("[ElementInspector] Inspection started.");
        }

        stopInspection() {
            if (!this.isActive) return;
            this.isActive = false;
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('click', this.handleElementClick, true);
            document.body.style.cursor = '';
            this.removeHighlight();
            console.log("[ElementInspector] Inspection stopped.");
        }

        resetInspection() {
            this.selectedElements.forEach((details, selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.classList.remove('element-selected-highlight');
                }
            });
            this.selectedElements.clear();
            this.removeHighlight();
            console.log("[ElementInspector] Inspection reset.");
            chrome.runtime.sendMessage({ action: "selectionCleared" });
        }

        handleMouseMove(e) {
            if (!this.isActive) return;
            const element = e.target;
            if (element === this.highlightedElement) return;
            this.removeHighlight();
            this.highlightElement(element);
        }

        highlightElement(element) {
            if (!this.selectedElements.has(this.getElementSelector(element))) {
                element.classList.add('element-highlight');
                this.addTooltip(element);
            }
            this.highlightedElement = element;
        }

        removeHighlight() {
            if (this.highlightedElement) {
                this.highlightedElement.classList.remove('element-highlight');
                this.removeTooltip(this.highlightedElement);
                this.highlightedElement = null;
            }
        }

        addTooltip(element) {
            if (element.querySelector('.element-tooltip')) return;
            const tooltip = document.createElement('div');
            tooltip.className = 'element-tooltip';
            tooltip.textContent = this.getElementSelector(element);
            element.appendChild(tooltip);
        }

        removeTooltip(element) {
            const tooltip = element.querySelector('.element-tooltip');
            if (tooltip) tooltip.remove();
        }

        // --- Hybrid Model Methods ---
        handleElementClick(e) {
            if (!this.isActive) return;
            e.preventDefault();
            e.stopPropagation();

            const element = e.target;
            const selector = this.getElementSelector(element);

            if (this.selectedElements.has(selector)) {
                this.selectedElements.delete(selector);
                element.classList.remove('element-selected-highlight');
                if (this.highlightedElement === element) {
                    element.classList.remove('element-highlight');
                    this.removeTooltip(element);
                    this.highlightedElement = null;
                }
                console.log(`[ElementInspector] Element unselected: ${selector}`);
            } else {
                this.selectedElements.set(selector, {
                    selector: selector,
                    xpath: this.getElementXPath(element),
                    name: this.getElementName(element),
                    html: element.outerHTML,
                    attributes: this.getElementAttributes(element)
                });
                element.classList.add('element-selected-highlight');
                element.classList.remove('element-highlight');
                this.removeTooltip(element);
                this.highlightedElement = null;
                console.log(`[ElementInspector] Element selected: ${selector}`);
            }
            this.sendSelectedElementsToExtension();
        }

        getElementAttributes(element) {
            const attrs = {};
            ['id', 'class', 'name', 'data-testid', 'aria-label', 'role'].forEach(attr => {
                if (element.hasAttribute(attr)) attrs[attr] = element.getAttribute(attr);
            });
            return attrs;
        }

        sendSelectedElementsToExtension() {
            const elements = Array.from(this.selectedElements.values());
            chrome.runtime.sendMessage({
                action: "updateSelectedElements",
                elements: elements
            });
            console.log("[ElementInspector] Sent hybrid data to extension.");
        }

        removeSpecificHighlight(selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.remove('element-highlight');
                element.classList.remove('element-selected-highlight');
                this.removeTooltip(element);
                if (this.highlightedElement === element) {
                    this.highlightedElement = null;
                }
                this.selectedElements.delete(selector);
                this.sendSelectedElementsToExtension();
            }
        }

        // --- Helper functions ---
        getElementSelector(element) {
            if (element.id) return `#${element.id}`;
            
            if (element.className && typeof element.className === 'string' && element.className.trim() !== '') {
                const classNames = element.className.trim().split(/\s+/).filter(Boolean);
                if (classNames.length > 0) return `.${classNames.join('.')}`;
            }

            let selector = element.tagName.toLowerCase();
            const commonAttributes = ['name', 'data-testid', 'role', 'type', 'aria-label'];
            for (const attr of commonAttributes) {
                const attrValue = element.getAttribute(attr);
                if (attrValue) return `${selector}[${attr}="${attrValue}"]`;
            }

            if (!this.isUniqueSelector(selector, element)) {
                let index = 1;
                let sibling = element.previousElementSibling;
                while (sibling) {
                    if (sibling.tagName.toLowerCase() === element.tagName.toLowerCase()) index++;
                    sibling = sibling.previousElementSibling;
                }
                selector += `:nth-of-type(${index})`;
            }
            return selector;
        }

        isUniqueSelector(selector, element) {
            try {
                const elements = document.querySelectorAll(selector);
                return elements.length === 1 && elements[0] === element;
            } catch (e) {
                return false;
            }
        }

        getElementXPath(element) {
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

        getElementName(element) {
            if (element.getAttribute('name')) return element.getAttribute('name');
            if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
            if (element.getAttribute('data-testid')) return element.getAttribute('data-testid');
            if (element.innerText && element.innerText.trim().length > 0) {
                const text = element.innerText.trim();
                return text.substring(0, 50) + (text.length > 50 ? '...' : '');
            }
            if (element.title) return element.title;
            return element.tagName.toLowerCase();
        }
    }

    // Initialize
    window.elementInspector = new ElementInspector();
    window.elementInspector.init();

  } else {
    console.warn("[ElementInspector] Already initialized.");
  }