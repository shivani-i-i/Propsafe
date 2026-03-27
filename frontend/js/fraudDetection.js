/**
 * PropSafe — Fraud Detection Module (Tab 1)
 */
import { analyzeFraud, getMockFraudResult } from './api.js';
import { extractDocumentData, getMockOCRResult } from './api.js';
import { showToast } from './toast.js';

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
    ['buyerName', 'sellerName', 'transactionDate', 'propertyValue'].forEach((fieldId) => {
      showAutofillBadge(fieldId, false);
    });
    const allFiles = Array.from(files);
    allFiles.forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'file-chip animate-fade-in';
      chip.innerHTML = `📄 ${f.name} <span style="cursor:pointer;opacity:0.6;" data-name="${f.name}">×</span>`;
      chip.querySelector('span').addEventListener('click', () => chip.remove());
      list.appendChild(chip);
    });

    if (allFiles.length > 0) {
      runOCRExtraction(allFiles[0], list);
    }
  }
}

function parsePropertyValueToLakhs(value) {
  if (!value) return '';
  const number = Number(String(value).replace(/[₹,\s]/g, ''));
  if (Number.isNaN(number)) return '';
  if (number > 100000) return Math.round((number / 100000) * 100) / 100;
  return number;
}

function showAutofillBadge(fieldId, visible) {
  const badge = document.getElementById(`badge-${fieldId}`);
  if (!badge) return;
  badge.style.display = visible ? 'inline-flex' : 'none';
}

function applyExtractedField(fieldId, value, transform = (x) => x) {
  const input = document.getElementById(fieldId);
  if (!input || !value) return;
  input.value = transform(value);
  showAutofillBadge(fieldId, true);
}

async function runOCRExtraction(file, listNode) {
  const loading = document.createElement('div');
  loading.className = 'file-chip animate-fade-in';
  loading.id = 'ocrLoadingChip';
  loading.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Extracting document data...`;
  listNode.appendChild(loading);

  let data;
  try {
    data = await extractDocumentData(file);
    showToast('Document data extracted successfully.', 'success');
  } catch (error) {
    const message = String(error?.message || '');
    const isActionableInputError = /No extractable text found in PDF|Only image or PDF files are supported|Document file is required/i.test(message);
    if (isActionableInputError) {
      loading.remove();
      showToast(message, 'error');
      return;
    }

    await sleep(1200);
    data = getMockOCRResult(file.name);
    showToast('OCR service unavailable. Using fallback extraction.', 'warning');
  }

  loading.remove();

  const fields = data?.extractedFields || {};
  applyExtractedField('buyerName', fields.buyerName);
  applyExtractedField('sellerName', fields.sellerName);
  applyExtractedField('transactionDate', fields.transactionDate);
  applyExtractedField('propertyValue', fields.propertyValue, parsePropertyValueToLakhs);
}

/* ─── Form collect ─── */
function collectFormData() {
  return {
    propertyType:       document.getElementById('propertyType')?.value || '',
    location:           document.getElementById('location')?.value || '',
    buyerName:          document.getElementById('buyerName')?.value || '',
    sellerName:         document.getElementById('sellerName')?.value || '',
    transactionDate:    document.getElementById('transactionDate')?.value || '',
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

  if (!btn || !resultArea) {
    showToast('Fraud analysis UI is not ready. Please refresh and try again.', 'error');
    return;
  }

  const formData   = collectFormData();

  if (!formData.location.trim()) {
    showToast('Please enter the property city and location.', 'warning');
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
    showToast('Fraud analysis completed successfully.', 'success');
  } catch (err) {
    // Use mock fallback
    await sleep(3500);
    data = getMockFraudResult(formData);
    showToast('AI analysis unavailable. Showing fallback result.', 'warning');
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
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
  const ringColor = riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#22c55e';

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

  const checklistItems = (flags || []).map(f => `
    <label class="flag-check-item">
      <input type="checkbox" checked disabled />
      <span><strong>${f.name}</strong> — ${f.desc}</span>
    </label>
  `).join('');

  const detailsId = `riskDetails-${Date.now()}`;
  const toggleId = `riskToggle-${Date.now()}`;
  const pdfBtnId = `downloadPdf-${Date.now()}`;

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
          <div class="risk-score-circle ${riskClass} ${riskLevel === 'high' ? 'high-risk-pulse' : ''}">
            <div class="score-ring progress-ring" style="--progress:${safeScore};--ring-color:${ringColor};"></div>
            <div class="score-num" id="riskScoreNum">0</div>
            <div class="score-label">/ 100</div>
          </div>
          <div class="risk-meta">
            <span class="pill ${pillClass} risk-badge">${riskLabel}</span>
            <div class="risk-title">${getRiskTitle(riskLevel)}</div>
            <div class="risk-summary">${summary}</div>
          </div>
        </div>
      </div>

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

        <div class="details-toggle-wrap">
          <button class="btn btn-outline btn-sm" id="${toggleId}">View Details</button>
          <button class="btn btn-primary btn-sm" id="${pdfBtnId}">Download Report as PDF</button>
        </div>

        <div class="risk-details-panel" id="${detailsId}">
          <div class="section-title" style="margin-bottom:8px;">🚩 Red Flags Checklist</div>
          ${checklistItems || '<div class="muted">No red flags detected.</div>'}
          ${flags && flags.length ? `<div class="flags-grid stagger" style="margin-top:12px;">${flagCards}</div>` : ''}
        </div>

        ${connectBtn}
      </div>
    </div>`;

  animateRiskScore(safeScore);

  const detailsPanel = document.getElementById(detailsId);
  const toggleBtn = document.getElementById(toggleId);
  const pdfBtn = document.getElementById(pdfBtnId);

  toggleBtn?.addEventListener('click', () => {
    const isOpen = detailsPanel.classList.toggle('open');
    toggleBtn.textContent = isOpen ? 'Hide Details' : 'View Details';
  });

  pdfBtn?.addEventListener('click', () => {
    const jsPDFLib = window.jspdf?.jsPDF;
    if (!jsPDFLib) {
      showToast('PDF library not available.', 'error');
      return;
    }

    const doc = new jsPDFLib();
    let y = 16;
    const lineGap = 8;
    const generatedAt = new Date().toLocaleString('en-IN');
    const badgeText = `RISK: ${riskLabel || 'UNKNOWN'}`;
    const badgeColor = riskLevel === 'high'
      ? [239, 68, 68]
      : riskLevel === 'medium'
        ? [245, 158, 11]
        : [34, 197, 94];

    doc.setFillColor(3, 7, 15);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(0, 212, 170);
    doc.setFontSize(18);
    doc.text('PropSafe', 14, 14);
    doc.setTextColor(226, 232, 240);
    doc.setFontSize(10);
    doc.text('AI Property Fraud Risk Report', 14, 21);
    doc.setTextColor(143, 163, 188);
    doc.text(`Generated: ${generatedAt}`, 140, 21);

    doc.setFillColor(...badgeColor);
    doc.roundedRect(140, 8, 55, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(badgeText, 167.5, 14, { align: 'center' });

    y = 36;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('PropSafe Fraud Risk Report', 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.text(`Risk Score: ${safeScore}/100`, 14, y); y += lineGap;
    doc.text(`Risk Level: ${riskLabel}`, 14, y); y += lineGap;

    const summaryLines = doc.splitTextToSize(`Summary: ${summary}`, 180);
    doc.text(summaryLines, 14, y); y += summaryLines.length * 6 + 4;

    doc.text('Red Flags:', 14, y); y += lineGap;
    if (flags && flags.length) {
      flags.forEach((f) => {
        const lines = doc.splitTextToSize(`- ${f.name}: ${f.desc}`, 180);
        doc.text(lines, 14, y);
        y += lines.length * 6 + 2;
        if (y > 270) { doc.addPage(); y = 16; }
      });
    } else {
      doc.text('- None', 14, y);
      y += lineGap;
    }

    const recLines = doc.splitTextToSize(`Recommendation: ${recommendation}`, 180);
    if (y > 250) { doc.addPage(); y = 16; }
    doc.text(recLines, 14, y); y += recLines.length * 6 + 4;

    const actionLines = doc.splitTextToSize(`Immediate Action: ${immediateAction}`, 180);
    if (y > 250) { doc.addPage(); y = 16; }
    doc.text(actionLines, 14, y);

    doc.setFontSize(9);
    doc.setTextColor(90, 112, 144);
    doc.text('Confidential • Generated by PropSafe', 14, 288);

    doc.save(`propsafe-fraud-report-${Date.now()}.pdf`);
    showToast('Fraud report PDF downloaded.', 'success');
  });
}

function animateRiskScore(target) {
  const el = document.getElementById('riskScoreNum');
  if (!el) return;
  const startTime = performance.now();
  const duration = 900;

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const current = Math.round(target * progress);
    el.textContent = String(current);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function getRiskTitle(level) {
  return {
    low:    'This Property Appears Relatively Safe',
    medium: 'Proceed With Caution — Investigation Required',
    high:   'HIGH DANGER — Do Not Proceed',
  }[level] || 'Analysis Complete';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
