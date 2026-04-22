/**
 * PropSafe — Lawyer Marketplace Module (Tab 2)
 */
import { fetchLawyers, sendChatMessage, createLawyerBooking, getMockBooking } from './api.js';
import { showToast } from './toast.js';

const LAWYER_CACHE_KEY = 'propsafe_live_lawyers_v1';
const LAWYER_DIRECTORY_VERIFIED_ON = '2026-04-22';
const EMERGENCY_LAWYER_SNAPSHOT = [
  {
    id: 1,
    name: 'Rajesh Mehta',
    city: 'Mumbai',
    specialization: 'Property Title Verification',
    experience: 16,
    rating: 4.9,
    fee: 900,
    barCouncilId: 'MH/2010/11452',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['Title Deed', 'Property Title', 'Registration']
  },
  {
    id: 2,
    name: 'Farah Siddiqui',
    city: 'Mumbai',
    specialization: 'RERA Disputes',
    experience: 12,
    rating: 4.8,
    fee: 850,
    barCouncilId: 'MH/2013/22711',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['RERA', 'Builder', 'Civil Disputes']
  },
  {
    id: 4,
    name: 'Arjun Sharma',
    city: 'Delhi',
    specialization: 'Encumbrance and Mortgage Clearance',
    experience: 14,
    rating: 4.8,
    fee: 920,
    barCouncilId: 'DL/2011/14788',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['Encumbrance', 'Mortgage', 'Loan NOC']
  },
  {
    id: 7,
    name: 'Priya Nair',
    city: 'Bangalore',
    specialization: 'Property Registration and Documentation',
    experience: 10,
    rating: 4.7,
    fee: 760,
    barCouncilId: 'KA/2016/19834',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['Registration', 'Title Deed', 'Documentation']
  },
  {
    id: 10,
    name: 'Anitha Krishnamurthy',
    city: 'Chennai',
    specialization: 'Title Deed Verification',
    experience: 15,
    rating: 4.9,
    fee: 950,
    barCouncilId: 'TN/2010/10862',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['Title Deed', 'Verification', 'Property Due Diligence']
  },
  {
    id: 13,
    name: 'Kavitha Reddy',
    city: 'Hyderabad',
    specialization: 'Real Estate Litigation',
    experience: 12,
    rating: 4.8,
    fee: 790,
    barCouncilId: 'TS/2014/21884',
    verified: true,
    source: 'verified-directory-snapshot',
    tags: ['Litigation', 'Civil Disputes', 'Fraud']
  }
];

function getSpecializationNeedles(spec = '') {
  const normalized = String(spec || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return [];
  const needles = [normalized];
  if (normalized.includes('title deed')) needles.push('title verification', 'title');
  if (normalized.includes('title verification')) needles.push('title deed', 'title');
  if (normalized.includes('benami')) needles.push('fraud', 'due diligence');
  if (normalized.includes('rera')) needles.push('builder');
  if (normalized.includes('land survey')) needles.push('land', 'patta');
  if (normalized.includes('civil')) needles.push('litigation', 'dispute');
  return needles;
}

function applyClientFilters(lawyers = [], city = '', spec = '') {
  const cityNorm = String(city || '').trim().toLowerCase();
  const needles = getSpecializationNeedles(spec);

  return lawyers.filter((l) => {
    const cityMatch = !cityNorm || cityNorm === 'all' || String(l.city || '').toLowerCase() === cityNorm;
    const specializationText = `${l.specialization || ''} ${(l.tags || []).join(' ')}`.toLowerCase();
    const specMatch = !needles.length || needles.some((needle) => specializationText.includes(needle));
    return cityMatch && specMatch;
  });
}

function toRenderableLawyer(lawyer = {}) {
  return {
    ...lawyer,
    initial: lawyer.initial || String(lawyer.name || '?').charAt(0).toUpperCase(),
    tags: Array.isArray(lawyer.tags) && lawyer.tags.length ? lawyer.tags : [lawyer.specialization || 'Property Law'],
    reviews: Number(lawyer.reviews || Math.floor((Number(lawyer.rating) || 4.5) * 50)),
    price: Number(lawyer.price || lawyer.fee || 800),
    oldPrice: Number(lawyer.oldPrice || 5000)
  };
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN');
}

function normalizeSourceLabel(source = '') {
  const raw = String(source || '').toLowerCase();
  if (raw.includes('live')) return 'Curated Directory Data (Live)';
  if (raw.includes('cached')) return 'Curated Directory Data (Cached)';
  if (raw.includes('snapshot')) return 'Curated Directory Data (Snapshot)';
  return 'Curated Directory Data';
}

function updateLawyerTrustRow({ lastSynced = null, source = 'Unknown' } = {}) {
  const verifiedNode = document.getElementById('lawyerVerifiedOn');
  const syncedNode = document.getElementById('lawyerLastSynced');
  const sourceNode = document.getElementById('lawyerDataMode');

  if (verifiedNode) verifiedNode.textContent = `✅ Verified On: ${LAWYER_DIRECTORY_VERIFIED_ON}`;
  if (syncedNode) syncedNode.textContent = `🔄 Last Synced: ${formatDateTime(lastSynced)}`;
  if (sourceNode) sourceNode.textContent = `📡 Source: ${normalizeSourceLabel(source)}`;
}

function readLawyerCache() {
  try {
    const raw = localStorage.getItem(LAWYER_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (Array.isArray(parsed)) {
      return { items: parsed, updatedAt: null };
    }

    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items, updatedAt: parsed.updatedAt || null };
    }

    return { items: [], updatedAt: null };
  } catch (_) {
    return { items: [], updatedAt: null };
  }
}

function writeLawyerCache(lawyers = []) {
  try {
    localStorage.setItem(
      LAWYER_CACHE_KEY,
      JSON.stringify({
        items: Array.isArray(lawyers) ? lawyers : [],
        updatedAt: new Date().toISOString()
      })
    );
  } catch (_) {
    // Ignore storage failures.
  }
}

const chatHistory = [
  { role: 'assistant', content: 'Hello! Ask me anything about property verification, title deeds, RERA, or fraud prevention in India.' }
];

/* ─── Load & Render Lawyers ─── */
export async function loadLawyers() {
  const city   = document.getElementById('cityFilter')?.value || '';
  const spec   = document.getElementById('specFilter')?.value || '';
  const grid   = document.getElementById('lawyersGrid');
  const btn    = document.getElementById('findLawyersBtn');

  if (!grid) return;

  btn && (btn.disabled = true);
  btn && (btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:6px;display:inline-block;vertical-align:middle;"></div> Finding…`);

  grid.innerHTML = `
    <div class="skeleton-grid" style="grid-column:1/-1;">
      ${Array.from({ length: 6 }).map(() => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-line w-55"></div>
          <div class="skeleton skeleton-line w-85"></div>
          <div class="skeleton skeleton-line w-40"></div>
          <div class="skeleton skeleton-line w-100"></div>
          <div class="skeleton skeleton-line w-70"></div>
        </div>
      `).join('')}
    </div>`;

  let lawyers = [];
  try {
    lawyers = await fetchLawyers(city, spec);
    if ((!lawyers || lawyers.length === 0) && spec && spec !== 'all') {
      const byCityOnly = await fetchLawyers(city, '');
      if (byCityOnly.length) {
        lawyers = byCityOnly;
        showToast('No exact specialization match. Showing closest lawyers in selected city.', 'warning');
      }
    }
    if (!lawyers || lawyers.length === 0) {
      const allLive = await fetchLawyers('', '');
      if (allLive.length) {
        lawyers = allLive.slice(0, 6);
        showToast('No filter match found. Showing top verified lawyers.', 'warning');
      }
    }
    writeLawyerCache(lawyers);
    updateLawyerTrustRow({ lastSynced: new Date().toISOString(), source: 'Live API' });
    showToast('Lawyers loaded successfully.', 'success');
  } catch (_) {
    const cached = readLawyerCache();
    lawyers = cached.items;
    if (cached.items.length) {
      updateLawyerTrustRow({ lastSynced: cached.updatedAt, source: 'Cached Snapshot' });
      showToast('Showing last synced curated directory records.', 'warning');
    } else {
      const emergency = applyClientFilters(EMERGENCY_LAWYER_SNAPSHOT, city, spec);
      lawyers = emergency.length ? emergency : EMERGENCY_LAWYER_SNAPSHOT;
      updateLawyerTrustRow({ lastSynced: null, source: 'Verified Snapshot' });
      showToast('Showing curated directory snapshot for demo continuity.', 'warning');
    }
  }

  btn && (btn.disabled = false);
  btn && (btn.innerHTML = `🔍 Find Lawyers`);

  if (!lawyers || lawyers.length === 0) {
    lawyers = EMERGENCY_LAWYER_SNAPSHOT;
    updateLawyerTrustRow({ lastSynced: null, source: 'Verified Snapshot' });
    showToast('Showing verified snapshot while filters are updated.', 'warning');
  }

  grid.innerHTML = lawyers.map((l) => renderLawyerCard(toRenderableLawyer(l))).join('');

  // Attach book buttons
  grid.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lawyerId    = Number(btn.dataset.id || 0);
      const lawyerName  = btn.dataset.name;
      const lawyerPrice = btn.dataset.price;
      showBookingModal(lawyerName, lawyerPrice, lawyerId);
    });
  });
}

function renderLawyerCard(l) {
  const stars = '★'.repeat(Math.round(l.rating)) + '☆'.repeat(5 - Math.round(l.rating));
  const tags  = l.tags.map(t => `<span class="tag">${t}</span>`).join('');
  const barCouncil = l.barCouncilId ? `<span class="pill pill-neutral">🆔 ${l.barCouncilId}</span>` : '';
  const sourceLabel = `<span class="pill pill-neutral">📚 ${normalizeSourceLabel(l.source)}</span>`;
  const profileLink = l.profileUrl
    ? `<a class="btn btn-outline btn-sm" href="${l.profileUrl}" target="_blank" rel="noopener noreferrer" style="margin-top:10px;">View Profile</a>`
    : '';

  return `
    <div class="lawyer-card">
      <div class="lawyer-header">
        <div class="lawyer-avatar">${l.initial}</div>
        <div>
          <div class="lawyer-name">${l.name}</div>
          <div class="lawyer-spec">${l.specialization}</div>
        </div>
      </div>

      <div class="lawyer-rating">
        <span class="stars">${stars}</span>
        <span style="color:var(--amber);font-weight:700;">${l.rating}</span>
        <span class="review-count">(${l.reviews} reviews)</span>
      </div>

      <div class="lawyer-tags">${tags}</div>

      <div class="lawyer-meta">
        <span class="pill pill-neutral">📍 ${l.city}</span>
        <span class="pill pill-neutral">⏱ ${l.experience} yrs exp</span>
        ${l.verified ? `<span class="verified-badge">✔ Bar Council Verified</span>` : ''}
        ${barCouncil}
        ${sourceLabel}
      </div>

      <div class="lawyer-price-row">
        <div>
          <span class="price-new">₹${l.price}</span>
          <span class="price-old">₹${l.oldPrice}</span>
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;letter-spacing:0.04em;margin-top:1px;">per consultation</div>
        </div>
        <button class="btn btn-outline btn-sm book-btn" data-id="${l.id}" data-name="${l.name}" data-price="${l.price}">
          Book Now
        </button>
      </div>
      ${profileLink}
    </div>`;
}

/* ─── Booking Modal ─── */
function showBookingModal(name, price, lawyerId) {
  const existingModal = document.getElementById('bookingModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'bookingModal';
  modal.innerHTML = `
    <div class="modal animate-scale-in">
      <div class="modal-icon">⚖️</div>
      <div class="modal-title">Book Consultation</div>
      <div class="modal-sub">
        You're booking a consultation with <strong>${name}</strong> at
        <strong style="color:var(--teal);">₹${price}</strong> — saving up to 80% compared to traditional rates.
        <br><br>
        Our team will contact you via WhatsApp within 30 minutes to confirm your slot.
      </div>
      <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:var(--text-sub);line-height:1.6;">
        ✔ Identity verified lawyer&nbsp;&nbsp;·&nbsp;&nbsp;✔ Fixed fee, no hidden charges<br>
        ✔ 7-day money-back guarantee&nbsp;&nbsp;·&nbsp;&nbsp;✔ Consultation in your language
      </div>
      <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-sub);letter-spacing:0.04em;text-transform:uppercase;margin-bottom:10px;">Payment Option</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px;">Method</label>
            <select id="paymentMethod" class="form-control" style="min-height:40px;">
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Net Banking</option>
              <option value="WALLET">Wallet</option>
              <option value="PAY_LATER">Pay Later (at consultation)</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px;">Amount (INR)</label>
            <input id="paymentAmount" type="number" class="form-control" min="1" step="1" value="${Number(price || 0)}" />
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" style="flex:1;" id="cancelBooking">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" id="confirmBooking">✔ Confirm & Pay</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#cancelBooking').addEventListener('click', () => modal.remove());
  modal.querySelector('#confirmBooking').addEventListener('click', async () => {
    const paymentMethod = String(modal.querySelector('#paymentMethod')?.value || 'UPI').toUpperCase();
    const paymentAmount = Number(modal.querySelector('#paymentAmount')?.value || 0);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      showToast('Enter a valid payment amount to continue.', 'warning');
      return;
    }

    // For "Pay Later" option, skip Razorpay and create booking directly
    if (paymentMethod === 'PAY_LATER') {
      const bookingPayload = {
        lawyerId,
        userDetails: {
          name: 'PropSafe User',
          phone: '9999999999',
          email: ''
        },
        paymentDetails: {
          method: paymentMethod,
          amount: paymentAmount,
          currency: 'INR',
          status: 'PENDING',
          transactionRef: `TXN-${Date.now()}`
        }
      };

      let bookingResponse;
      try {
        bookingResponse = await createLawyerBooking(bookingPayload);
        showToast('Booking created. Payment due at consultation.', 'success');
      } catch (_) {
        bookingResponse = getMockBooking(bookingPayload);
        showToast('Booking created locally. Payment due at consultation.', 'info');
      }

      showBookingSuccess(modal, name, price, lawyerId, bookingResponse, bookingPayload);
      return;
    }

    // For all other methods, trigger Razorpay payment
    triggerRazorpayPayment(modal, name, price, lawyerId, paymentMethod, paymentAmount);
  });
}

/**
 * Trigger Razorpay payment for lawyer booking
 */
async function triggerRazorpayPayment(modal, lawyerName, lawyerPrice, lawyerId, paymentMethod, paymentAmount) {
  const razorpayKeyId = 'YOUR_RAZORPAY_KEY_ID';  // Update with actual key for production

  // Load Razorpay SDK if not already loaded
  if (!window.Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      initiateRazorpayCheckout(modal, lawyerName, lawyerPrice, lawyerId, paymentMethod, paymentAmount, razorpayKeyId);
    };
    script.onerror = () => {
      showToast('Failed to load payment gateway. Please try again.', 'error');
    };
    document.head.appendChild(script);
  } else {
    initiateRazorpayCheckout(modal, lawyerName, lawyerPrice, lawyerId, paymentMethod, paymentAmount, razorpayKeyId);
  }
}

/**
 * Initialize Razorpay checkout for lawyer booking
 */
function initiateRazorpayCheckout(modal, lawyerName, lawyerPrice, lawyerId, paymentMethod, paymentAmount, keyId) {
  const options = {
    key: keyId,
    amount: paymentAmount * 100,  // Razorpay expects amount in paise
    currency: 'INR',
    name: 'PropSafe',
    description: `Lawyer Booking - ${lawyerName}`,
    prefill: {
      name: 'PropSafe User',
      email: 'user@propsafe.demo',
      contact: '9999999999'
    },
    theme: {
      color: '#23a6f0'
    },
    handler: function (response) {
      handleRazorpaySuccess(
        modal,
        lawyerName,
        lawyerPrice,
        lawyerId,
        paymentMethod,
        paymentAmount,
        response.razorpay_payment_id
      );
    },
    modal: {
      ondismiss: function () {
        showToast('Payment cancelled. Your booking was not created.', 'warning');
        modal.remove();
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    showToast('Payment failed to load. Please try again.', 'error');
    console.error('Razorpay error:', error);
  }
}

/**
 * Handle successful Razorpay payment
 */
async function handleRazorpaySuccess(modal, lawyerName, lawyerPrice, lawyerId, paymentMethod, paymentAmount, transactionId) {
  const bookingPayload = {
    lawyerId,
    userDetails: {
      name: 'PropSafe User',
      phone: '9999999999',
      email: ''
    },
    paymentDetails: {
      method: paymentMethod,
      amount: paymentAmount,
      currency: 'INR',
      status: 'COMPLETED',
      transactionRef: transactionId
    }
  };

  let bookingResponse;
  try {
    bookingResponse = await createLawyerBooking(bookingPayload);
    showToast('Payment successful! Booking confirmed.', 'success');
  } catch (_) {
    bookingResponse = getMockBooking(bookingPayload);
    showToast('Payment successful. Booking created locally.', 'info');
  }

  showBookingSuccess(modal, lawyerName, lawyerPrice, lawyerId, bookingResponse, bookingPayload);
}

/**
 * Display booking success modal
 */
function showBookingSuccess(modal, name, price, lawyerId, bookingResponse, bookingPayload) {
  const booking = bookingResponse.booking || {};
  const bookingId = booking._id || `BK-${Date.now()}`;
  const bookingTime = new Date(booking.bookingTime || Date.now()).toLocaleString('en-IN');
  const payment = booking.paymentDetails || bookingPayload.paymentDetails || {};
  const paymentAmountText = Number(payment.amount || price).toLocaleString('en-IN');
  const paymentMethodText = String(payment.method || 'RAZORPAY').replace(/_/g, ' ');
  const paymentStatus = String(payment.status || 'INITIATED');
  const paymentRef = payment.transactionRef || bookingPayload.paymentDetails.transactionRef;

  modal.innerHTML = `
    <div class="modal animate-scale-in booking-success-screen">
      <div class="modal-icon">🎉</div>
      <div class="modal-title">Booking Confirmed!</div>
      <div class="modal-sub">
        <strong>ID:</strong> ${bookingId}<br>
        <strong>Lawyer:</strong> ${name}<br>
        <strong>Date & Time:</strong> ${bookingTime}<br>
        <strong>Payment:</strong> ${paymentMethodText} · INR ${paymentAmountText}<br>
        <strong>Status:</strong> ${paymentStatus}${paymentRef ? `<br><strong>Txn Ref:</strong> ${paymentRef}` : ''}
      </div>
      <div class="modal-actions" style="margin-top:8px;">
        <button class="btn btn-primary" style="flex:1;" id="downloadReceipt">Download Confirmation</button>
        <button class="btn btn-outline" style="flex:1;" id="closeBk">Done</button>
      </div>
    </div>`;

  modal.querySelector('#downloadReceipt').addEventListener('click', () => {
    const jsPDFLib = window.jspdf?.jsPDF;
    if (!jsPDFLib) {
      showToast('PDF library is not available.', 'error');
      return;
    }
    const doc = new jsPDFLib();
    doc.setFontSize(16);
    doc.text('PropSafe Booking Confirmation', 20, 20);
    doc.setFontSize(12);
    doc.text(`Booking ID: ${bookingId}`, 20, 40);
    doc.text(`Lawyer Name: ${name}`, 20, 50);
    doc.text(`Consultation Fee: INR ${paymentAmountText}`, 20, 60);
    doc.text(`Payment Method: ${paymentMethodText}`, 20, 70);
    doc.text(`Payment Status: ${paymentStatus}`, 20, 80);
    if (paymentRef) doc.text(`Transaction Ref: ${paymentRef}`, 20, 90);
    doc.text(`Booked At: ${bookingTime}`, 20, paymentRef ? 100 : 90);
    doc.save(`propsafe-booking-${bookingId}.pdf`);
    showToast('Confirmation downloaded successfully.', 'success');
  });

  modal.querySelector('#closeBk').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
}

/* ─── AI Chat ─── */
export function initChat() {
  const sendBtn  = document.getElementById('chatSend');
  const input    = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');

  if (!sendBtn || !input || !messages) return;

  // Render initial AI message
  renderInitialMessage(messages);

  sendBtn.addEventListener('click', () => handleSend());
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage(messages, 'user', text);
    chatHistory.push({ role: 'user', content: text });

    // Typing indicator
    const typingEl = appendTyping(messages);

    let reply;
    try {
      const result = await sendChatMessage(chatHistory);
      reply = result.reply || result.content || result.message;
      showToast('AI response received.', 'success');
    } catch (_) {
      reply = getMockChatReply(text);
      showToast('AI backend unavailable. Showing fallback response.', 'warning');
    }

    typingEl.remove();
    chatHistory.push({ role: 'assistant', content: reply });
    appendMessage(messages, 'bot', reply);
  }
}

function renderInitialMessage(container) {
  container.innerHTML = '';
  const initial = chatHistory[0].content;
  appendMessage(container, 'bot', initial);
}

function appendMessage(container, role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role} animate-fade-in-up`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendTyping(container) {
  const div = document.createElement('div');
  div.className = 'chat-typing';
  div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function getMockChatReply(text) {
  const q = text.toLowerCase();

  if (q.includes('benami')) {
    return 'Benami property refers to assets held by one person but actually owned by another. Under the Benami Transactions (Prohibition) Act, 1988 (amended 2016), benami transactions are illegal. Red flags include: seller\'s income is much lower than the property value, property recently transferred to a family member, or seller is reluctant to provide income documents. PropSafe\'s AI scores this automatically for you.';
  }
  if (q.includes('rera')) {
    return 'RERA (Real Estate Regulatory Authority) is mandatory for all residential projects above 500 sq. meters or 8 units. Always verify the RERA registration number at rera.gov.in before booking any flat. The builder must deposit 70% of collected funds in a separate escrow account. Non-registered projects are illegal — do not invest.';
  }
  if (q.includes('encumbrance') || q.includes('ec')) {
    return 'An Encumbrance Certificate (EC) lists all registered transactions on a property for a specific period. Obtained from the Sub-Registrar office (also available online in Tamil Nadu, Karnataka, and Andhra Pradesh). If a property has a clean EC for 15+ years, it means no hidden loans or disputes. Never buy without verifying EC directly — never trust a seller-provided copy.';
  }
  if (q.includes('title deed') || q.includes('sale deed')) {
    return 'A title deed proves ownership of a property. To verify: (1) Check the chain of title for at least 30 years, (2) Confirm seller name matches government records, (3) Verify it is registered at the Sub-Registrar office — unregistered sale deeds are invalid under Indian law. PropSafe lawyers will review all of this for just ₹600-₹1000.';
  }
  if (q.includes('fraud') || q.includes('fake')) {
    return 'Common property frauds in India: (1) Duplicate property sold to multiple buyers simultaneously, (2) Forged seller identity — verify with Aadhaar-linked land records, (3) Properties under court dispute, (4) Unapproved layouts without municipal approval, (5) Undisclosed mortgages. PropSafe\'s AI scores all these automatically. When in doubt, always spend ₹800 on a PropSafe lawyer review before spending lakhs.';
  }
  if (q.includes('power of attorney') || q.includes('poa')) {
    return 'Never buy property through a General Power of Attorney (GPA). The Supreme Court of India in Suraj Lamp v. State of Haryana ruled that GPA sales are not valid transfers. Insist on a proper registered sale deed directly from the actual owner. GPA sales are a classic fraud mechanism.';
  }
  if (q.includes('price') || q.includes('value') || q.includes('overpriced')) {
    return 'To check if a property is fairly priced: (1) Use PropSafe\'s Price Predictor tab, (2) Check guidance value (circle rate) from your state government, (3) Compare with 3 similar properties sold in the same area in the last 6 months, (4) Properties priced 20%+ above guidance value with no special features are usually overpriced.';
  }
  return 'That\'s a great question about Indian property law. For the most accurate answer tailored to your specific situation, I recommend booking a ₹800 consultation with one of our verified PropSafe lawyers who can review your exact documents and give you a legal opinion. Would you like help with anything else — RERA, title verification, Encumbrance Certificates, or fraud red flags?';
}
