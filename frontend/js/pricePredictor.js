/**
 * PropSafe — Price Predictor Module (Tab 3)
 */
import { predictPrice, getMockPriceResult } from './api.js';
import { matchLoanEligibility, getMockLoanOffers } from './api.js';
import { showToast } from './toast.js';

let priceChart = null;

export async function runPricePredictor() {
  const btn        = document.getElementById('predictBtn');
  const resultArea = document.getElementById('priceResult');

  const formData = {
    locality:     document.getElementById('locality')?.value || 'Velachery, Chennai',
    currentValue: document.getElementById('currentMarketValue')?.value || '50',
    propertyType: document.getElementById('pricePropertyType')?.value || 'Residential Apartment',
    askingPrice:  document.getElementById('askingPrice')?.value || '55',
  };

  if (!formData.locality.trim()) {
    showToast('Please enter the locality name.', 'warning');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">⚠️</div>
        <div>
          <div class="error-title">Missing Information</div>
          <div class="error-msg">Please enter the locality name to generate a price report.</div>
        </div>
      </div>`;
    return;
  }

  // Loading
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Generating Report…`;
  resultArea.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line w-55"></div>
      <div class="skeleton skeleton-line w-100"></div>
      <div class="skeleton skeleton-line w-85"></div>
      <div class="skeleton skeleton-line w-70"></div>
      <div class="skeleton skeleton-line w-40"></div>
    </div>
    <div class="skeleton-grid" style="margin-top:12px;">
      ${Array.from({ length: 4 }).map(() => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-line w-70"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      `).join('')}
    </div>`;

  let data;
  try {
    data = await predictPrice(formData);
    showToast('Price report generated successfully.', 'success');
  } catch (_) {
    await sleep(1800);
    data = getMockPriceResult(formData);
    showToast('Prediction service unavailable. Showing fallback report.', 'warning');
  }

  btn.disabled = false;
  btn.innerHTML = `📈 Generate Price Report`;

  renderPriceResult(data, resultArea, formData);
}

export async function runLoanMatcher() {
  const incomeInput = document.getElementById('buyerAnnualIncome');
  const localityInput = document.getElementById('locality');
  const currentValueInput = document.getElementById('currentMarketValue');
  const resultArea = document.getElementById('loanMatchResult');
  const btn = document.getElementById('loanMatchBtn');

  const buyerIncome = Number(incomeInput?.value || 0);
  const propertyValueLakhs = Number(currentValueInput?.value || 0);
  const city = (localityInput?.value || '').split(',').pop()?.trim() || 'Chennai';

  if (!buyerIncome || !propertyValueLakhs) {
    showToast('Enter annual income and market value first.', 'warning');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">⚠️</div>
        <div>
          <div class="error-title">Missing Information</div>
          <div class="error-msg">Please enter buyer annual income and current market value first.</div>
        </div>
      </div>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Checking...`;
  resultArea.innerHTML = `<div class="spinner-overlay"><div class="spinner"></div><div class="spinner-text">Matching banks for this profile...</div></div>`;

  let data;
  try {
    data = await matchLoanEligibility({
      propertyValue: propertyValueLakhs * 100000,
      buyerIncome,
      city
    });
    showToast('Loan eligibility matched successfully.', 'success');
  } catch (_) {
    await sleep(900);
    data = getMockLoanOffers(propertyValueLakhs * 100000, buyerIncome, city);
    showToast('Loan API unavailable. Showing fallback offers.', 'warning');
  }

  btn.disabled = false;
  btn.innerHTML = 'Check Loan Eligibility';

  const cards = (data.offers || []).map((offer) => `
    <div class="loan-card animate-fade-in-up">
      <div class="loan-head">🏦 ${offer.bankName}</div>
      <div class="loan-line"><span>Interest Rate</span><strong>${offer.interestRate}%</strong></div>
      <div class="loan-line"><span>Max Loan</span><strong>₹${Number(offer.maxLoanAmount || 0).toLocaleString('en-IN')}</strong></div>
      <div class="loan-line"><span>Monthly EMI</span><strong>₹${Number(offer.emiEstimate || 0).toLocaleString('en-IN')}</strong></div>
      <div class="loan-line"><span>Eligibility</span><strong>${offer.loanEligibility}</strong></div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;">Apply Now</button>
    </div>
  `).join('');

  resultArea.innerHTML = `<div class="loan-grid">${cards}</div>`;
}

function renderPriceResult(data, container, formData) {
  const { historical, predicted, stats, insight, negotiation, infraTags } = data;

  container.innerHTML = `
    <!-- Chart -->
    <div class="chart-wrapper animate-fade-in-up">
      <div class="flex-between" style="margin-bottom:8px;flex-wrap:wrap;gap:8px;">
        <div>
          <div class="chart-title">Property Price Trend — ${formData.locality}</div>
          <div style="font-size:12px;color:var(--text-muted);">Historical data (2015–2024) with AI-powered 2025–2026 projection</div>
        </div>
        <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-line" style="background:var(--teal);"></div>
            Historical Price
          </div>
          <div class="legend-item">
            <div class="legend-line" style="background:var(--amber);border-top:2px dashed var(--amber);height:0;"></div>
            Predicted Price
          </div>
        </div>
      </div>
      <div class="chart-canvas-wrap">
        <canvas id="priceChart"></canvas>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-value">₹${stats.currentValue}L</div>
        <div class="stat-label">Current Market Value</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">₹${stats.predicted2026}L</div>
        <div class="stat-label">2026 Predicted Value</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--green);">+${stats.appreciation}%</div>
        <div class="stat-label">2-Year Appreciation</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${stats.overpricedBy > 0 ? 'var(--red)' : 'var(--green)'};">
          ${stats.overpricedBy > 0 ? '+₹' + stats.overpricedBy + 'L' : 'Fair'}
        </div>
        <div class="stat-label">Overpriced By</div>
      </div>
    </div>

    <!-- AI Insight -->
    <div class="insight-card teal-card animate-fade-in-up">
      <div class="insight-headline">🤖 AI Prediction</div>
      <div class="insight-body">${insight}</div>
    </div>

    <!-- Negotiation -->
    <div class="insight-card amber-card animate-fade-in-up">
      <div class="insight-headline">🤝 PropSafe Negotiation Tip</div>
      <div class="insight-body">${negotiation}</div>
      <div class="infra-tags">
        ${infraTags.map(t => `<span class="infra-tag">🏗 ${t}</span>`).join('')}
      </div>
    </div>`;

  // Build Chart.js chart
  setTimeout(() => buildChart(historical, predicted), 50);
}

function buildChart(historical, predicted) {
  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  // Destroy previous instance
  if (priceChart) { priceChart.destroy(); priceChart = null; }

  const histLabels  = historical.map(d => d.year.toString());
  const histValues  = historical.map(d => d.value);
  const predLabels  = predicted.map(d => d.year.toString());
  const predValues  = predicted.map(d => d.value);

  // Combined labels: historical + predicted
  const allLabels = [...histLabels, ...predLabels];

  // Historical dataset: full values, then null for predicted years
  const histData = [...histValues, ...predLabels.map(() => null)];

  // Predicted dataset: last historical value at the join, then predicted values
  const predData = [
    ...histLabels.map((_, i) => (i === histLabels.length - 1 ? histValues[histValues.length - 1] : null)),
    ...predValues,
  ];

  const ctx = canvas.getContext('2d');

  // Teal gradient fill
  const tealGrad = ctx.createLinearGradient(0, 0, 0, 300);
  tealGrad.addColorStop(0, 'rgba(0,212,170,0.25)');
  tealGrad.addColorStop(1, 'rgba(0,212,170,0)');

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical Price (₹L)',
          data: histData,
          borderColor: '#00d4aa',
          backgroundColor: tealGrad,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00d4aa',
          pointRadius: 4,
          pointHoverRadius: 7,
          spanGaps: false,
        },
        {
          label: 'Predicted Price (₹L)',
          data: predData,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          borderDash: [8, 4],
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#f59e0b',
          pointRadius: 5,
          pointHoverRadius: 8,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111820',
          borderColor: '#1e2d3d',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: ctx => {
              if (ctx.parsed.y === null) return null;
              return ` ₹${ctx.parsed.y}L`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(30,45,61,0.8)', drawBorder: false },
          ticks: { color: '#64748b', font: { family: 'DM Sans', size: 12 } },
        },
        y: {
          grid: { color: 'rgba(30,45,61,0.8)', drawBorder: false },
          ticks: {
            color: '#64748b',
            font: { family: 'DM Sans', size: 12 },
            callback: v => `₹${v}L`,
          },
        },
      },
      animation: {
        duration: 1200,
        easing: 'easeInOutQuart',
      },
    },
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
