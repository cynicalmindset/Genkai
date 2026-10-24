# NovaStore — Realistic E-Commerce & Systems Load Test Server

This is a real-world e-commerce REST API & interactive frontend portal built specifically for testing **Genkai**.

---

## 🚀 How to Start the Server

```bash
cd test
npm start
```

Then open your browser to **http://localhost:3000** to see the interactive storefront and the real-time systems telemetry monitor.

---

## 🛒 Real-World APIs Available

### 1. Products & Catalog (Perfect for Genkai Load Testing)
- **`GET /api/products`**: Fetch full catalog with price and category filtering.
- **`GET /api/products/search?q=wireless`**: Full-text catalog search.
- **`GET /api/products/:id`**: Individual product lookup by ID.
- **`GET /api/categories`**: Distinct categories list.

### 2. User Authentication (Registration & Login)
- **`POST /api/auth/register`**: Registers a new user with salted cryptographic password hashing (`crypto.pbkdf2Sync`) and returns a bearer auth token.
- **`POST /api/auth/login`**: Authenticates email & password, returns an active session token.
- **`GET /api/auth/me`**: Protected profile endpoint (requires `Authorization: Bearer <token>`).

> **Pre-seeded demo account**:
> - Email: `alex@example.com`
> - Password: `password123`

### 3. Shopping Cart & Orders
- **`GET /api/cart`**: Retrieves active cart items and calculated subtotal.
- **`POST /api/cart/add`**: Adds a product with quantity to the session cart.
- **`POST /api/orders/checkout`**: Confirms an order, generates an `ord_xxxx` ID, and clears the cart.
- **`GET /api/orders`**: Lists all confirmed orders.

### 4. Real-time Telemetry & Server-Sent Events (SSE)
- **`GET /api/telemetry/live`**: SSE stream feeding live HTTP requests and status codes into the web dashboard at 60fps.
- **`GET /api/telemetry/snapshot`**: JSON telemetry snapshot with route frequency and process RAM metrics.

---

## ⚡ Testing With Genkai

Keep the server running in one terminal, and in another terminal run:

```bash
# 1. Stress test the product catalog
./build/genkai load http://localhost:3000/api/products

# 2. Stress test the search engine endpoint
./build/genkai load http://localhost:3000/api/products/search?q=wireless
```

While Genkai is running in your terminal, keep `http://localhost:3000` open in your browser — you will see the **Live Server Telemetry** feed light up with real-time requests, status codes, and latency measurements as Genkai tests the system's breaking point!
