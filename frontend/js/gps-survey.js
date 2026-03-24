const API_BASE = 'http://localhost:3000';
const SQM_TO_SQFT = 10.7639104167;

const startSurveyBtn = document.getElementById('startSurveyBtn');
const markCornerBtn = document.getElementById('markCornerBtn');
const completeSurveyBtn = document.getElementById('completeSurveyBtn');
const resetSurveyBtn = document.getElementById('resetSurveyBtn');
const propertyIdInput = document.getElementById('propertyId');
const registeredAreaInput = document.getElementById('registeredArea');
const cornersCount = document.getElementById('cornersCount');
const areaSqm = document.getElementById('areaSqm');
const areaSqft = document.getElementById('areaSqft');
const gpsStatusLabel = document.getElementById('gpsStatusLabel');
const surveyStatus = document.getElementById('surveyStatus');
const surveyResult = document.getElementById('surveyResult');
const surveyResultText = document.getElementById('surveyResultText');

const map = L.map('surveyMap', { zoomControl: true });
map.setView([13.0827, 80.2707], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let watchId = null;
let currentPosition = null;
let currentMarker = null;
let polygonLayer = null;
let polylineLayer = null;
let cornerMarkers = [];
let boundary = [];

function setStatus(text) {
  surveyStatus.textContent = text;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function toMetersPoints(coords) {
  if (coords.length < 3) return [];

  const lat0 = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length;
  const lng0 = coords.reduce((sum, [, lng]) => sum + lng, 0) / coords.length;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((lat0 * Math.PI) / 180);

  return coords.map(([lat, lng]) => [
    (lng - lng0) * lngScale,
    (lat - lat0) * latScale
  ]);
}

function shoelaceArea(coords) {
  const points = toMetersPoints(coords);
  if (points.length < 3) return 0;

  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function refreshMapShape() {
  if (polygonLayer) {
    map.removeLayer(polygonLayer);
    polygonLayer = null;
  }

  if (polylineLayer) {
    map.removeLayer(polylineLayer);
    polylineLayer = null;
  }

  if (boundary.length >= 3) {
    polygonLayer = L.polygon(boundary, {
      color: '#00B4D8',
      weight: 3,
      fillColor: '#00B4D8',
      fillOpacity: 0.24
    }).addTo(map);
  } else if (boundary.length >= 2) {
    polylineLayer = L.polyline(boundary, {
      color: '#00B4D8',
      weight: 3,
      dashArray: '6, 6'
    }).addTo(map);
  }

  if (boundary.length > 0) {
    const group = L.featureGroup([...cornerMarkers, ...(polygonLayer ? [polygonLayer] : []), ...(polylineLayer ? [polylineLayer] : [])]);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function refreshAreaStats() {
  const areaMeters = shoelaceArea(boundary);
  const areaFeet = areaMeters * SQM_TO_SQFT;

  cornersCount.textContent = String(boundary.length);
  areaSqm.textContent = formatNumber(areaMeters);
  areaSqft.textContent = formatNumber(areaFeet);

  completeSurveyBtn.disabled = boundary.length < 3;

  if (boundary.length < 3) {
    setStatus('Mark at least 3 corners to compute a valid area polygon.');
  } else {
    setStatus('Boundary polygon updated. Continue marking or complete survey.');
  }
}

function markCurrentCorner() {
  if (!currentPosition) {
    setStatus('Waiting for GPS fix. Please allow location and wait a moment.');
    return;
  }

  const point = [currentPosition.lat, currentPosition.lng];
  boundary.push(point);

  const marker = L.circleMarker(point, {
    radius: 6,
    color: '#00B4D8',
    fillColor: '#00B4D8',
    fillOpacity: 0.9,
    weight: 2
  }).addTo(map);

  marker.bindTooltip(`Corner ${boundary.length}`, {
    permanent: true,
    direction: 'top',
    offset: [0, -8],
    className: 'leaflet-tooltip'
  });

  cornerMarkers.push(marker);
  refreshMapShape();
  refreshAreaStats();
}

function resetSurvey() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  boundary = [];
  currentPosition = null;

  if (currentMarker) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }

  if (polygonLayer) {
    map.removeLayer(polygonLayer);
    polygonLayer = null;
  }

  if (polylineLayer) {
    map.removeLayer(polylineLayer);
    polylineLayer = null;
  }

  cornerMarkers.forEach((marker) => map.removeLayer(marker));
  cornerMarkers = [];

  surveyResult.className = 'gps-result';
  surveyResultText.textContent = '';
  surveyResult.style.display = 'none';

  markCornerBtn.disabled = true;
  completeSurveyBtn.disabled = true;
  gpsStatusLabel.textContent = 'Not started';
  setStatus('Survey reset. Press “Start GPS Survey” to begin again.');
  refreshAreaStats();
  map.setView([13.0827, 80.2707], 17);
}

function startSurvey() {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser.');
    gpsStatusLabel.textContent = 'Unsupported';
    return;
  }

  if (watchId !== null) {
    setStatus('GPS tracking already active. Use “Mark Boundary Corner” at each corner.');
    return;
  }

  setStatus('Requesting location permission...');

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      currentPosition = { lat: latitude, lng: longitude, accuracy };

      if (!currentMarker) {
        currentMarker = L.marker([latitude, longitude]).addTo(map);
      } else {
        currentMarker.setLatLng([latitude, longitude]);
      }

      currentMarker.bindPopup(`Current Position<br/>Accuracy: ±${Math.round(accuracy)}m`);
      map.panTo([latitude, longitude]);

      gpsStatusLabel.textContent = `Tracking (±${Math.round(accuracy)}m)`;
      markCornerBtn.disabled = false;
      setStatus('GPS active. Walk to each boundary corner and click “Mark Boundary Corner”.');
    },
    (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location permission denied. Please allow GPS access in browser settings.'
        : 'Unable to get GPS location. Try moving outdoors and retry.';

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      gpsStatusLabel.textContent = 'Permission/Error';
      setStatus(message);
      markCornerBtn.disabled = true;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    }
  );
}

async function completeSurvey() {
  if (boundary.length < 3) {
    setStatus('Need at least 3 corners before completing survey.');
    return;
  }

  const registeredArea = Number(registeredAreaInput.value);
  const propertyId = propertyIdInput.value.trim();

  if (!propertyId) {
    setStatus('Please enter Property ID before completing survey.');
    propertyIdInput.focus();
    return;
  }

  if (!Number.isFinite(registeredArea) || registeredArea <= 0) {
    setStatus('Please enter a valid registered area (sq. meters).');
    registeredAreaInput.focus();
    return;
  }

  const calculatedArea = shoelaceArea(boundary);
  completeSurveyBtn.disabled = true;
  completeSurveyBtn.textContent = 'Submitting...';

  try {
    const response = await fetch(`${API_BASE}/api/gps-survey/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: boundary,
        calculatedArea,
        propertyId,
        registeredArea
      })
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      const message = payload?.error?.message || payload?.message || `Request failed (${response.status})`;
      throw new Error(message);
    }

    const data = payload.data || payload;

    const isMatch = Boolean(data.verified);
    surveyResult.className = `gps-result show ${isMatch ? 'ok' : 'warn'}`;
    surveyResult.style.display = 'block';
    surveyResultText.innerHTML = `
      <strong>${isMatch ? '✅ Match' : '⚠️ Mismatch'}:</strong> Survey complete for <strong>${propertyId}</strong><br/>
      Recorded Area: <strong>${formatNumber(data.calculatedArea)} sq.m</strong> (${formatNumber(data.calculatedArea * SQM_TO_SQFT)} sq.ft)<br/>
      Registered Area: <strong>${formatNumber(data.registeredArea)} sq.m</strong><br/>
      Discrepancy: <strong>${formatNumber(data.discrepancyPercent)}%</strong><br/>
      Certificate ID: <strong>${data.certificateId}</strong>
    `;

    setStatus(isMatch
      ? 'Survey verified within allowed 5% discrepancy range.'
      : 'Survey completed but discrepancy exceeded 5%. Please verify documents.');
  } catch (error) {
    surveyResult.className = 'gps-result show warn';
    surveyResult.style.display = 'block';
    surveyResultText.textContent = `Submission failed: ${error.message}`;
    setStatus('Unable to submit survey. Ensure backend is running on port 3000.');
  } finally {
    completeSurveyBtn.disabled = boundary.length < 3;
    completeSurveyBtn.textContent = 'Complete Survey';
  }
}

startSurveyBtn.addEventListener('click', startSurvey);
markCornerBtn.addEventListener('click', markCurrentCorner);
completeSurveyBtn.addEventListener('click', completeSurvey);
resetSurveyBtn.addEventListener('click', resetSurvey);

map.on('click', () => {
  if (!markCornerBtn.disabled) {
    markCurrentCorner();
  }
});

refreshAreaStats();
setStatus('Press “Start GPS Survey” to request location permission.');
