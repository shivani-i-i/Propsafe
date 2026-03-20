let container;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;

  container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

export function showToast(message, type = 'success', duration = 3000) {
  const host = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;

  host.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const hide = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  };

  const timer = setTimeout(hide, duration);

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    hide();
  });
}
