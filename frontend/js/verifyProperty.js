import { verifyPropertyRegistration, getMockMunicipalResult } from './api.js?v=20260421';
import { showToast } from './toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusCell(label, status) {
  const isGood = ['VALID', 'UP_TO_DATE', 'APPROVED', 'COMPLIANT'].includes(String(status));
  const icon = isGood ? '✅' : '❌';
  const className = isGood ? 'verify-ok' : 'verify-bad';
  const safeLabel = escapeHtml(label);
  const safeStatus = escapeHtml(status);
  return `
    <div class="verify-row ${className}">
      <div class="verify-key">${safeLabel}</div>
      <div class="verify-value">${icon} ${safeStatus}</div>
    </div>`;
}

export async function runMunicipalVerification() {
  const input = document.getElementById('registrationNumber');
  const resultArea = document.getElementById('verifyResult');
  const btn = document.getElementById('verifyPropertyBtn');

  if (!input || !resultArea || !btn) {
    showToast('Verification UI is not ready. Please refresh and try again.', 'error');
    return;
  }

  const registrationNumber = input?.value?.trim() || '';
  if (!registrationNumber) {
    showToast('Please enter a property registration number.', 'warning');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">⚠️</div>
        <div>
          <div class="error-title">Missing Registration Number</div>
          <div class="error-msg">Please enter a property registration number to verify.</div>
        </div>
      </div>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Verifying...`;
  resultArea.innerHTML = `<div class="spinner-overlay"><div class="spinner"></div><div class="spinner-text">Checking municipal records...</div></div>`;

  let data;
  let usedFallback = false;
  let fallbackReason = '';
  let fallbackHint = '';
  try {
    try {
      data = await verifyPropertyRegistration(registrationNumber);
      showToast('Property verification completed.', 'success');
    } catch (error) {
      const message = String(error?.message || '');
      const networkDown = /failed to fetch|networkerror|load failed|unable to reach backend api|unable to reach live municipal service|network request failed|cors/i.test(message);
      const serviceError = /server error 5\d\d/i.test(message);

      if (networkDown || serviceError) {
        data = getMockMunicipalResult(registrationNumber);
        usedFallback = true;
        fallbackReason = message || 'Unknown connectivity issue.';

        if (window.location.protocol === 'https:') {
          fallbackHint = 'This page is running on HTTPS. If backend is local HTTP, browser may block the request. Open the app from http://localhost:5173 for local development.';
        } else {
          fallbackHint = 'Ensure backend is running on port 3000 and frontend is opened from the same local machine.';
        }

        if (networkDown) {
          showToast('Could not reach live municipal API. Showing fallback report.', 'warning');
        } else {
          showToast('Municipal service error. Showing fallback report.', 'warning');
        }

        console.warn('[Municipal Verify] live call failed:', message);
      } else {
        throw new Error(message || 'Municipal verification request failed.');
      }
    }

    resultArea.innerHTML = `
      <div class="verify-card animate-fade-in-up">
        <div class="verify-head">Verification Report — ${escapeHtml(data.registrationNumber || registrationNumber)}</div>
        ${usedFallback ? `<div style="margin:10px 0 14px;padding:10px 12px;border:1px solid rgba(255,193,7,0.35);border-radius:10px;background:rgba(255,193,7,0.10);color:#8a6d1f;font-weight:600;">⚠️ Showing fallback report due to temporary municipal service/connectivity issue.<div style="margin-top:6px;font-size:12px;font-weight:500;opacity:0.95;">Reason: ${escapeHtml(fallbackReason)}</div><div style="margin-top:4px;font-size:12px;font-weight:500;opacity:0.95;">Hint: ${escapeHtml(fallbackHint)}</div></div>` : ''}
        ${statusCell('RERA Status', data.reraStatus)}
        ${statusCell('Tax Records', data.taxRecordStatus)}
        ${statusCell('Building Permit', data.buildingPermitStatus)}
        ${statusCell('Zoning Compliance', data.zoningCompliance)}
      </div>
    `;
  } catch (error) {
    showToast(`Verification failed: ${error?.message || 'Please try again.'}`, 'error');
    resultArea.innerHTML = `
      <div class="error-card animate-fade-in-up">
        <div class="error-icon">❌</div>
        <div>
          <div class="error-title">Verification Failed</div>
          <div class="error-msg">${escapeHtml(error?.message || 'Unable to generate municipal verification report right now.')}</div>
        </div>
      </div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Verify Now';
  }
}
