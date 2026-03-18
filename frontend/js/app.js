/**
 * PropSafe — Main App Bootstrap (app.js)
 * Handles tab routing, initialization, global event wiring.
 */
import { initUploadZone, runFraudAnalysis }  from './fraudDetection.js';
import { loadLawyers, initChat }              from './lawyerMarketplace.js';
import { runPricePredictor }                  from './pricePredictor.js';

/* ─── Tab Switching ─── */
const TABS = ['fraud', 'lawyers', 'price'];

let lawyersLoaded = false;

window.switchTab = function(tabId) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.remove('active');
    document.getElementById(`content-${t}`)?.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`)?.classList.add('active');
  const content = document.getElementById(`content-${tabId}`);
  if (content) {
    content.classList.add('active');
    // Auto-load lawyers on first visit
    if (tabId === 'lawyers' && !lawyersLoaded) {
      lawyersLoaded = true;
      loadLawyers();
    }
  }
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Navbar tab buttons
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
      // Sync navbar active
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Tab content nav buttons (within hero/tab nav strip)
  document.querySelectorAll('[data-tab-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tabBtn;
      switchTab(tab);
    });
  });

  // Upload zone
  initUploadZone();

  // Fraud analysis form
  document.getElementById('analyzeBtn')?.addEventListener('click', runFraudAnalysis);

  // Lawyer filters
  document.getElementById('findLawyersBtn')?.addEventListener('click', () => {
    loadLawyers();
  });

  // Price predictor
  document.getElementById('predictBtn')?.addEventListener('click', runPricePredictor);

  // Chat init (deferred so DOM is ready)
  initChat();

  // Default tab
  document.getElementById('tab-fraud')?.classList.add('active');
  document.getElementById('content-fraud')?.classList.add('active');

  // Sync navbar on tab switch
  function syncNavbar(tabId) {
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
  }

  // Override switchTab to also sync navbar
  const _switchTab = window.switchTab;
  window.switchTab = function(tabId) {
    _switchTab(tabId);
    syncNavbar(tabId);
  };
});
