// State
let currentCategory = '';
let currentAuthToken = localStorage.getItem('nova_token') || '';
let currentUser = null;
const sessionId = 'sess_' + (localStorage.getItem('nova_session') || Math.random().toString(36).substring(2, 9));
localStorage.setItem('nova_session', sessionId);

// Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const requestFeed = document.getElementById('requestFeed');
const totalReqCount = document.getElementById('totalReqCount');
const successReqCount = document.getElementById('successReqCount');
const failedReqCount = document.getElementById('failedReqCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const cartTotalDisplay = document.getElementById('cartTotalDisplay');
const authModal = document.getElementById('authModal');
const userStatusText = document.getElementById('userStatusText');

// -----------------------------------------------------------------------------
// 1. LIVE SERVER-SENT EVENTS (SSE) TELEMETRY
// -----------------------------------------------------------------------------
function setupTelemetryStream() {
  const eventSource = new EventSource('/api/telemetry/live');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'request') {
        renderLiveRequest(data.request);
        if (data.totals) {
          totalReqCount.textContent = data.totals.total;
          successReqCount.textContent = data.totals.success;
          failedReqCount.textContent = data.totals.failed;
        }
      }
    } catch (err) {
      console.error('SSE Parse Error:', err);
    }
  };

  eventSource.onerror = () => {
    document.getElementById('streamStatus').textContent = 'RECONNECTING...';
    document.getElementById('streamStatus').style.color = '#f39c12';
  };

  eventSource.onopen = () => {
    document.getElementById('streamStatus').textContent = 'STREAM ACTIVE';
    document.getElementById('streamStatus').style.color = '#2ecc71';
  };
}

function renderLiveRequest(req) {
  // Remove empty placeholder
  const empty = requestFeed.querySelector('.empty-feed');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = `req-row status-${req.status >= 500 ? '500' : req.status >= 400 ? '400' : '200'}`;

  row.innerHTML = `
    <div class="req-left">
      <span class="method-tag method-${req.method}">${req.method}</span>
      <span class="req-path" title="${req.path}">${req.path}</span>
    </div>
    <div class="req-right">
      <span class="req-latency">${req.latencyMs}ms</span>
      <span class="req-status ${req.status >= 400 ? 'text-red' : 'text-green'}">${req.status}</span>
    </div>
  `;

  requestFeed.prepend(row);

  // Keep feed max 40 rows
  if (requestFeed.children.length > 40) {
    requestFeed.removeChild(requestFeed.lastChild);
  }
}

// -----------------------------------------------------------------------------
// 2. PRODUCT CATALOG
// -----------------------------------------------------------------------------
async function loadProducts(cat = '', query = '') {
  try {
    let url = '/api/products';
    if (query) {
      url = `/api/products/search?q=${encodeURIComponent(query)}`;
    } else if (cat) {
      url = `/api/products?category=${encodeURIComponent(cat)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    renderProducts(data.products || []);
  } catch (err) {
    productsGrid.innerHTML = `<div class="empty-feed">Failed to load products: ${err.message}</div>`;
  }
}

function renderProducts(products) {
  if (products.length === 0) {
    productsGrid.innerHTML = `<div class="empty-feed">No products found.</div>`;
    return;
  }

  productsGrid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="card-top">
        <span class="product-badge">${p.category}</span>
        <span class="product-rating">★ ${p.rating}</span>
      </div>
      <div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
      </div>
      <div class="card-bottom">
        <span class="product-price">$${p.price.toFixed(2)}</span>
        <button class="btn-add" onclick="addToCart(${p.id})">+ Add to Cart</button>
      </div>
    </div>
  `).join('');
}

// Category filter clicks
document.getElementById('categoryFilters').addEventListener('click', (e) => {
  if (e.target.classList.contains('cat-chip')) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentCategory = e.target.dataset.cat;
    searchInput.value = '';
    loadProducts(currentCategory);
  }
});

// Search input
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = e.target.value.trim();
    loadProducts(currentCategory, q);
  }, 200);
});

// -----------------------------------------------------------------------------
// 3. CART OPERATIONS
// -----------------------------------------------------------------------------
async function addToCart(productId) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    const data = await res.json();
    updateCartUI();
  } catch (err) {
    alert('Error adding to cart: ' + err.message);
  }
}

async function updateCartUI() {
  try {
    const res = await fetch('/api/cart', {
      headers: { 'x-session-id': sessionId }
    });
    const data = await res.json();
    cartCount.textContent = data.itemCount || 0;
    cartTotalDisplay.textContent = `$${(data.total || 0).toFixed(2)}`;

    if (!data.items || data.items.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart">Your cart is currently empty.</div>';
      return;
    }

    cartItems.innerHTML = data.items.map(item => `
      <div class="cart-item-row">
        <div>
          <strong>${item.product.name}</strong>
          <div style="color:var(--text-muted);font-size:11px;">Qty: ${item.quantity} × $${item.product.price.toFixed(2)}</div>
        </div>
        <div>$${(item.quantity * item.product.price).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to update cart', err);
  }
}

function toggleCart() {
  cartDrawer.classList.toggle('open');
  if (cartDrawer.classList.contains('open')) {
    updateCartUI();
  }
}

async function checkoutOrder() {
  try {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');

    alert(`🎉 Order Confirmed!\nOrder ID: ${data.order.orderId}\nTotal: $${data.order.total}`);
    updateCartUI();
    toggleCart();
  } catch (err) {
    alert(err.message);
  }
}

// -----------------------------------------------------------------------------
// 4. AUTHENTICATION (LOGIN / REGISTER)
// -----------------------------------------------------------------------------
function openAuthModal() {
  authModal.classList.add('open');
}

function closeAuthModal() {
  authModal.classList.remove('open');
  document.getElementById('authMessage').style.display = 'none';
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerForm').style.display = !isLogin ? 'block' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('authMessage');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed');

    currentAuthToken = data.token;
    currentUser = data.user;
    localStorage.setItem('nova_token', currentAuthToken);

    userStatusText.textContent = `👤 ${data.user.name}`;
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(46, 204, 113, 0.2)';
    msgEl.style.color = '#2ecc71';
    msgEl.textContent = 'Signed in successfully!';
    setTimeout(closeAuthModal, 800);
  } catch (err) {
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(255, 71, 87, 0.2)';
    msgEl.style.color = '#ff4757';
    msgEl.textContent = err.message;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const msgEl = document.getElementById('authMessage');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Registration failed');

    currentAuthToken = data.token;
    currentUser = data.user;
    localStorage.setItem('nova_token', currentAuthToken);

    userStatusText.textContent = `👤 ${data.user.name}`;
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(46, 204, 113, 0.2)';
    msgEl.style.color = '#2ecc71';
    msgEl.textContent = 'Account created successfully!';
    setTimeout(closeAuthModal, 800);
  } catch (err) {
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(255, 71, 87, 0.2)';
    msgEl.style.color = '#ff4757';
    msgEl.textContent = err.message;
  }
}

// -----------------------------------------------------------------------------
// 5. SIMULATED BURST & GENKAI HELPER
// -----------------------------------------------------------------------------
function copyGenkaiCmd(btn) {
  navigator.clipboard.writeText('./build/genkai load http://localhost:3000/api/products');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 1500);
}

// Simulate firing concurrent requests right from the browser to see live stream immediately
async function simulateBurst(count) {
  const routes = [
    '/api/products',
    '/api/products/search?q=wireless',
    '/api/products/search?q=chair',
    '/api/products/1',
    '/api/categories'
  ];

  for (let i = 0; i < count; i++) {
    const route = routes[i % routes.length];
    fetch(route).catch(() => {});
  }
}

// Init
setupTelemetryStream();
loadProducts();
updateCartUI();
