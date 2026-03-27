import { verifyPropertyRegistration, getMockMunicipalResult } from './api.js';
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
  try {
    try {
      data = await verifyPropertyRegistration(registrationNumber);
      showToast('Property verification completed.', 'success');
    } catch (error) {
      const message = String(error?.message || '');
      const networkDown = /failed to fetch|networkerror|load failed|fetch|unable to reach backend api|server error (4\d\d|5\d\d)/i.test(message);

      if (networkDown) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        data = getMockMunicipalResult(registrationNumber);
        showToast('Backend is offline. Showing fallback report.', 'warning');
      } else {
        throw new Error(message || 'Municipal verification request failed.');
      }
    }

    resultArea.innerHTML = `
      <div class="verify-card animate-fade-in-up">
        <div class="verify-head">Verification Report — ${escapeHtml(data.registrationNumber || registrationNumber)}</div>
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
