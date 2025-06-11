// Get a unique key for the checklist based on its title
function getChecklistKey(checklist) {
  const titleElement = checklist.querySelector('[data-testid="checklist-title"]');
  const cardId = window.location.pathname.split('/').pop(); // Get card ID from URL
  const title = titleElement ? titleElement.textContent : '';
  return `trello-checklist-state-${cardId}-${title}`;
}

// Save collapse state to Chrome storage
function saveCollapseState(key, isCollapsed) {
  chrome.storage.sync.set({ [key]: isCollapsed });
}

// Load collapse state from Chrome storage
async function loadCollapseState(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      resolve(result[key] || false);
    });
  });
}

// Apply collapse state to a checklist
async function applyCollapseState(checklist, collapseButton, itemsContainer, addItemForm) {
  const key = getChecklistKey(checklist);
  const isCollapsed = await loadCollapseState(key);
  
  if (isCollapsed) {
    itemsContainer.style.display = 'none';
    if (addItemForm) addItemForm.style.display = 'none';
    collapseButton.innerHTML = '▶';
  } else {
    itemsContainer.style.display = '';
    if (addItemForm) addItemForm.style.display = '';
    collapseButton.innerHTML = '▼';
  }
}

function addCollapseButtons() {
  const checklists = document.querySelectorAll('[data-testid="checklist-container"]');
  
  checklists.forEach(checklist => {
    // Only add button if it doesn't already exist
    if (!checklist.querySelector('.checklist-collapse-button')) {
      const header = checklist.querySelector('[data-testid="checklist-title-container"]');
      const itemsContainer = checklist.querySelector('[data-testid="checklist-items"]');
      const addItemForm = checklist.querySelector('.N5YqpPOcg1ZKKO');
      
      if (header && itemsContainer) {
        const collapseButton = document.createElement('button');
        collapseButton.className = 'checklist-collapse-button';
        collapseButton.innerHTML = '▼';
        collapseButton.title = 'Collapse/Expand Checklist';
        collapseButton.setAttribute('type', 'button');
        
        collapseButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const isCollapsed = itemsContainer.style.display === 'none';
          const key = getChecklistKey(checklist);
          
          if (isCollapsed) {
            itemsContainer.style.display = '';
            if (addItemForm) addItemForm.style.display = '';
            collapseButton.innerHTML = '▼';
            saveCollapseState(key, false);
          } else {
            itemsContainer.style.display = 'none';
            if (addItemForm) addItemForm.style.display = 'none';
            collapseButton.innerHTML = '▶';
            saveCollapseState(key, true);
          }
        });
        
        // Insert after the title
        header.parentNode.insertBefore(collapseButton, header.nextSibling);
        
        // Load and apply saved state
        applyCollapseState(checklist, collapseButton, itemsContainer, addItemForm);
      }
    }
  });
}

// Run initially and set up observer
addCollapseButtons();

// Create an observer to watch for dynamically added checklists
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const addedNodes = Array.from(mutation.addedNodes);
    const hasChecklist = addedNodes.some(node => 
      node.nodeType === 1 && (
        node.matches('[data-testid="checklist-container"]') ||
        node.querySelector('[data-testid="checklist-container"]')
      )
    );
    
    if (hasChecklist) {
      addCollapseButtons();
      break;
    }
  }
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});
