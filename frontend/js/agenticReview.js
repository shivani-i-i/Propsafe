import { evaluatePropertyAgent, getMockAgenticEvaluation } from './api.js';
import { showToast } from './toast.js';

let activeSessionId = null;
let lastAgentResult = null;
const AGENT_HISTORY_KEY = 'propsafe_agentic_history_v1';
const AGENT_HISTORY_LIMIT = 8;

function toComparableResult(result = {}) {
  const memoryTime = result?.memory?.updatedAt || new Date().toISOString();
  return {
    sessionId: result?.sessionId || '',
    finalDecision: {
      verdict: result?.finalDecision?.verdict || 'UNKNOWN',
      actions: Array.isArray(result?.finalDecision?.actions) ? result.finalDecision.actions : []
    },
    outputs: {
      fraud: {
        riskLevel: result?.outputs?.fraud?.riskLevel || 'UNKNOWN',
        riskScore: Number(result?.outputs?.fraud?.riskScore ?? NaN)
      }
    },
    memory: {
      updatedAt: memoryTime
    }
  };
}

function readAgentHistory() {
  try {
    const raw = localStorage.getItem(AGENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeAgentHistory(history = []) {
  try {
    localStorage.setItem(AGENT_HISTORY_KEY, JSON.stringify(history.slice(0, AGENT_HISTORY_LIMIT)));
  } catch (_) {
    // Ignore storage quota/permission errors; feature should degrade gracefully.
  }
}

function pushHistory(result) {
  const normalized = toComparableResult(result);
  const history = readAgentHistory();
  history.unshift(normalized);
  writeAgentHistory(history);
}

function initializeHistoryState() {
  const history = readAgentHistory();
  if (!history.length) return;
  lastAgentResult = history[0];
  activeSessionId = history[0]?.sessionId || activeSessionId;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectAgentFormData() {
  const propertyValueLakhs = Number(document.getElementById('propertyValue')?.value || 0);
  const sellerIncomeLakhs = Number(document.getElementById('sellerIncome')?.value || 0);
  const buyerIncomeRaw = Number(document.getElementById('buyerAnnualIncome')?.value || 0);

  return {
    sessionId: activeSessionId,
    propertyType: document.getElementById('propertyType')?.value || '',
    city: document.getElementById('location')?.value || '',
    sellerName: document.getElementById('sellerName')?.value || '',
    previousOwners: Number(document.getElementById('previousOwners')?.value || 0),
    transfersLastTwoYears: Number(document.getElementById('ownershipTransfers')?.value || 0),
    propertyValue: Math.round(propertyValueLakhs * 100000),
    sellerIncome: Math.round(sellerIncomeLakhs * 100000),
    buyerIncome: buyerIncomeRaw > 0 ? Math.round(buyerIncomeRaw) : Math.round(sellerIncomeLakhs * 100000),
    encumbranceStatus: document.getElementById('encumbranceStatus')?.value || 'clean',
    registrationNumber: document.getElementById('registrationNumber')?.value?.trim() || '',
    additionalDetails: document.getElementById('additionalDetails')?.value || ''
  };
}

function verdictTone(verdict = '') {
  const normalized = String(verdict).toUpperCase();
  if (normalized === 'HOLD') return { pill: 'pill-red', title: 'Stop & Investigate', icon: '🚨' };
  if (normalized === 'CAUTION') return { pill: 'pill-amber', title: 'Proceed Carefully', icon: '⚠️' };
  return { pill: 'pill-green', title: 'Clear to Proceed', icon: '✅' };
}

function renderPlan(plan = []) {
  return plan.map((step, index) => `
    <div class="agent-plan-item">
      <div class="agent-plan-index">${index + 1}</div>
      <div class="agent-plan-text">${escapeHtml(step)}</div>
    </div>
  `).join('');
}

function renderTrace(trace = []) {
  return trace.map((item) => `
    <div class="agent-trace-item">
      <div class="agent-trace-step">${escapeHtml(item.step || 'step')}</div>
      <div class="agent-trace-observation">${escapeHtml(item.observation || '')}</div>
    </div>
  `).join('');
}

function renderActions(actions = []) {
  if (!actions.length) {
    return '<div class="agent-muted">No immediate actions returned.</div>';
  }

  return actions.map((action) => `<div class="agent-action-item">• ${escapeHtml(action)}</div>`).join('');
}

function scoreDelta(currentScore, previousScore) {
  const current = Number(currentScore);
  const previous = Number(previousScore);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 'n/a';
  const delta = current - previous;
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function renderComparison(previousResult, currentResult) {
  if (!previousResult) return '';

  const prevDecision = previousResult?.finalDecision?.verdict || 'UNKNOWN';
  const currDecision = currentResult?.finalDecision?.verdict || 'UNKNOWN';

  const prevRisk = previousResult?.outputs?.fraud?.riskLevel || 'UNKNOWN';
  const currRisk = currentResult?.outputs?.fraud?.riskLevel || 'UNKNOWN';

  const prevScore = previousResult?.outputs?.fraud?.riskScore;
  const currScore = currentResult?.outputs?.fraud?.riskScore;

  const prevActions = (previousResult?.finalDecision?.actions || []).length;
  const currActions = (currentResult?.finalDecision?.actions || []).length;

  const changed = prevDecision !== currDecision || prevRisk !== currRisk || prevScore !== currScore || prevActions !== currActions;
  const stateClass = changed ? 'agent-compare-changed' : 'agent-compare-stable';
  const stateText = changed ? 'Changed from previous run' : 'No material change from previous run';

  const prevTime = previousResult?.memory?.updatedAt ? new Date(previousResult.memory.updatedAt).toLocaleString('en-IN') : '-';
  const currTime = currentResult?.memory?.updatedAt ? new Date(currentResult.memory.updatedAt).toLocaleString('en-IN') : '-';

  return `
    <div class="agent-compare-wrap ${stateClass}">
      <div class="agent-compare-head">Run Comparison</div>
      <div class="agent-compare-note">${escapeHtml(stateText)}</div>
      <div class="agent-compare-grid">
        <div class="agent-compare-item"><span>Verdict</span><strong>${escapeHtml(prevDecision)} → ${escapeHtml(currDecision)}</strong></div>
        <div class="agent-compare-item"><span>Risk Level</span><strong>${escapeHtml(prevRisk)} → ${escapeHtml(currRisk)}</strong></div>
        <div class="agent-compare-item"><span>Risk Score Delta</span><strong>${escapeHtml(scoreDelta(currScore, prevScore))}</strong></div>
        <div class="agent-compare-item"><span>Action Count</span><strong>${prevActions} → ${currActions}</strong></div>
        <div class="agent-compare-item"><span>Previous Run</span><strong>${escapeHtml(prevTime)}</strong></div>
        <div class="agent-compare-item"><span>Current Run</span><strong>${escapeHtml(currTime)}</strong></div>
      </div>
    </div>
  `;
}

function renderRecentHistory(currentResult) {
  const history = readAgentHistory();
  if (!history.length) return '';

  const currentTime = currentResult?.memory?.updatedAt || '';
  const recent = history
    .filter((entry) => entry?.memory?.updatedAt !== currentTime)
    .slice(0, 3);

  if (!recent.length) return '';

  const rows = recent.map((entry, index) => {
    const verdict = entry?.finalDecision?.verdict || 'UNKNOWN';
    const risk = entry?.outputs?.fraud?.riskLevel || 'UNKNOWN';
    const score = entry?.outputs?.fraud?.riskScore;
    const when = entry?.memory?.updatedAt ? new Date(entry.memory.updatedAt).toLocaleString('en-IN') : '-';
    const scoreText = Number.isFinite(Number(score)) ? String(Number(score)) : '-';

    return `
      <div class="agent-history-item">
        <span>#${index + 1}</span>
        <strong>${escapeHtml(verdict)}</strong>
        <span>${escapeHtml(String(risk))}</span>
        <span>${escapeHtml(scoreText)}</span>
        <span>${escapeHtml(when)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="agent-history-wrap">
      <div class="agent-compare-head">Recent Runs</div>
      <div class="agent-history-head">
        <span>Run</span>
        <span>Verdict</span>
        <span>Risk</span>
        <span>Score</span>
        <span>Timestamp</span>
      </div>
      ${rows}
    </div>
  `;
}

function renderAgentResult(result, usedFallback = false, previousResult = null) {
  const container = document.getElementById('agenticResult');
  if (!container) return;

  const finalDecision = result?.finalDecision || {};
  const fraud = result?.outputs?.fraud || {};
  const tone = verdictTone(finalDecision.verdict);

  container.innerHTML = `
    <div class="card animate-fade-in-up">
      <div class="agent-header-row">
        <div>
          <div class="section-title" style="margin-bottom:4px;">🧠 Agentic AI Property Review</div>
          <div class="section-sub" style="margin-bottom:0;">Autonomous multi-tool run with transparent reasoning trace.</div>
        </div>
        <div style="text-align:right;">
          <div class="pill ${tone.pill}">${escapeHtml(finalDecision.verdict || 'UNKNOWN')}</div>
          <div class="agent-muted" style="margin-top:6px;">${tone.icon} ${tone.title}</div>
        </div>
      </div>

      ${usedFallback ? '<div class="agent-fallback-note">⚠️ Backend unreachable. Showing fallback agent simulation.</div>' : ''}

      <div class="agent-summary-grid">
        <div class="agent-summary-card">
          <div class="agent-muted">Risk Level</div>
          <div class="agent-summary-value">${escapeHtml(fraud.riskLevel || 'UNKNOWN')}</div>
        </div>
        <div class="agent-summary-card">
          <div class="agent-muted">Risk Score</div>
          <div class="agent-summary-value">${escapeHtml(String(fraud.riskScore ?? '-'))}</div>
        </div>
        <div class="agent-summary-card">
          <div class="agent-muted">Session</div>
          <div class="agent-summary-value">${escapeHtml(result.sessionId || '-')}</div>
        </div>
      </div>

      <div class="agent-section-title">Execution Plan</div>
      <div class="agent-plan-list">${renderPlan(result.plan || [])}</div>

      <div class="agent-section-title">Reasoning Trace</div>
      <div class="agent-trace-list">${renderTrace(result.trace || [])}</div>

      <div class="agent-section-title">Final Action List</div>
      <div class="agent-actions-wrap">${renderActions(finalDecision.actions || [])}</div>

      <div class="agent-rationale">${escapeHtml(finalDecision.rationale || 'No rationale available.')}</div>

      ${renderComparison(previousResult, result)}
      ${renderRecentHistory(result)}
    </div>
  `;
}

export async function runAgenticReview() {
  const btn = document.getElementById('agentEvaluateBtn');
  const resultArea = document.getElementById('agenticResult');

  if (!btn || !resultArea) {
    showToast('Agent review UI is not ready. Please refresh and try again.', 'error');
    return;
  }

  const payload = collectAgentFormData();

  if (!payload.city.trim() || !payload.sellerName.trim() || payload.propertyValue <= 0 || payload.sellerIncome <= 0) {
    showToast('Enter city, seller name, property value and seller income first.', 'warning');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">⚠️</div>
        <div>
          <div class="error-title">Insufficient Inputs For Agent</div>
          <div class="error-msg">Please fill city, seller name, property value and seller income to run agentic review.</div>
        </div>
      </div>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Running Agent...';
  resultArea.innerHTML = '<div class="spinner-overlay"><div class="spinner"></div><div class="spinner-text">Agent is planning and evaluating...</div></div>';

  try {
    let result;
    let usedFallback = false;

    try {
      result = await evaluatePropertyAgent(payload);
    } catch (_error) {
      result = getMockAgenticEvaluation(payload, null);
      usedFallback = true;
    }

    activeSessionId = result.sessionId || activeSessionId;
    renderAgentResult(result, usedFallback, lastAgentResult);
    pushHistory(result);
    lastAgentResult = toComparableResult(result);
    showToast('Agentic review completed.', usedFallback ? 'warning' : 'success');
  } catch (error) {
    showToast(`Agentic review failed: ${error?.message || 'Please try again.'}`, 'error');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">❌</div>
        <div>
          <div class="error-title">Agentic Review Failed</div>
          <div class="error-msg">${escapeHtml(error?.message || 'Unable to run agentic review right now.')}</div>
        </div>
      </div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🧠 Run Agentic AI Review';
  }
}

initializeHistoryState();
