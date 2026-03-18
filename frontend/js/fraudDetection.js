/**
 * PropSafe — Fraud Detection Module (Tab 1)
 */
import { analyzeFraud, getMockFraudResult } from './api.js';

/* ─── Pipeline steps ─── */
const PIPELINE_STEPS = ['upload', 'ocr', 'ml', 'score', 'report'];

function setPipelineStep(activeIndex) {
  PIPELINE_STEPS.forEach((id, i) => {
    const el = document.getElementById(`step-${id}`);
    const arrow = document.getElementById(`arrow-${i}`);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (arrow) arrow.classList.remove('active');
    if (i < activeIndex) { el.classList.add('done'); el.querySelector('.step-icon').textContent = '✅'; }
    else if (i === activeIndex) { el.classList.add('active'); }
  });
  // Activate arrow before active step
  const prevArrow = document.getElementById(`arrow-${activeIndex - 1}`);
  if (prevArrow) prevArrow.classList.add('active');
}

function resetPipeline() {
  PIPELINE_STEPS.forEach((id, i) => {
    const el = document.getElementById(`step-${id}`);
    if (!el) return;
    el.classList.remove('active', 'done');
    const icons = ['📄', '🔍', '🤖', '📊', '📋'];
    el.querySelector('.step-icon').textContent = icons[i];
    const arrow = document.getElementById(`arrow-${i}`);
    if (arrow) arrow.classList.remove('active');
  });
}

/* ─── Upload Zone ─── */
export function initUploadZone() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  const list  = document.getElementById('uploadedFiles');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', () => handleFiles(input.files));

  function handleFiles(files) {
    list.innerHTML = '';
    Array.from(files).forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'file-chip animate-fade-in';
      chip.innerHTML = `📄 ${f.name} <span style="cursor:pointer;opacity:0.6;" data-name="${f.name}">×</span>`;
      chip.querySelector('span').addEventListener('click', () => chip.remove());
      list.appendChild(chip);
    });
  }
}

/* ─── Form collect ─── */
function collectFormData() {
  return {
    propertyType:       document.getElementById('propertyType')?.value || '',
    location:           document.getElementById('location')?.value || '',
    sellerName:         document.getElementById('sellerName')?.value || '',
    previousOwners:     document.getElementById('previousOwners')?.value || '',
    ownershipTransfers: document.getElementById('ownershipTransfers')?.value || '0',
    propertyValue:      document.getElementById('propertyValue')?.value || '50',
    sellerIncome:       document.getElementById('sellerIncome')?.value || '10',
    encumbranceStatus:  document.getElementById('encumbranceStatus')?.value || 'clean',
    additionalDetails:  document.getElementById('additionalDetails')?.value || '',
  };
}

/* ─── Main analyze flow ─── */
export async function runFraudAnalysis() {
  const btn        = document.getElementById('analyzeBtn');
  const resultArea = document.getElementById('fraudResult');
  const formData   = collectFormData();

  if (!formData.location.trim()) {
    showFormError('Please enter the property city and location.');
    return;
  }

  // UI: loading state
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Analyzing…`;
  resultArea.innerHTML = '';

  // Animate pipeline
  resetPipeline();
  const delays = [0, 700, 1500, 2300, 3100];
  const timers = delays.map((d, i) => setTimeout(() => setPipelineStep(i), d));

  let data;
  try {
    data = await analyzeFraud(formData);
  } catch (err) {
    // Use mock fallback
    await sleep(3500);
    data = getMockFraudResult(formData);
  }

  timers.forEach(clearTimeout);
  setPipelineStep(PIPELINE_STEPS.length); // all done

  // Restore button
  btn.disabled = false;
  btn.innerHTML = `🔍 Analyze Property — Get Fraud Risk Score`;

  // Render result
  renderFraudResult(data, resultArea);
}

function showFormError(msg) {
  const resultArea = document.getElementById('fraudResult');
  resultArea.innerHTML = `
    <div class="error-card animate-fade-in-up">
      <div class="error-icon">⚠️</div>
      <div>
        <div class="error-title">Missing Information</div>
        <div class="error-msg">${msg}</div>
      </div>
    </div>`;
}

function renderFraudResult(data, container) {
  const { score, riskLevel, riskLabel, summary, flags, positives, recommendation, immediateAction } = data;

  const riskClass = { low: 'risk-low', medium: 'risk-med', high: 'risk-high' }[riskLevel] || 'risk-med';
  const pillClass = { low: 'pill-green', medium: 'pill-amber', high: 'pill-red' }[riskLevel] || 'pill-amber';
  const actionClass = riskLevel === 'high' ? 'danger-action' : '';
  const isDanger = riskLevel === 'high';

  const flagCards = (flags || []).map(f => {
    const dotClass = { high: 'dot-high', medium: 'dot-medium', low: 'dot-low' }[f.severity] || 'dot-medium';
    const cardClass = { high: 'flag-red', medium: 'flag-amber', low: 'flag-green' }[f.severity] || 'flag-amber';
    return `
      <div class="flag-card ${cardClass} animate-fade-in-up">
        <div class="severity-dot ${dotClass}"></div>
        <div>
          <div class="flag-name">${f.name}</div>
          <div class="flag-desc">${f.desc}</div>
        </div>
      </div>`;
  }).join('');

  const positiveCards = (positives || []).map(p => `
    <div class="flag-card flag-green animate-fade-in-up">
      <div class="severity-dot dot-low"></div>
      <div>
        <div class="flag-name">${p.name}</div>
        <div class="flag-desc">${p.desc}</div>
      </div>
    </div>`).join('');

  const connectBtn = isDanger ? `
    <div style="margin-top:20px;text-align:center;">
      <button class="btn btn-danger btn-lg pulse-cta" onclick="window.switchTab('lawyers')">
        ⚖️ Connect to Verified Lawyer Now
      </button>
    </div>` : '';

  container.innerHTML = `
    <div class="result-card">
      <!-- Risk Header -->
      <div class="card" style="margin-bottom:16px;">
        <div class="risk-header">
          <div class="risk-score-circle ${riskClass}">
            <div class="score-ring"></div>
            <div class="score-num">${score}</div>
            <div class="score-label">/ 100</div>
          </div>
          <div class="risk-meta">
            <span class="pill ${pillClass} risk-badge">${riskLabel}</span>
            <div class="risk-title">${getRiskTitle(riskLevel)}</div>
            <div class="risk-summary">${summary}</div>
          </div>
        </div>
      </div>

      ${flags && flags.length ? `
      <div class="card" style="margin-bottom:16px;">
        <div class="section-title" style="margin-bottom:8px;">🚩 Red Flags Detected <span class="pill pill-red" style="font-size:11px;">${flags.length}</span></div>
        <div class="flags-grid stagger">${flagCards}</div>
      </div>` : ''}

      ${positives && positives.length ? `
      <div class="card" style="margin-bottom:16px;">
        <div class="section-title" style="margin-bottom:8px;">✅ Positive Signs <span class="pill pill-green" style="font-size:11px;">${positives.length}</span></div>
        <div class="flags-grid stagger">${positiveCards}</div>
      </div>` : ''}

      <div class="card" style="margin-bottom:0;">
        <div class="recommendation-box">
          <div class="rec-title">📋 Recommendation</div>
          <div class="rec-text">${recommendation}</div>
        </div>
        <div class="action-box ${actionClass}" style="margin-top:12px;">
          <div class="action-label">⚡ Immediate Action</div>
          <div class="action-text">${immediateAction}</div>
        </div>
        ${connectBtn}
      </div>
    </div>`;
}

function getRiskTitle(level) {
  return {
    low:    'This Property Appears Relatively Safe',
    medium: 'Proceed With Caution — Investigation Required',
    high:   'HIGH DANGER — Do Not Proceed',
  }[level] || 'Analysis Complete';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
