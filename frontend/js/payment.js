/**
 * PropSafe — Razorpay Payment Integration
 * Handles payment modal, session storage, and access control
 */

const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID'; // Replace with actual key

const PRICING = {
  fraudReport: {
    name: 'Single Fraud Report',
    amount: 9900, // ₹99 in paise
    displayAmount: '₹99',
    features: ['Fraud Detection & Scoring', '24-hour access', 'Transaction ID']
  },
  fullAccess: {
    name: 'Full Premium Access',
    amount: 29900, // ₹299 in paise
    displayAmount: '₹299',
    features: ['Fraud Detection & Scoring', 'Price Predictor', 'Agentic AI Review', 'Municipal Verification', '30-day access']
  }
};

const PREMIUM_FEATURES = ['fraud', 'price', 'verify', 'gps'];

/**
 * Check if user has premium access in this session
 */
export function hasPremiumAccess() {
  return sessionStorage.getItem('propsafe_premium_access') === 'true';
}

/**
 * Mark user as having premium access for this session
 */
function setPremiumAccess(plan) {
  sessionStorage.setItem('propsafe_premium_access', 'true');
  sessionStorage.setItem('propsafe_premium_plan', plan);
  sessionStorage.setItem('propsafe_payment_time', new Date().toISOString());
}

/**
 * Clear premium access (simulate session end or logout)
 */
export function clearPremiumAccess() {
  sessionStorage.removeItem('propsafe_premium_access');
  sessionStorage.removeItem('propsafe_premium_plan');
  sessionStorage.removeItem('propsafe_payment_time');
}

/**
 * Show payment modal
 */
export function showPaymentModal(featureName = 'full') {
  const modal = document.getElementById('paymentModal');
  if (!modal) {
    console.error('Payment modal not found in DOM');
    return;
  }

  // Highlight selected plan
  document.querySelectorAll('.payment-plan').forEach(plan => {
    plan.classList.remove('selected');
  });
  
  const selectedPlan = document.getElementById(`plan-${featureName}`);
  if (selectedPlan) {
    selectedPlan.classList.add('selected');
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close payment modal
 */
export function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

/**
 * Handle payment plan selection and initiate Razorpay
 */
function initiatePayment(planKey) {
  const plan = PRICING[planKey];
  if (!plan) {
    console.error('Invalid plan:', planKey);
    return;
  }

  // Load Razorpay SDK if not already loaded
  if (!window.Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      _initiateRazorpayPayment(planKey, plan);
    };
    script.onerror = () => {
      showPaymentError('Failed to load Razorpay. Please check your internet connection.');
    };
    document.head.appendChild(script);
  } else {
    _initiateRazorpayPayment(planKey, plan);
  }
}

/**
 * Internal: Execute Razorpay payment flow
 */
function _initiateRazorpayPayment(planKey, plan) {
  const options = {
    key: RAZORPAY_KEY_ID,
    amount: plan.amount, // In paise
    currency: 'INR',
    name: 'PropSafe',
    description: plan.name,
    handler: function (response) {
      handlePaymentSuccess(planKey, response.razorpay_payment_id);
    },
    prefill: {
      name: 'PropSafe User',
      email: 'user@propsafe.demo',
      contact: '9999999999'
    },
    theme: {
      color: '#00d1b2'
    },
    modal: {
      ondismiss: function () {
        handlePaymentCancellation();
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    showPaymentError('Payment initialization failed. Please try again.');
    console.error('Razorpay error:', error);
  }
}

/**
 * Handle successful payment
 */
function handlePaymentSuccess(planKey, transactionId) {
  setPremiumAccess(planKey);

  // Show success modal
  const successModal = document.getElementById('paymentSuccessModal');
  if (successModal) {
    const plan = PRICING[planKey];
    document.getElementById('successFeatureName').textContent = plan.name;
    document.getElementById('successPlanAmount').textContent = plan.displayAmount;
    document.getElementById('successTransactionId').textContent = transactionId;
    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close main payment modal
    closePaymentModal();
  }
}

/**
 * Handle payment cancellation
 */
function handlePaymentCancellation() {
  showPaymentError('Payment was cancelled. Please try again.');
}

/**
 * Handle payment error
 */
function showPaymentError(message) {
  const errorEl = document.getElementById('paymentError');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Clear payment error display
 */
function clearPaymentError() {
  const errorEl = document.getElementById('paymentError');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

/**
 * Close payment success modal
 */
export function closeSuccessModal() {
  const modal = document.getElementById('paymentSuccessModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

/**
 * Gate feature access — check payment before allowing access
 */
export function gateFeatureAccess(featureName) {
  if (hasPremiumAccess()) {
    return true; // User has access
  }

  // Show payment modal
  showPaymentModal('fullAccess');
  return false;
}

/**
 * Initialize payment modal event listeners
 */
export function initPaymentModal() {
  // Close payment modal on background click
  const paymentModal = document.getElementById('paymentModal');
  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) {
        closePaymentModal();
      }
    });
  }

  // Close button for payment modal
  const closePaymentBtn = document.getElementById('closePaymentModal');
  if (closePaymentBtn) {
    closePaymentBtn.addEventListener('click', closePaymentModal);
  }

  // Plan selection buttons
  document.querySelectorAll('.payment-plan').forEach(plan => {
    plan.addEventListener('click', () => {
      const planKey = plan.dataset.plan;
      clearPaymentError();
      document.querySelectorAll('.payment-plan').forEach(p => p.classList.remove('selected'));
      plan.classList.add('selected');
    });
  });

  // Pay button
  const payBtn = document.getElementById('payNowBtn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      const selectedPlan = document.querySelector('.payment-plan.selected');
      if (!selectedPlan) {
        showPaymentError('Please select a plan');
        return;
      }
      clearPaymentError();
      const planKey = selectedPlan.dataset.plan;
      initiatePayment(planKey);
    });
  }

  // Success modal close button
  const closeSuccessBtn = document.getElementById('closeSuccessModal');
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', closeSuccessModal);
  }

  // Close success modal on background click
  const successModal = document.getElementById('paymentSuccessModal');
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        closeSuccessModal();
      }
    });
  }

  // Continue after successful payment
  const continueBtn = document.getElementById('continueAfterPaymentBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      closeSuccessModal();
      // Trigger the feature that was clicked before payment gate
      const pendingAction = sessionStorage.getItem('propsafe_pending_action');
      if (pendingAction) {
        sessionStorage.removeItem('propsafe_pending_action');
        if (pendingAction === 'fraud') {
          document.getElementById('analyzeBtn')?.click();
        } else if (pendingAction === 'price') {
          document.getElementById('predictBtn')?.click();
        } else if (pendingAction === 'verify') {
          document.getElementById('verifyPropertyBtn')?.click();
        } else if (pendingAction === 'agent') {
          document.getElementById('agentEvaluateBtn')?.click();
        }
      }
    });
  }
}
