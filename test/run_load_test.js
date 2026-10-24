const http = require('http');

// Config matching Genkai's stepped load engine (src/load.cpp)
const STAGE_DURATION_SEC = 3;
const MAX_ERROR_RATE = 1.0; // 1%
const MAX_P95_MS = 1000.0; // 1000ms
const CONCURRENCY_STAGES = [2, 4, 8, 16, 32, 64];

function sendRequest(options, postData = null) {
  return new Promise((resolve) => {
    const start = process.hrtime();
    const req = http.request(options, (res) => {
      res.on('data', () => {}); // Discard body
      res.on('end', () => {
        const diff = process.hrtime(start);
        const latencyMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
        const failed = res.statusCode < 200 || res.statusCode >= 400;
        resolve({ latencyMs, status: res.statusCode, failed });
      });
    });

    req.on('error', () => {
      const diff = process.hrtime(start);
      const latencyMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
      resolve({ latencyMs, status: 0, failed: true });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ latencyMs: 2000, status: 504, failed: true });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runStage(concurrency, durationSec, options, postData) {
  const deadline = Date.now() + durationSec * 1000;
  const results = [];

  const worker = async () => {
    while (Date.now() < deadline) {
      const res = await sendRequest(options, postData);
      results.push(res);
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const total = results.length;
  let failed = 0;
  const latencies = [];

  for (const r of results) {
    latencies.push(r.latencyMs);
    if (r.failed) failed++;
  }

  latencies.sort((a, b) => a - b);
  const successful = total - failed;
  const rps = Number((successful / durationSec).toFixed(1));
  const errorRate = total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0;
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const passed = errorRate <= MAX_ERROR_RATE && p95 <= MAX_P95_MS && total > 0;

  return {
    concurrency,
    durationSec,
    totalRequests: total,
    successful,
    failed,
    throughputRps: rps,
    errorRate,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    passed
  };
}

async function runTest(testName, options, postData = null) {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Load Test: ${testName}`);
  console.log(`Target: ${options.method || 'GET'} http://${options.host}:${options.port}${options.path}`);
  console.log(`Stage duration: ${STAGE_DURATION_SEC}s | Max P95: ${MAX_P95_MS}ms | Max Error: ${MAX_ERROR_RATE}%`);
  console.log(`======================================================`);

  const stageResults = [];
  let highestPassing = null;

  for (const conc of CONCURRENCY_STAGES) {
    process.stdout.write(`Testing with ${conc} workers... `);
    const result = await runStage(conc, STAGE_DURATION_SEC, options, postData);
    stageResults.push(result);

    console.log(`Throughput: ${result.throughputRps} req/s | P95: ${result.p95LatencyMs}ms | Errors: ${result.errorRate}% -> ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    if (result.passed) {
      highestPassing = result;
    } else {
      console.log(`🛑 Breaking point reached at ${conc} workers! Stopping test.`);
      break;
    }
  }

  const capacity = highestPassing ? {
    highestConcurrency: highestPassing.concurrency,
    sustainableRps: highestPassing.throughputRps,
    p95LatencyMs: highestPassing.p95LatencyMs,
    errorRate: highestPassing.errorRate,
    estimatedActiveUsers: Math.floor(highestPassing.throughputRps * 5.0)
  } : null;

  return {
    testName,
    target: `${options.method || 'GET'} ${options.path}`,
    stages: stageResults,
    capacity
  };
}

async function main() {
  const fs = require('fs');

  // Test 1: Products catalog (GET /api/products)
  const reportProducts = await runTest(
    'Products Catalog (GET)',
    { host: 'localhost', port: 3000, path: '/api/products', method: 'GET' }
  );

  // Test 2: Search Engine (GET /api/products/search?q=wireless)
  const reportSearch = await runTest(
    'Search Catalog (GET)',
    { host: 'localhost', port: 3000, path: '/api/products/search?q=wireless', method: 'GET' }
  );

  // Test 3: User Login (POST /api/auth/login)
  const loginPayload = JSON.stringify({ email: 'alex@example.com', password: 'password123' });
  const reportLogin = await runTest(
    'User Login (POST)',
    {
      host: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    },
    loginPayload
  );

  const fullReport = {
    timestamp: new Date().toISOString(),
    tests: [reportProducts, reportSearch, reportLogin]
  };

  fs.writeFileSync('test/load_results.json', JSON.stringify(fullReport, null, 2));
  console.log(`\n🎉 All tests completed! Detailed metrics saved to test/load_results.json\n`);
}

main().catch(console.error);
