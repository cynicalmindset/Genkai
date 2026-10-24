const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// IN-MEMORY DATABASE (Seeded for a realistic E-Commerce API)
// -----------------------------------------------------------------------------

const users = new Map(); // id -> user
const tokens = new Map(); // token -> userId
const cart = new Map(); // userId or session -> items
const orders = [];

// Seeded products catalog
const products = [
  { id: 1, name: 'Quantum Pro Wireless Headphones', category: 'Audio', price: 299.99, rating: 4.8, stock: 45, description: 'Active noise cancellation with 40-hour battery life and spatial audio.' },
  { id: 2, name: 'Nova Mechanical Keyboard', category: 'Peripherals', price: 149.00, rating: 4.9, stock: 120, description: 'Hot-swappable mechanical switches with per-key RGB and PBT keycaps.' },
  { id: 3, name: 'Aero Ultra-Light Gaming Mouse', category: 'Peripherals', price: 79.50, rating: 4.7, stock: 85, description: '62-gram honeycomb shell with 26,000 DPI optical sensor.' },
  { id: 4, name: 'Prism 4K Ultra-Wide Monitor', category: 'Displays', price: 749.99, rating: 4.6, stock: 18, description: '34-inch curved IPS panel with 144Hz refresh rate and 99% DCI-P3.' },
  { id: 5, name: 'Helix Ergonomic Chair', category: 'Furniture', price: 549.00, rating: 4.8, stock: 12, description: 'Adaptive lumbar support with breathable mesh and 4D armrests.' },
  { id: 6, name: 'Vortex USB-C Fast Charger 100W', category: 'Accessories', price: 49.99, rating: 4.5, stock: 300, description: 'GaN technology with 4 power delivery ports for laptops and phones.' },
  { id: 7, name: 'Echo Studio Smart Speaker', category: 'Audio', price: 199.99, rating: 4.7, stock: 65, description: 'High-fidelity audio with Dolby Atmos and built-in smart assistant.' },
  { id: 8, name: 'Titanium Smart Watch Series 5', category: 'Wearables', price: 399.00, rating: 4.6, stock: 40, description: 'Always-on AMOLED display, ECG monitor, and 7-day battery life.' },
  { id: 9, name: 'Aura Studio Microphone', category: 'Audio', price: 129.00, rating: 4.8, stock: 95, description: 'Cardioid condenser microphone with built-in pop filter and mute touch.' },
  { id: 10, name: 'Pulse RGB Lightbar', category: 'Accessories', price: 59.99, rating: 4.4, stock: 150, description: 'Screen-mounted desk lightbar with ambient backlight and wireless puck.' }
];

// Helper: Hash password with salt
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

// Seed a default test user
const defaultUserSalt = 'a1b2c3d4e5f6g7h8';
const defaultUserHash = hashPassword('password123', defaultUserSalt).hash;
users.set('usr_default', {
  id: 'usr_default',
  name: 'Alex Developer',
  email: 'alex@example.com',
  salt: defaultUserSalt,
  passwordHash: defaultUserHash,
  createdAt: new Date().toISOString()
});
tokens.set('tok_demo_alex_12345', 'usr_default');

// -----------------------------------------------------------------------------
// REAL-TIME TELEMETRY & EVENT STREAMING
// -----------------------------------------------------------------------------
let liveClients = []; // SSE connections
const telemetry = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  recentRequests: [],
  endpointStats: {},
  rpsHistory: []
};

// Push live request to connected browser monitors via Server-Sent Events
function broadcastEvent(eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  liveClients.forEach(client => {
    try {
      client.write(payload);
    } catch (_) {}
  });
}

// Request interceptor for telemetry
app.use((req, res, next) => {
  const startHr = process.hrtime();
  telemetry.totalRequests++;

  res.on('finish', () => {
    const diff = process.hrtime(startHr);
    const latencyMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
    const isError = res.statusCode >= 400;

    if (isError) telemetry.failedRequests++;
    else telemetry.successfulRequests++;

    const route = req.path;
    telemetry.endpointStats[route] = (telemetry.endpointStats[route] || 0) + 1;

    const reqItem = {
      id: Math.random().toString(36).substring(2, 9),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      latencyMs,
      time: new Date().toLocaleTimeString()
    };

    telemetry.recentRequests.unshift(reqItem);
    if (telemetry.recentRequests.length > 30) telemetry.recentRequests.pop();

    // Broadcast if SSE clients are listening
    if (liveClients.length > 0 && !req.path.startsWith('/api/telemetry')) {
      broadcastEvent({
        type: 'request',
        request: reqItem,
        totals: {
          total: telemetry.totalRequests,
          success: telemetry.successfulRequests,
          failed: telemetry.failedRequests
        }
      });
    }
  });

  next();
});

// SSE Endpoint for Live Browser Telemetry Stream
app.get('/api/telemetry/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  liveClients.push(res);

  req.on('close', () => {
    liveClients = liveClients.filter(c => c !== res);
  });
});

app.get('/api/telemetry/snapshot', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    total: telemetry.totalRequests,
    success: telemetry.successfulRequests,
    failed: telemetry.failedRequests,
    endpoints: telemetry.endpointStats,
    recent: telemetry.recentRequests,
    memoryMb: {
      rss: (mem.rss / 1024 / 1024).toFixed(1),
      heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1)
    }
  });
});

// Auth Middleware helper
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = tokens.get(token);
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = users.get(userId);
  next();
}

// -----------------------------------------------------------------------------
// AUTHENTICATION APIs
// -----------------------------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  // Check existing
  for (const u of users.values()) {
    if (u.email === email) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
  }

  const userId = 'usr_' + crypto.randomBytes(6).toString('hex');
  const { salt, hash } = hashPassword(password);

  const newUser = {
    id: userId,
    name,
    email,
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };

  users.set(userId, newUser);
  const token = 'tok_' + crypto.randomBytes(16).toString('hex');
  tokens.set(token, userId);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let foundUser = null;
  for (const u of users.values()) {
    if (u.email === email) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const { hash } = hashPassword(password, foundUser.salt);
  if (hash !== foundUser.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = 'tok_' + crypto.randomBytes(16).toString('hex');
  tokens.set(token, foundUser.id);

  res.json({
    message: 'Login successful',
    token,
    user: { id: foundUser.id, name: foundUser.name, email: foundUser.email }
  });
});

// GET /api/auth/me (Protected)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt
    }
  });
});

// -----------------------------------------------------------------------------
// PRODUCT CATALOG APIs
// -----------------------------------------------------------------------------

// GET /api/products (supports category filter, sorting, pagination)
app.get('/api/products', (req, res) => {
  let result = [...products];
  const { category, minPrice, maxPrice, sort } = req.query;

  if (category) {
    result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (minPrice) {
    result = result.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    result = result.filter(p => p.price <= parseFloat(maxPrice));
  }
  if (sort === 'price-asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    result.sort((a, b) => b.price - a.price);
  }

  res.json({
    count: result.length,
    products: result
  });
});

// GET /api/products/search?q=keyword (Search endpoint - perfect for load testing)
app.get('/api/products/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) {
    return res.json({ count: products.length, products });
  }

  const matches = products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.description.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query)
  );

  res.json({
    query,
    count: matches.length,
    products: matches
  });
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: `Product with ID ${id} not found.` });
  }

  res.json(product);
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  res.json({ categories });
});

// -----------------------------------------------------------------------------
// CART & ORDERS APIs
// -----------------------------------------------------------------------------

// GET /api/cart
app.get('/api/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default-session';
  const userCart = cart.get(sessionId) || [];
  const total = userCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  res.json({
    sessionId,
    itemCount: userCart.reduce((acc, i) => acc + i.quantity, 0),
    total: Number(total.toFixed(2)),
    items: userCart
  });
});

// POST /api/cart/add
app.post('/api/cart/add', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default-session';
  const { productId, quantity = 1 } = req.body;

  const product = products.find(p => p.id === parseInt(productId, 10));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!cart.has(sessionId)) {
    cart.set(sessionId, []);
  }

  const currentCart = cart.get(sessionId);
  const existing = currentCart.find(i => i.product.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    currentCart.push({ product, quantity });
  }

  res.status(200).json({
    message: 'Added to cart',
    cart: currentCart
  });
});

// POST /api/orders/checkout
app.post('/api/orders/checkout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default-session';
  const userCart = cart.get(sessionId) || [];

  if (userCart.length === 0) {
    return res.status(400).json({ error: 'Cannot checkout an empty cart.' });
  }

  const orderId = 'ord_' + crypto.randomBytes(4).toString('hex');
  const total = userCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const order = {
    orderId,
    items: [...userCart],
    total: Number(total.toFixed(2)),
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  cart.set(sessionId, []); // Clear cart

  res.status(201).json({
    message: 'Order placed successfully!',
    order
  });
});

// GET /api/orders
app.get('/api/orders', (req, res) => {
  res.json({ count: orders.length, orders });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛍️  NovaStore E-Commerce & Telemetry Server`);
  console.log(`======================================================`);
  console.log(`Web App & Live Monitor : http://localhost:${PORT}`);
  console.log(`Auth Endpoints         : POST /api/auth/login, POST /api/auth/register`);
  console.log(`Product Endpoints      : GET /api/products, GET /api/products/search`);
  console.log(`Cart & Checkout        : GET /api/cart, POST /api/cart/add, POST /api/orders/checkout`);
  console.log(`Test with Genkai       : ./build/genkai load http://localhost:${PORT}/api/products`);
  console.log(`======================================================\n`);
});
