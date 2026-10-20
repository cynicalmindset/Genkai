/**
 * GENKAI — Modern Performance Engineering CLI Landing Page Logic
 * Interactive telemetry, terminal emulator, regression comparator, and load testing sandbox
 * Enhanced with 60fps scroll observers, counter tickers, and card spotlight tracking
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveals();
  initSpotlightTracking();
  initQuickCopy();
  initRegressionComparator();
  initLoadSimulator();
  initTerminalSandbox();
  initHeroWireframeParallax();
});

/* ==========================================================================
   1. SCROLL-TRIGGERED REVEALS & NUMBER COUNTERS
   ========================================================================== */
function initScrollReveals() {
  const reveals = document.querySelectorAll('.reveal-on-scroll');
  const countUpElements = document.querySelectorAll('.count-up');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  reveals.forEach(el => revealObserver.observe(el));

  // Counter Observer
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  countUpElements.forEach(el => counterObserver.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target || 0);
  const decimals = parseInt(el.dataset.decimals || 0);
  const duration = 1200;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easeOutQuad
    const ease = 1 - (1 - progress) * (1 - progress);
    const current = (start + (target - start) * ease).toFixed(decimals);

    // Preserve unit span if present
    const unitSpan = el.querySelector('.stat-unit');
    const unit = unitSpan ? unitSpan.outerHTML : '';
    el.innerHTML = `${current}${unit}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* ==========================================================================
   2. INTERACTIVE CURSOR SPOTLIGHT TRACKING
   ========================================================================== */
function initSpotlightTracking() {
  const cards = document.querySelectorAll('.spotlight-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/* ==========================================================================
   3. QUICK COPY ACTIONS
   ========================================================================== */
function initQuickCopy() {
  const quickCopyPill = document.getElementById('quickCopyPill');
  const quickCopyBtn = document.getElementById('quickCopyBtn');

  const copyCommand = (e) => {
    e.stopPropagation();
    const cmd = 'genkai bench -- ./app';
    navigator.clipboard.writeText(cmd).then(() => {
      showCopyToast(quickCopyPill, 'Copied!');
    }).catch(() => {
      fallbackCopy(cmd);
      showCopyToast(quickCopyPill, 'Copied!');
    });
  };

  if (quickCopyPill) quickCopyPill.addEventListener('click', copyCommand);
  if (quickCopyBtn) quickCopyBtn.addEventListener('click', copyCommand);
}

function showCopyToast(element, text) {
  const originalHtml = element.innerHTML;
  const originalBg = element.style.background;
  
  element.style.background = '#FFFFFF';
  element.style.borderColor = '#10B981';
  
  const notif = document.createElement('span');
  notif.textContent = `✓ ${text}`;
  notif.style.color = '#10B981';
  notif.style.fontWeight = '700';
  notif.style.fontSize = '0.74rem';
  
  element.innerHTML = '';
  element.appendChild(notif);

  setTimeout(() => {
    element.innerHTML = originalHtml;
    element.style.background = originalBg;
    element.style.borderColor = '';
    const btn = element.querySelector('.copy-btn');
    if (btn) btn.addEventListener('click', (e) => e.stopPropagation());
  }, 1400);
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
}

/* ==========================================================================
   4. INTERACTIVE REGRESSION COMPARATOR
   ========================================================================== */
const regressionScenarios = {
  bad: {
    runtime: { before: 128.40, after: 159.34, delta: 24.1 },
    avgRam: { before: 4.12, after: 4.29, delta: 4.1 },
    peakRam: { before: 6.20, after: 7.18, delta: 15.8 }
  },
  good: {
    runtime: { before: 145.20, after: 118.77, delta: -18.2 },
    avgRam: { before: 4.50, after: 4.14, delta: -8.0 },
    peakRam: { before: 7.80, after: 6.95, delta: -10.9 }
  },
  leak: {
    runtime: { before: 94.10, after: 95.80, delta: 1.8 },
    avgRam: { before: 3.10, after: 4.30, delta: 38.7 },
    peakRam: { before: 4.40, after: 6.10, delta: 38.6 }
  }
};

let currentScenarioKey = 'bad';

function initRegressionComparator() {
  const scenarioBtns = document.querySelectorAll('.scenario-btn');
  const thresholdRange = document.getElementById('thresholdRange');
  const thresholdValue = document.getElementById('thresholdValue');

  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScenarioKey = btn.dataset.scenario;
      updateComparatorView();
    });
  });

  if (thresholdRange && thresholdValue) {
    thresholdRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value).toFixed(1);
      thresholdValue.textContent = val;
      updateComparatorView();
    });
  }

  updateComparatorView();
}

function updateComparatorView() {
  const scenario = regressionScenarios[currentScenarioKey];
  const threshold = parseFloat(document.getElementById('thresholdRange')?.value || 10.0);

  // Runtime
  const runtimeBefore = document.getElementById('runtimeBefore');
  const runtimeAfter = document.getElementById('runtimeAfter');
  const runtimeDelta = document.getElementById('runtimeDelta');
  const runtimeBar = document.getElementById('runtimeBar');

  if (runtimeBefore) runtimeBefore.innerHTML = `${scenario.runtime.before.toFixed(2)} <small>ms</small>`;
  if (runtimeAfter) runtimeAfter.innerHTML = `${scenario.runtime.after.toFixed(2)} <small>ms</small>`;
  if (runtimeDelta) {
    const isGain = scenario.runtime.delta < 0;
    runtimeDelta.textContent = `${isGain ? '' : '+'}${scenario.runtime.delta.toFixed(1)}%`;
    runtimeDelta.className = `metric-delta ${isGain ? 'delta-gain' : (scenario.runtime.delta >= threshold ? 'delta-regression' : 'delta-neutral')}`;
  }
  if (runtimeBar) {
    const widthPct = Math.min(100, Math.max(15, 50 + scenario.runtime.delta));
    runtimeBar.style.width = `${widthPct}%`;
    runtimeBar.className = `metric-bar-fill ${scenario.runtime.delta < 0 ? 'bar-gain' : (scenario.runtime.delta >= threshold ? 'bar-regression' : 'bar-neutral')}`;
  }

  // Avg RAM
  const avgRamBefore = document.getElementById('avgRamBefore');
  const avgRamAfter = document.getElementById('avgRamAfter');
  const avgRamDelta = document.getElementById('avgRamDelta');
  const avgRamBar = document.getElementById('avgRamBar');

  if (avgRamBefore) avgRamBefore.innerHTML = `${scenario.avgRam.before.toFixed(2)} <small>MB</small>`;
  if (avgRamAfter) avgRamAfter.innerHTML = `${scenario.avgRam.after.toFixed(2)} <small>MB</small>`;
  if (avgRamDelta) {
    const isGain = scenario.avgRam.delta < 0;
    avgRamDelta.textContent = `${isGain ? '' : '+'}${scenario.avgRam.delta.toFixed(1)}%`;
    avgRamDelta.className = `metric-delta ${isGain ? 'delta-gain' : (scenario.avgRam.delta >= threshold ? 'delta-regression' : 'delta-neutral')}`;
  }
  if (avgRamBar) {
    const widthPct = Math.min(100, Math.max(15, 50 + scenario.avgRam.delta));
    avgRamBar.style.width = `${widthPct}%`;
    avgRamBar.className = `metric-bar-fill ${scenario.avgRam.delta < 0 ? 'bar-gain' : (scenario.avgRam.delta >= threshold ? 'bar-regression' : 'bar-neutral')}`;
  }

  // Peak RAM
  const peakRamBefore = document.getElementById('peakRamBefore');
  const peakRamAfter = document.getElementById('peakRamAfter');
  const peakRamDelta = document.getElementById('peakRamDelta');
  const peakRamBar = document.getElementById('peakRamBar');

  if (peakRamBefore) peakRamBefore.innerHTML = `${scenario.peakRam.before.toFixed(2)} <small>MB</small>`;
  if (peakRamAfter) peakRamAfter.innerHTML = `${scenario.peakRam.after.toFixed(2)} <small>MB</small>`;
  if (peakRamDelta) {
    const isGain = scenario.peakRam.delta < 0;
    peakRamDelta.textContent = `${isGain ? '' : '+'}${scenario.peakRam.delta.toFixed(1)}%`;
    peakRamDelta.className = `metric-delta ${isGain ? 'delta-gain' : (scenario.peakRam.delta >= threshold ? 'delta-regression' : 'delta-neutral')}`;
  }
  if (peakRamBar) {
    const widthPct = Math.min(100, Math.max(15, 50 + scenario.peakRam.delta));
    peakRamBar.style.width = `${widthPct}%`;
    peakRamBar.className = `metric-bar-fill ${scenario.peakRam.delta < 0 ? 'bar-gain' : (scenario.peakRam.delta >= threshold ? 'bar-regression' : 'bar-neutral')}`;
  }

  // Status Banner Evaluation
  const banner = document.getElementById('regressionBanner');
  const bannerText = document.getElementById('regressionBannerText');

  const runtimeReg = scenario.runtime.delta >= threshold;
  const avgRamReg = scenario.avgRam.delta >= threshold;
  const peakRamReg = scenario.peakRam.delta >= threshold;

  if (runtimeReg || avgRamReg || peakRamReg) {
    banner.className = 'regression-status-banner banner-warning';
    let reasons = [];
    if (runtimeReg) reasons.push(`Runtime (+${scenario.runtime.delta.toFixed(1)}%)`);
    if (avgRamReg) reasons.push(`Average RAM (+${scenario.avgRam.delta.toFixed(1)}%)`);
    if (peakRamReg) reasons.push(`Peak RAM (+${scenario.peakRam.delta.toFixed(1)}%)`);

    bannerText.innerHTML = `<strong>[WARNING] Runtime regression detected!</strong> ${reasons.join(', ')} exceeded safety threshold (${threshold.toFixed(1)}%).`;
  } else {
    banner.className = 'regression-status-banner banner-success';
    bannerText.innerHTML = `<strong>[PASS] Clean build.</strong> All metrics within acceptable variance (&lt; ${threshold.toFixed(1)}% threshold).`;
  }
}

/* ==========================================================================
   5. HTTP LOAD TEST SIMULATOR
   ========================================================================== */
function initLoadSimulator() {
  const reqSlider = document.getElementById('simRequests');
  const reqVal = document.getElementById('simRequestsVal');
  const concSlider = document.getElementById('simConcurrency');
  const concVal = document.getElementById('simConcurrencyVal');
  const btnRun = document.getElementById('btnRunLoadTest');
  const btnText = document.getElementById('simBtnText');
  const spinner = document.getElementById('simSpinner');
  const btnCopyJson = document.getElementById('btnCopyJson');

  if (reqSlider && reqVal) {
    reqSlider.addEventListener('input', (e) => reqVal.textContent = e.target.value);
  }

  if (concSlider && concVal) {
    concSlider.addEventListener('input', (e) => concVal.textContent = e.target.value);
  }

  generateHistogramBars(18.6, 34.2);

  if (btnRun) {
    btnRun.addEventListener('click', () => {
      btnRun.disabled = true;
      spinner.style.display = 'inline-block';
      btnText.textContent = 'SATURATING...';

      const requests = parseInt(reqSlider.value);
      const concurrency = parseInt(concSlider.value);

      setTimeout(() => {
        const baseLatency = 14 + (concurrency * 0.45);
        const avgLat = baseLatency + (Math.random() * 4);
        const p95Lat = avgLat * 1.78 + (Math.random() * 5);
        const durationSec = Math.max(0.8, (requests / (concurrency * 18.5))).toFixed(2);
        const rps = (requests / durationSec).toFixed(1);

        document.getElementById('resThroughput').innerHTML = `${rps} <small>RPS</small>`;
        document.getElementById('resAvgLatency').innerHTML = `${avgLat.toFixed(1)} <small>ms</small>`;
        document.getElementById('resP95').innerHTML = `${p95Lat.toFixed(1)} <small>ms</small>`;
        document.getElementById('resSuccessRate').textContent = '100%';

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        document.getElementById('dashFilename').textContent = `loadtest_${ts}.json`;

        generateHistogramBars(avgLat, p95Lat);

        spinner.style.display = 'none';
        btnText.textContent = 'EXECUTE LOAD TEST';
        btnRun.disabled = false;
      }, 600);
    });
  }

  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', () => {
      const jsonArtifact = {
        url: `https://${document.getElementById('simUrl').value}`,
        requests: parseInt(reqSlider.value),
        concurrency: parseInt(concSlider.value),
        throughput_rps: parseFloat(document.getElementById('resThroughput').innerText),
        average_latency_ms: parseFloat(document.getElementById('resAvgLatency').innerText),
        p95_latency_ms: parseFloat(document.getElementById('resP95').innerText),
        successful_requests: parseInt(reqSlider.value),
        http_errors: 0,
        failed_requests: 0
      };

      navigator.clipboard.writeText(JSON.stringify(jsonArtifact, null, 2)).then(() => {
        const orig = btnCopyJson.textContent;
        btnCopyJson.textContent = 'Copied!';
        setTimeout(() => btnCopyJson.textContent = orig, 1500);
      });
    });
  }
}

function generateHistogramBars(avgLat, p95Lat) {
  const container = document.getElementById('histogramStream');
  if (!container) return;
  container.innerHTML = '';

  const barCount = 52;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'h-bar';
    bar.style.animationDelay = `${(i * 0.012).toFixed(3)}s`;
    
    const factor = Math.exp(-Math.pow((i - (barCount * 0.32)) / 7.5, 2));
    let height = Math.max(6, factor * 88 + (Math.random() * 12));
    
    if (i > barCount * 0.74) {
      if (Math.random() > 0.38) {
        height = Math.max(28, (Math.random() * 75));
        bar.classList.add('p95-spike');
      }
    }

    bar.style.height = `${height}%`;
    container.appendChild(bar);
  }
}

/* ==========================================================================
   6. CLI SANDBOX TERMINAL EMULATOR WITH TYPING ANIMATION
   ========================================================================== */
const terminalCommands = {
  bench: {
    command: 'genkai bench --runs 5 -- ./dist/api_server',
    output: 
`<span class="term-dim">Benchmarking binary: ./dist/api_server across 5 runs...</span>
Run 1: 1.48 ms | Peak RAM: 2.15 MB
Run 2: 1.62 ms | Peak RAM: 2.38 MB
Run 3: 1.55 ms | Peak RAM: 2.41 MB
Run 4: 1.69 ms | Peak RAM: 2.30 MB
Run 5: 1.61 ms | Peak RAM: 2.41 MB

<span class="term-highlight">Genkai Benchmark Results</span>
------------------------
Runs: 5
Median: <span class="term-cyan">1.61 ms</span>
Minimum: <span class="term-green">1.48 ms</span>
Maximum: 1.69 ms
Average RAM: 2.33 MB
Peak RAM: <span class="term-cyan">2.41 MB</span>
Average: <span class="term-cyan">1.59 ms</span>

<span class="term-green">Results saved to: benchmark_20261020_134012.json</span>`
  },

  compare: {
    command: 'genkai compare old.json new.json --threshold 10.0',
    output:
`<span class="term-highlight">--- Genkai Comparison ---</span>

<span class="term-cyan">Runtime:</span>
Before: 128.40 ms
After:  159.34 ms
Change: <span class="term-red">+24.10%</span>

<span class="term-cyan">Average RAM:</span>
Before: 4.12 MB
After:  4.29 MB
Change: +4.13%

<span class="term-cyan">Peak RAM:</span>
Before: 6.20 MB
After:  7.18 MB
Change: <span class="term-red">+15.81%</span>
<span class="term-red">Performance decreased</span>

<span class="term-highlight">--- Regression Detection ---</span>
<span class="term-red">[WARNING] Runtime regression detected!</span>
<span class="term-red">[WARNING] Peak RAM usage increased significantly!</span>`
  },

  load: {
    command: 'genkai load https://httpbin.org/get --requests 200 --concurrency 10',
    output:
`<span class="term-highlight">--- Genkai HTTP Load Test ---</span>
URL: <span class="term-cyan">https://httpbin.org/get</span>
Requests: 200
Concurrency: 10
Duration: 3.82 s
Throughput: <span class="term-green">52.36 Requests/s</span>
Average latency: 18.62 ms
P95 latency: <span class="term-cyan">34.20 ms</span>
Successful requests: <span class="term-green">200</span>
HTTP errors: 0
Failed requests: 0

<span class="term-green">Results saved to: loadtest_20261020_132435.json</span>`
  },

  show: {
    command: 'genkai show benchmark_20261018_202619.json',
    output:
`<span class="term-highlight">Genkai Benchmark Results</span>
------------------------
Runs: 10
Median: 1.61 ms
Minimum: 1.01 ms
Maximum: 2.23 ms
Average RAM: 2.28 MB
Peak RAM: 2.41 MB
Average: 1.66 ms`
  },

  history: {
    command: 'genkai history',
    output:
`<span class="term-dim">Scanning workspace for benchmark artifacts...</span>
benchmark_20261018_202252.json
benchmark_20261018_202518.json
benchmark_20261018_202619.json
benchmark_20261020_134012.json

<span class="term-green">Found 4 historical benchmark artifacts.</span>`
  }
};

let typingTimer = null;

function initTerminalSandbox() {
  const tabs = document.querySelectorAll('.term-tab');
  const activeCmdSpan = document.getElementById('activeTermCommand');
  const outputDiv = document.getElementById('terminalOutput');
  const copyBtn = document.getElementById('btnCopyTermCommand');

  let currentCmd = 'bench';

  function renderCommand(key) {
    currentCmd = key;
    const data = terminalCommands[key];
    
    // Typing simulation on the prompt command
    if (typingTimer) clearTimeout(typingTimer);
    if (activeCmdSpan) {
      activeCmdSpan.textContent = '';
      let charIdx = 0;
      const fullCmd = data.command;

      function typeChar() {
        if (charIdx < fullCmd.length) {
          activeCmdSpan.textContent += fullCmd.charAt(charIdx);
          charIdx++;
          typingTimer = setTimeout(typeChar, 14);
        } else {
          if (outputDiv) {
            outputDiv.innerHTML = `<pre>${data.output}</pre>`;
          }
        }
      }
      typeChar();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCommand(tab.dataset.cmd);
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cmd = terminalCommands[currentCmd].command;
      navigator.clipboard.writeText(cmd).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = orig, 1500);
      });
    });
  }

  renderCommand('bench');
}

/* ==========================================================================
   7. HERO WIREFRAME PARALLAX
   ========================================================================== */
function initHeroWireframeParallax() {
  const heroSection = document.getElementById('hero');
  const bars = document.querySelectorAll('.wireframe-bar');

  if (!heroSection || bars.length === 0) return;

  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    
    bars.forEach((bar, idx) => {
      const speed = (idx + 1) * 3;
      bar.style.transform = `translateX(${xPct * speed}px)`;
    });
  });

  heroSection.addEventListener('mouseleave', () => {
    bars.forEach(bar => {
      bar.style.transform = 'translateX(0px)';
      bar.style.transition = 'transform 0.5s ease-out';
    });
  });
}
