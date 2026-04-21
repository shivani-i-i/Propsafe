/**
 * PropSafe — Main App Bootstrap (app.js)
 * Handles tab routing, initialization, global event wiring.
 */
import { initUploadZone, runFraudAnalysis }  from './fraudDetection.js';
import { loadLawyers, initChat }              from './lawyerMarketplace.js';
import { runPricePredictor, runLoanMatcher }  from './pricePredictor.js';
import { runMunicipalVerification }            from './verifyProperty.js?v=20260421';
import { runAgenticReview }                    from './agenticReview.js';
import { fetchDashboardStats, getMockDashboardStats } from './api.js';

/* ─── Tab Switching ─── */
const TABS = ['home', 'fraud', 'lawyers', 'price', 'verify', 'gps'];

let lawyersLoaded = false;
let countersAnimated = false;

function animateCounter(id, target, duration = 1000) {
  const node = document.getElementById(id);
  if (!node) return;

  const start = performance.now();
  const from = 0;
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(from + (target - from) * progress);
    node.textContent = value.toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

async function runDashboardCounters() {
  if (countersAnimated) return;

  let stats;
  try {
    stats = await fetchDashboardStats();
  } catch (_) {
    stats = getMockDashboardStats();
  }

  countersAnimated = true;
  animateCounter('counterScans', Number(stats.totalScans || 0), 1200);
  animateCounter('counterFraud', Number(stats.fraudCasesDetected || 0), 1400);
  animateCounter('counterLawyers', Number(stats.lawyersConnected || 0), 1300);
}

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
    if (tabId === 'home') {
      runDashboardCounters();
    }
  }
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Navbar tab buttons
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      window.switchTab(tab);
      // Sync navbar active
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Tab content nav buttons (within hero/tab nav strip)
  document.querySelectorAll('[data-tab-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tabBtn;
      window.switchTab(tab);
    });
  });

  // Upload zone
  initUploadZone();

  // Fraud analysis form
  document.getElementById('analyzeBtn')?.addEventListener('click', runFraudAnalysis);
  document.getElementById('agentEvaluateBtn')?.addEventListener('click', runAgenticReview);

  // Lawyer filters
  document.getElementById('findLawyersBtn')?.addEventListener('click', () => {
    loadLawyers();
  });

  // Price predictor
  document.getElementById('predictBtn')?.addEventListener('click', runPricePredictor);
  document.getElementById('loanMatchBtn')?.addEventListener('click', runLoanMatcher);

  // Municipal verification
  document.getElementById('verifyPropertyBtn')?.addEventListener('click', runMunicipalVerification);
  document.getElementById('registrationNumber')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runMunicipalVerification();
    }
  });

  // Dashboard CTA
  document.getElementById('startScanBtn')?.addEventListener('click', () => {
    window.switchTab('fraud');
  });
  document.getElementById('openGpsSurveyBtn')?.addEventListener('click', () => {
    window.switchTab('gps');
    const gpsSection = document.getElementById('content-gps');
    if (gpsSection) {
      requestAnimationFrame(() => {
        gpsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  // Chat init (deferred so DOM is ready)
  initChat();

  // Default tab
  document.getElementById('tab-home')?.classList.add('active');
  document.getElementById('content-home')?.classList.add('active');
  runDashboardCounters();

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
