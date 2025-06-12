require('@testing-library/jest-dom');

// Set up DOM environment
document.body.innerHTML = `
  <div data-testid="checklist-container">
    <div data-testid="checklist-section" data-checklist-item-id="123">
      <div data-testid="checklist-title">Test Checklist 1</div>
      <div data-testid="checklist-items">Items 1</div>
    </div>
    <div data-testid="checklist-section" data-checklist-item-id="456">
      <div data-testid="checklist-title">Test Checklist 2</div>
      <div data-testid="checklist-items">Items 2</div>
    </div>
  </div>
`;
