const SQM_TO_SQFT = 10.7639104167;
const API_PATH = '/api/gps-survey/submit';

const propertyIdInput = document.getElementById('propertyId');
const registeredAreaInput = document.getElementById('registeredArea');
const getLocationBtn = document.getElementById('getLocationBtn');
const markCornerBtn = document.getElementById('markCornerBtn');
const completeSurveyBtn = document.getElementById('completeSurveyBtn');
const resetBtn = document.getElementById('resetBtn');
const cornerCounter = document.getElementById('cornerCounter');
const cornersList = document.getElementById('cornersList');
const statusText = document.getElementById('statusText');
const resultCard = document.getElementById('resultCard');

let currentLocation = null;
let corners = [];

function calculateArea(coords) {
  // Shoelace formula: converts lat/lng to approximate square meters
  if (coords.length < 3) return 0;
  
  let area = 0;
  const n = coords.length;
  const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / n;
  const latToMeters = 111000; // ~111 km per degree latitude
  const lngToMeters = 111000 * Math.cos((avgLat * Math.PI) / 180); // adjust for latitude
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = coords[i].lng * lngToMeters;
    const y1 = coords[i].lat * latToMeters;
    const x2 = coords[j].lng * lngToMeters;
    const y2 = coords[j].lat * latToMeters;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function setStatus(message) {
  statusText.textContent = message;
}

function format(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function updateCornersUI() {
  cornerCounter.textContent = `Corners marked: ${corners.length}`;
  completeSurveyBtn.disabled = corners.length < 3;

  cornersList.innerHTML = corners
    .map((corner, index) => `<li>Corner ${index + 1}: ${corner.lat.toFixed(6)}, ${corner.lng.toFixed(6)}</li>`)
    .join('');
}

function getApiUrl() {
  return window.location.port === '3000' ? API_PATH : `http://localhost:3000${API_PATH}`;
}

function showResult(data) {
  const isMatch = Boolean(data.verified);
  const badgeClass = isMatch ? 'match' : 'mismatch';
  const badgeText = isMatch ? 'MATCH' : 'MISMATCH';

  resultCard.className = 'result show';
  resultCard.innerHTML = `
    <div class="line"><strong>Recorded Area:</strong> ${format(data.calculatedArea)} sq.m (${format(data.calculatedArea * SQM_TO_SQFT)} sq.ft)</div>
    <div class="line"><strong>Registered Area:</strong> ${format(data.registeredArea)} sq.m</div>
    <div class="line"><strong>Discrepancy:</strong> ${format(data.discrepancyPercent)}%</div>
    <div class="line"><span class="badge ${badgeClass}">${badgeText}</span></div>
    <div class="line"><strong>Certificate ID:</strong> ${data.certificateId}</div>
  `;
}

function validateInputs() {
  const propertyId = String(propertyIdInput.value || '').trim();
  const registeredArea = Number(registeredAreaInput.value);

  if (!propertyId) {
    throw new Error('Property ID is required.');
  }

  if (!Number.isFinite(registeredArea) || registeredArea <= 0) {
    throw new Error('Registered area must be a positive number.');
  }

  if (!Array.isArray(corners) || corners.length < 3) {
    throw new Error('At least 3 corners are required to complete survey.');
  }

  return { propertyId, registeredArea };
}

function getMyLocation() {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser.');
    return;
  }

  setStatus('Getting current location...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude)
      };

      markCornerBtn.disabled = false;
      setStatus(`Location ready: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`);
    },
    (error) => {
      currentLocation = null;
      markCornerBtn.disabled = true;
      
      let errorMsg = 'Unable to get location';
      if (error.code === 1) {
        errorMsg = 'Location permission denied. Enable location access in browser settings.';
      } else if (error.code === 2) {
        errorMsg = 'Location unavailable. Check your device\'s GPS or try again.';
      } else if (error.code === 3) {
        errorMsg = 'Location request timed out. Please try again.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setStatus(`❌ ${errorMsg}`);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function markCorner() {
  if (!currentLocation) {
    setStatus('Get location first before marking corner.');
    return;
  }

  corners.push({
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });

  updateCornersUI();
  setStatus(`Corner ${corners.length} marked.`);
}

async function completeSurvey() {
  try {
    const { propertyId, registeredArea } = validateInputs();

    const areaInSqMeters = calculateArea(corners);
    if (!Number.isFinite(areaInSqMeters) || areaInSqMeters <= 0) {
      throw new Error('Calculated area is invalid. Please re-mark corners.');
    }

    console.log('Coordinates before sending:', corners);

    completeSurveyBtn.disabled = true;
    completeSurveyBtn.textContent = 'Submitting...';

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: corners,
        calculatedArea: areaInSqMeters,
        propertyId,
        registeredArea
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = payload?.error?.message || payload?.message || `Request failed (${response.status})`;
      throw new Error(errMsg);
    }

    const data = payload?.data || payload;
    showResult(data);
    setStatus('Survey submitted successfully.');
  } catch (error) {
    resultCard.className = 'result show';
    resultCard.innerHTML = `<div class="line" style="color:#ef4444;"><strong>Error:</strong> ${error.message}</div>`;
    setStatus(error.message);
  } finally {
    completeSurveyBtn.disabled = corners.length < 3;
    completeSurveyBtn.textContent = 'Complete Survey';
  }
}

function resetSurvey() {
  currentLocation = null;
  corners = [];
  markCornerBtn.disabled = true;
  completeSurveyBtn.disabled = true;
  resultCard.className = 'result';
  resultCard.innerHTML = '';
  updateCornersUI();
  setStatus('Survey reset. Tap “Get My Location” to continue.');
}

getLocationBtn.addEventListener('click', getMyLocation);
markCornerBtn.addEventListener('click', markCorner);
completeSurveyBtn.addEventListener('click', completeSurvey);
resetBtn.addEventListener('click', resetSurvey);

updateCornersUI();
