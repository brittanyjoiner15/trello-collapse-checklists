// Get a unique key for the checklist based on its title and card ID
function getChecklistKey(checklist) {
  const titleElement = checklist.querySelector('[data-testid="checklist-title"]');
  // Extract card ID from URL - look for /c/ in the path which indicates a card
  const pathParts = window.location.pathname.split('/');
  const cardIdIndex = pathParts.indexOf('c') + 1;
  const cardId = cardIdIndex > 0 && cardIdIndex < pathParts.length ? pathParts[cardIdIndex] : '';

  // Get checklist ID from the container if available
  const checklistId = checklist.getAttribute('data-checklist-item-id') || '';
  const title = titleElement ? titleElement.textContent.trim() : '';

  // Use both card ID and checklist ID for more reliable state persistence
  return `trello-checklist-state-${cardId}-${checklistId}-${title}`;
}

// Track button clicks and show popup when needed
async function trackButtonClick() {
  try {
    // Check if extension context is still valid
    if (!chrome.runtime) {
      console.log('Extension context invalidated, reloading page...');
      window.location.reload();
      return;
    }

    const data = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['buttonClickCount'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result);
      });
    });

    const currentCount = (data.buttonClickCount || 0) + 1;
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set({ buttonClickCount: currentCount }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });

    // Show popup every 25 clicks
    if (currentCount % 25 === 0) {
      await showSupportPopup();
    }
  } catch (error) {
    console.error('Error tracking button click:', error);
    // If we get an invalidated context error, reload the page
    if (error.message.includes('Extension context invalidated')) {
      window.location.reload();
    }
  }
}

// Show the extension popup
async function showSupportPopup() {
  try {
    if (!chrome.runtime) {
      throw new Error('Extension context invalidated');
    }
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'openPopup' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });
  } catch (error) {
    console.error('Error showing popup:', error);
    if (error.message.includes('Extension context invalidated')) {
      window.location.reload();
    }
  }
}

// Save collapse state to Chrome storage
function saveCollapseState(key, isCollapsed) {
  chrome.storage.sync.set({ [key]: isCollapsed }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving state:', chrome.runtime.lastError);
    } else {
      console.debug('Saved state:', { key, isCollapsed });
    }
  });
}

// Load collapse state from Chrome storage
async function loadCollapseState(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading state:', chrome.runtime.lastError);
        resolve(false);
      } else {
        console.debug('Loaded state:', { key, state: result[key] });
        resolve(result[key] || false);
      }
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

// Check if all checklists are in the same state (all collapsed or all expanded)
async function checkAllChecklistsState() {
  const checklists = document.querySelectorAll('[data-testid="checklist-section"]');
  let allCollapsed = true;
  let allExpanded = true;

  for (const checklist of checklists) {
    const key = getChecklistKey(checklist);
    const isCollapsed = await loadCollapseState(key);

    if (isCollapsed) {
      allExpanded = false;
    } else {
      allCollapsed = false;
    }

    // If we find both collapsed and expanded, we can stop checking
    if (!allCollapsed && !allExpanded) break;
  }

  const collapseAllButton = document.querySelector('.collapse-all-button');
  if (collapseAllButton) {
    if (allCollapsed) {
      collapseAllButton.innerHTML = 'Expand All ▶';
    } else if (allExpanded) {
      collapseAllButton.innerHTML = 'Collapse All ▼';
    } else {
      // Mixed state - show the more common action
      collapseAllButton.innerHTML = 'Collapse All ▼';
    }
  }
}

function addCollapseAllButton() {
  // Only add if it doesn't exist yet
  if (!document.querySelector('.collapse-all-button')) {
    const firstChecklistContainer = document.querySelector('[data-testid="checklist-container"]');
    if (firstChecklistContainer) {
      const collapseAllButton = document.createElement('button');
      collapseAllButton.className = 'collapse-all-button';
      collapseAllButton.innerHTML = 'Collapse All ▼';
      collapseAllButton.title = 'Collapse/Expand All Checklists';
      collapseAllButton.setAttribute('type', 'button');

      collapseAllButton.addEventListener('click', async () => {
        await trackButtonClick();
        const isCollapsed = collapseAllButton.innerHTML.includes('▼');
        await setAllChecklistsState(isCollapsed);
        // Force a recheck of states after a short delay to ensure UI is in sync
        setTimeout(() => checkAllChecklistsState(), 100);
      });

      firstChecklistContainer.parentNode.insertBefore(collapseAllButton, firstChecklistContainer);
    }
  }
}

async function setAllChecklistsState(collapsed) {
  const checklists = document.querySelectorAll('[data-testid="checklist-section"]');
  const updates = [];

  for (const checklist of checklists) {
    const collapseButton = checklist.querySelector('.checklist-collapse-button');
    const itemsContainer = checklist.querySelector('[data-testid="checklist-items"]');
    const addItemForm = checklist.querySelector('.N5YqpPOcg1ZKKO');
    const key = getChecklistKey(checklist);

    if (collapseButton && itemsContainer) {
      // First save the state
      updates.push(saveCollapseState(key, collapsed));

      // Then update UI
      itemsContainer.style.display = collapsed ? 'none' : '';
      if (addItemForm) addItemForm.style.display = collapsed ? 'none' : '';
      collapseButton.innerHTML = collapsed ? '▶' : '▼';
    }
  }

  // Wait for all state updates to complete
  await Promise.all(updates);

  // Update collapse-all button state
  const collapseAllButton = document.querySelector('.collapse-all-button');
  if (collapseAllButton) {
    if (collapsed) {
      collapseAllButton.innerHTML = 'Expand All ▶';
    } else {
      collapseAllButton.innerHTML = 'Collapse All ▼';
    }
  }
}

function addCollapseButtons() {
  addCollapseAllButton();
  const checklists = document.querySelectorAll('[data-testid="checklist-section"]');

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

        collapseButton.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Toggle based on current state
          const key = getChecklistKey(checklist);
          const currentState = await loadCollapseState(key);
          const newState = !currentState;

          // Update UI
          itemsContainer.style.display = newState ? 'none' : '';
          if (addItemForm) addItemForm.style.display = newState ? 'none' : '';
          collapseButton.innerHTML = newState ? '▶' : '▼';

          // Save new state
          await saveCollapseState(key, newState);
          await trackButtonClick();
          await checkAllChecklistsState();
        });

        // Insert after the title
        header.parentNode.insertBefore(collapseButton, header.nextSibling);

        // Load and apply saved state
        applyCollapseState(checklist, collapseButton, itemsContainer, addItemForm);
      }
    }
  });

  // Check initial state of all checklists
  checkAllChecklistsState();
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

// Export functions for testing
module.exports = {
  getChecklistKey,
  setAllChecklistsState,
  checkAllChecklistsState
};
