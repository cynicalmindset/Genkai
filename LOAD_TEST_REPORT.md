
# 🍦 Genkai Load Test Report: NovaStore E-Commerce

> **Test Date:** October 2026  
> **Target Server:** NovaStore REST API (`http://localhost:3000`)  
> **Testing Engine:** Genkai Stepped Concurrency Load Model  

---

## 🧸 Part 1: Explain Like I'm 5 (The Ice Cream Shop Story)

Imagine your computer server is a friendly **Ice Cream Shop** run by a chef.

```
       [ 🍦 Ice Cream Shop ]
                ▲
    ═════════════════════════  <-- Counter
      🧒   👧   🧒   👧   🧒    <-- Customers (Concurrent Workers)
```

### 1. What is "Concurrency"? (The Kids in Line)
* **Concurrency** is how many kids walk up to the ice cream counter **at the exact same second**.
* If concurrency is **2**, two kids ask for ice cream at the same time.
* If concurrency is **64**, sixty-four kids are all crowding the counter shouting their orders at once!

---

### 2. What is "Throughput / RPS"? (Scoops Per Second)
* **RPS** means **Requests Per Second**.
* It’s simply: *How many ice cream cones can the chef make and hand over in 1 single second?*
* In our test, the chef was super fast: handing out over **10,000 ice creams every single second** for browsing products!

---

### 3. What is "Latency"? (The Wait Time)
* **Latency** is how many milliseconds a kid has to wait from saying *"I want chocolate!"* to holding the cone.
* A blink of a human eye takes **300 milliseconds**.
* Our server gave kids their ice cream in just **1 to 8 milliseconds**—that's faster than a hummingbird's wings!

---

### 4. What is "P95 Latency"? (The Unlucky 5th Kid)
* Imagine 100 kids buy ice cream.
* 95 of them get their cone in **1 millisecond**.
* But 5 kids wait longer because someone dropped sprinkles or the freezer door stuck.
* **P95** ignores the lucky average and looks at the **95th kid**. It asks: *"Even for the slower kids, was the wait still acceptable?"*
* Genkai says: If P95 is worse than **1000 ms (1 second)**, the shop is too slow and fails!

---

### 5. Why was "Login" 5x Slower than "Viewing Products"?
* **Looking at products (`GET /api/products`)**: The toys are already on the shelf. The chef just points and says *"Here you go!"*
* **Logging in (`POST /api/auth/login`)**: The chef has to stop, pull out a giant locked safe, run a secret mathematical cipher (PBKDF2 cryptographic hashing) to verify the kid's secret password stamp. 
* Because checking passwords requires real brain work (CPU math), the shop could only do **~1,990 logins per second**, compared to **10,500 product views per second**!

---

### 6. What is the "Breaking Point" (The Genkai)?
* **Genkai (限界)** means **Limit**.
* The load test keeps adding more and more kids: 2... 4... 8... 16... 32... 64...
* As long as the chef doesn't drop cones (Error Rate < 1%) and doesn't take longer than 1 second (P95 < 1000ms), the test keeps going.
* The moment the chef gets overwhelmed or drops an ice cream, Genkai shouts **"STAGE FAILED!"** and records the maximum safe speed.

---

## 📊 Part 2: Real Test Results & Numbers

We tested 3 real-world scenarios on our NovaStore API. Here are the live results:

### Test 1: Browsing Products (`GET /api/products`)
*Pure database/catalog read test.*

| Workers (Kids in Line) | Speed (Requests/sec) | P50 (Average Wait) | P95 (Slowest 5% Wait) | Errors | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **2 workers** | 3,031 req/s | 0.58 ms | 0.99 ms | 0% | PASSED ✅ |
| **4 workers** | 5,144 req/s | 0.71 ms | 1.23 ms | 0% | PASSED ✅ |
| **8 workers** | 8,716 req/s | 0.83 ms | 1.38 ms | 0% | PASSED ✅ |
| **16 workers** | 10,038 req/s | 1.51 ms | 2.20 ms | 0% | PASSED ✅ |
| **32 workers** | 10,315 req/s | 3.02 ms | 4.03 ms | 0% | PASSED ✅ |
| **64 workers** | 10,285 req/s | 6.10 ms | 7.63 ms | 0% | PASSED ✅ |

> **🏆 Capacity Verdict:** The server safely supports **10,285 requests/sec**. Assuming a normal person clicks once every 5 seconds, this single server can easily handle **~51,425 active users** shopping at the same time!

---

### Test 2: Catalog Search (`GET /api/products/search?q=wireless`)
*Filtering and keyword scanning across titles and descriptions.*

| Workers | Speed (Requests/sec) | P50 Wait | P95 Wait | Errors | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **2 workers** | 3,491 req/s | 0.53 ms | 0.85 ms | 0% | PASSED ✅ |
| **8 workers** | 9,086 req/s | 0.81 ms | 1.28 ms | 0% | PASSED ✅ |
| **16 workers** | 10,476 req/s | 1.44 ms | 2.08 ms | 0% | PASSED ✅ |
| **32 workers** | 10,587 req/s | 2.94 ms | 3.91 ms | 0% | PASSED ✅ |
| **64 workers** | 10,213 req/s | 6.10 ms | 8.04 ms | 0% | PASSED ✅ |

> **🏆 Capacity Verdict:** Peaked at **10,587 req/s** with sub-4ms P95 latency. Supports **~51,000 active searchers**!

---

### Test 3: User Login (`POST /api/auth/login`)
*Secure cryptographic password verification (`crypto.pbkdf2Sync`).*

| Workers | Speed (Requests/sec) | P50 Wait | P95 Wait | Errors | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **2 workers** | 1,756 req/s | 1.06 ms | 1.41 ms | 0% | PASSED ✅ |
| **8 workers** | 1,862 req/s | 4.18 ms | 4.91 ms | 0% | PASSED ✅ |
| **16 workers** | 1,956 req/s | 8.07 ms | 8.94 ms | 0% | PASSED ✅ |
| **32 workers** | 1,992 req/s | 15.99 ms | 16.97 ms | 0% | PASSED ✅ |
| **64 workers** | 1,841 req/s | 34.56 ms | 38.98 ms | 0% | PASSED ✅ |

> **💡 Why the Difference?** Notice that while Product Search handled 10,000 req/s, Login flattened out at **~1,990 req/s**. The CPU was busy calculating security hashes for every login attempt. However, even with 64 concurrent users logging in, the response was still super fast (38.9 ms, well under our 1000 ms limit)!

---

## 🎯 Summary Takeaway

1. **What Genkai does:** It acts like a flight test pilot for software—it pushes an app harder and harder until it reveals its true top speed and where it starts to creak.
2. **What our test proved:** The NovaStore backend is rock-solid. It processed over **200,000 HTTP requests** across all stages with **0% error rate** and lightning-fast sub-10ms response times.

---

## 🐧 Part 3: How to Test with Real C++ Genkai on Linux

Follow these exact steps on your Linux machine to run the actual compiled C++ `genkai` binary:

### 1. Ensure Prerequisites are Installed (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y build-essential cmake libcurl4-openssl-dev nodejs npm
```

### 2. Pull Latest Changes and Build Genkai
```bash
git pull origin main

# Build the C++ binary
mkdir -p build && cd build
cmake ..
make
cd ..
```

### 3. Start the Test Server in Terminal 1
```bash
cd test
npm install
npm start
```
*You will see:* `🛍️ NovaStore E-Commerce & Telemetry Server running on http://localhost:3000`

> **Tip:** Open `http://localhost:3000` in your browser to see the live telemetry screen!

### 4. Run Genkai Load Test in Terminal 2
From the project root:

```bash
# Test the product catalog (GET /api/products)
./build/genkai load http://localhost:3000/api/products

# Test search catalog (GET /api/products/search?q=wireless)
./build/genkai load http://localhost:3000/api/products/search?q=wireless
```

### What You Will See in Your Linux Terminal:
```text
testing: http://localhost:3000/api/products
duration of per stage: 5 sec

tesiting with 2 workers
Actual duration: 5.00 seconds
Total requests: 15210
Successful requests: 15210
Failed requests: 0
Successful throughput: 3042 req/s
Error rate: 0%
P95 latency: 1.12 ms
Stage result: PASSED

tesiting with 4 workers
...
--- CAPACITY REPORT ---
Highest passing concurrency: ... workers
Sustainable throughput: ... requests/sec
P95 latency: ... ms
Estimated active users: ...
```

As `genkai` runs through its concurrency stages (2, 4, 6, 8...), you can watch the requests stream onto your browser screen at `http://localhost:3000` in real time!

