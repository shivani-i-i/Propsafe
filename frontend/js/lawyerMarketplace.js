/**
 * PropSafe — Lawyer Marketplace Module (Tab 2)
 */
import { fetchLawyers, getMockLawyers, sendChatMessage, createLawyerBooking, getMockBooking } from './api.js';
import { showToast } from './toast.js';

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

  let lawyers;
  try {
    lawyers = await fetchLawyers(city, spec);
    showToast('Lawyers loaded successfully.', 'success');
  } catch (_) {
    lawyers = getMockLawyers(city, spec);
    showToast('Backend unavailable. Showing fallback lawyers.', 'warning');
  }

  btn && (btn.disabled = false);
  btn && (btn.innerHTML = `🔍 Find Lawyers`);

  if (!lawyers || lawyers.length === 0) {
    showToast('No lawyers found for the selected filters.', 'warning');
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">
        <div style="font-size:40px;margin-bottom:12px;">🔍</div>
        <div style="font-size:16px;font-weight:600;">No lawyers found for the selected filters.</div>
        <div style="font-size:13px;margin-top:6px;">Try selecting "All Cities" or a different specialization.</div>
      </div>`;
    return;
  }

  grid.innerHTML = lawyers.map(l => renderLawyerCard(l)).join('');

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
      <div class="modal-actions">
        <button class="btn btn-outline" style="flex:1;" id="cancelBooking">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" id="confirmBooking">✔ Confirm Booking</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#cancelBooking').addEventListener('click', () => modal.remove());
  modal.querySelector('#confirmBooking').addEventListener('click', async () => {
    const bookingPayload = {
      lawyerId,
      userDetails: {
        name: 'PropSafe User',
        phone: '9999999999',
        email: ''
      }
    };

    let bookingResponse;
    try {
      bookingResponse = await createLawyerBooking(bookingPayload);
      showToast('Booking created successfully.', 'success');
    } catch (_) {
      bookingResponse = getMockBooking(bookingPayload);
      showToast('Booking service unavailable. Created local confirmation.', 'warning');
    }

    const booking = bookingResponse.booking || {};
    const bookingId = booking._id || `BK-${Date.now()}`;
    const bookingTime = new Date(booking.bookingTime || Date.now()).toLocaleString('en-IN');

    modal.innerHTML = `
      <div class="modal animate-scale-in booking-success-screen">
        <div class="modal-icon">🎉</div>
        <div class="modal-title">Booking Confirmed!</div>
        <div class="modal-sub">
          <strong>ID:</strong> ${bookingId}<br>
          <strong>Lawyer:</strong> ${name}<br>
          <strong>Date & Time:</strong> ${bookingTime}
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
      doc.text(`Consultation Fee: ₹${price}`, 20, 60);
      doc.text(`Booked At: ${bookingTime}`, 20, 70);
      doc.save(`propsafe-booking-${bookingId}.pdf`);
      showToast('Confirmation downloaded successfully.', 'success');
    });

    modal.querySelector('#closeBk').addEventListener('click', () => modal.remove());
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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
