// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

// Mock window.location
delete window.location;
window.location = { pathname: '/c/123/my-card' };

// Import functions
const { getChecklistKey, setAllChecklistsState, checkAllChecklistsState } = require('../content');

describe('Checklist Collapse Functionality', () => {
  let mockChrome;
  
  beforeEach(() => {
    // Setup mock DOM
    document.body.innerHTML = `
      <div data-testid="checklist-container">
        <button class="collapse-all-button">Collapse All ▼</button>
        <div data-testid="checklist-section" data-checklist-item-id="123">
          <div data-testid="checklist-title">Test Checklist 1</div>
          <button class="checklist-collapse-button">▼</button>
          <div data-testid="checklist-items">Items 1</div>
        </div>
        <div data-testid="checklist-section" data-checklist-item-id="456">
          <div data-testid="checklist-title">Test Checklist 2</div>
          <button class="checklist-collapse-button">▼</button>
          <div data-testid="checklist-items">Items 2</div>
        </div>
      </div>
    `;

    // Reset Chrome API mocks
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      }
    };
    global.chrome = mockChrome;
  });

  describe('getChecklistKey', () => {
    it('generates correct key from checklist data', () => {
      const checklist = document.querySelector('[data-testid="checklist-section"]');
      const key = getChecklistKey(checklist);
      expect(key).toContain('123');
      expect(key).toContain('Test Checklist 1');
    });
  });

  describe('setAllChecklistsState', () => {
    it('collapses all checklists when collapsed is true', async () => {
      mockChrome.storage.sync.set.mockResolvedValue();
      
      await setAllChecklistsState(true);
      
      const items = document.querySelectorAll('[data-testid="checklist-items"]');
      items.forEach(item => {
        expect(item.style.display).toBe('none');
      });
      
      const buttons = document.querySelectorAll('.checklist-collapse-button');
      buttons.forEach(button => {
        expect(button.innerHTML).toBe('▶');
      });
      
      const collapseAllButton = document.querySelector('.collapse-all-button');
      expect(collapseAllButton.innerHTML).toBe('Expand All ▶');
    });

    it('expands all checklists when collapsed is false', async () => {
      mockChrome.storage.sync.set.mockResolvedValue();
      
      await setAllChecklistsState(false);
      
      const items = document.querySelectorAll('[data-testid="checklist-items"]');
      items.forEach(item => {
        expect(item.style.display).toBe('');
      });
      
      const buttons = document.querySelectorAll('.checklist-collapse-button');
      buttons.forEach(button => {
        expect(button.innerHTML).toBe('▼');
      });
      
      const collapseAllButton = document.querySelector('.collapse-all-button');
      expect(collapseAllButton.innerHTML).toBe('Collapse All ▼');
    });
  });

  describe('checkAllChecklistsState', () => {
    it('updates collapse-all button to Expand All when all checklists are collapsed', async () => {
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        callback({ [key]: true });
      });

      await checkAllChecklistsState();
      
      const collapseAllButton = document.querySelector('.collapse-all-button');
      expect(collapseAllButton.innerHTML).toBe('Expand All ▶');
    });

    it('updates collapse-all button to Collapse All when all checklists are expanded', async () => {
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        callback({ [key]: false });
      });

      await checkAllChecklistsState();
      
      const collapseAllButton = document.querySelector('.collapse-all-button');
      expect(collapseAllButton.innerHTML).toBe('Collapse All ▼');
    });

    it('handles mixed states correctly', async () => {
      let callCount = 0;
      mockChrome.storage.sync.get.mockImplementation((key, callback) => {
        // First checklist collapsed, second expanded
        callback({ [key]: callCount++ === 0 });
      });

      await checkAllChecklistsState();
      
      const collapseAllButton = document.querySelector('.collapse-all-button');
      expect(collapseAllButton.innerHTML).toBe('Collapse All ▼');
    });
  });
});
