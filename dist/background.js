chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    try {
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return false;
});
