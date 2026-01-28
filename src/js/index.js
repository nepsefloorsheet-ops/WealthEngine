(function () {
  const dashboardController = new AbortController();

  document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // UTILITY FUNCTIONS
    // ---------------------------------------------------------
    const Utils = (() => {
      function parseAmount(text) {
        if (!text) return 0;
        return Number(text.replace(/[,₹]/g, "").trim()) || 0;
      }

      function formatNepaliNumber(x) {
        if (x === null || x === undefined) return "0.00";
        const [intPart, decPart] = Number(x).toFixed(2).toString().split(".");
        let lastThree = intPart.slice(-3);
        let otherNumbers = intPart.slice(0, -3);
        if (otherNumbers !== "") {
          otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
          return otherNumbers + "," + lastThree + "." + decPart;
        } else return lastThree + "." + decPart;
      }

      function clearElement(el) { domUtils.clearNode(el); }

      return { parseAmount, formatNepaliNumber, clearElement };
    })();


    // ---------------------------------------------------------
    // TRADE SUMMARY BAR
    // ---------------------------------------------------------
    const TradeSummary = (() => {
      const buyBar = document.querySelector(".buy-bar");
      const sellBar = document.querySelector(".sell-bar");
      const buyText = document.querySelector(".buy-text");
      const sellText = document.querySelector(".sell-text");
      const noTradeText = document.querySelector(".no-trade-text");

      function update() {
        const buyAmtEl = document.getElementById("buyamt");
        const sellAmtEl = document.getElementById("sellamt");
        if (!buyAmtEl || !sellAmtEl) return;

        const buyAmount = Utils.parseAmount(buyAmtEl.textContent);
        const sellAmount = Utils.parseAmount(sellAmtEl.textContent);

        if (buyAmount === 0 && sellAmount === 0) {
          if (buyBar) buyBar.style.width = "0%";
          if (sellBar) sellBar.style.width = "0%";
          if (buyText) buyText.textContent = "";
          if (sellText) sellText.textContent = "";
          if (noTradeText) noTradeText.style.display = "flex";
          return;
        }

        if (noTradeText) noTradeText.style.display = "none";
        const total = buyAmount + sellAmount;
        const buyPercent = (buyAmount / total) * 100;
        const sellPercent = 100 - buyPercent;

        if (buyBar) buyBar.style.width = `${buyPercent}%`;
        if (sellBar) sellBar.style.width = `${sellPercent}%`;
        if (buyText) buyText.textContent = `${buyPercent.toFixed(1)}%`;
        if (sellText) sellText.textContent = `${sellPercent.toFixed(1)}%`;
      }

      return { update };
    })();


    /* =========================================================
       COLLATERAL BAR
    ========================================================= */
    const Collateral = (() => {
      const utilizedBar = document.querySelector(".collateral-utilized");
      const availableBar = document.querySelector(".collateral-available");
      const utilizedValueEl = document.querySelector(".utilized-value");
      const availableValueEl = document.querySelector(".available-value");
      const utilizedPercentEl = document.querySelector(".utilized-percent");
      const availablePercentEl = document.querySelector(".available-percent");

      function update() {
        const buyAmtEl = document.getElementById("buyamt");
        if (!buyAmtEl || !availableValueEl) return;

        const buyAmount = Utils.parseAmount(buyAmtEl.textContent);
        const totalCollateral = Utils.parseAmount(availableValueEl.textContent);

        // [SYNC] Save to localStorage for other pages (like Order Page)
        localStorage.setItem('userCollateral', totalCollateral);

        utilizedValueEl.textContent = Utils.formatNepaliNumber(buyAmount);

        if (buyAmount === 0) {
          utilizedBar.style.display = "none";
          availableBar.style.display = "flex";
          availableBar.style.width = "100%";
          availablePercentEl.textContent = "100%";
          utilizedPercentEl.textContent = "";
          return;
        }

        const utilizedPercent = Math.min((buyAmount / totalCollateral) * 100, 100);
        const availablePercent = 100 - utilizedPercent;

        utilizedBar.style.display = availableBar.style.display = "flex";
        utilizedBar.style.width = `${utilizedPercent}%`;
        availableBar.style.width = `${availablePercent}%`;
        utilizedPercentEl.textContent = `${utilizedPercent.toFixed(1)}%`;
        availablePercentEl.textContent = `${availablePercent.toFixed(1)}%`;
      }

      return { update };
    })();


    /* =========================================================
       WATCHLIST (TABS + TABLE)
    ========================================================= */
    const Watchlist = (() => {
      const tabs = document.querySelectorAll(".head .lin");
      const watchBody = document.getElementById("watch-body");
      const theads = document.querySelectorAll(".watch-table thead");

      const watchData = {
        indwch: [], // Will be populated from subIndices API
        dpwch: [],
        wch: [] // Will be populated dynamically
      };

      // Load symbols from localStorage
      function getUserSymbols() {
        try {
          const saved = localStorage.getItem('watchlist');
          return saved ? JSON.parse(saved) : [];
        } catch (e) {
          return [];
        }
      }

      // Update watchlist data from live API result
      function updateFromLive(liveData, subIndices) {
        // 1. Handle Sectors (Sub-Indices)
        if (subIndices && Array.isArray(subIndices)) {
          watchData.indwch = subIndices.map(s => ({
            symbol: s.name || s.symbol,
            ltp: s.currentValue || 0,
            change: s.change || 0,
            pchange: s.changePercent || 0
          }));
        }

        // 2. Handle User Watchlist
        if (liveData && Array.isArray(liveData)) {
          const userSymbols = getUserSymbols();
          watchData.wch = liveData
            .filter(d => userSymbols.includes(d.symbol))
            .map(d => ({
              symbol: d.symbol,
              open: d.openPrice,
              high: d.highPrice,
              low: d.lowPrice,
              ltp: d.lastTradedPrice,
              change: d.change,
              pchange: d.percentageChange
            }));

          // 3. Handle DP Watchlist (Holdings)
          const holdingSymbols = JSON.parse(localStorage.getItem('holding_symbols') || '[]');
          watchData.dpwch = liveData
            .filter(d => holdingSymbols.includes(d.symbol))
            .map(d => ({
              symbol: d.symbol,
              open: d.openPrice,
              high: d.highPrice,
              low: d.lowPrice,
              ltp: d.lastTradedPrice,
              change: d.change,
              pchange: d.percentageChange
            }));
        }

        // Re-render the active tab
        const activeTab = document.querySelector(".head .lin.active");
        if (activeTab) {
          const type = activeTab.getAttribute("href").substring(1);
          render(type);
        }
      }

      function render(type) {
        if (!watchBody || !watchData[type]) return;

        theads.forEach(th => th.style.display = "none");
        const activeHead = document.getElementById(`head-${type}`);
        if (activeHead) activeHead.style.display = "";

        domUtils.clearNode(watchBody);

        if (watchData[type].length === 0) {
          if (LiveTopMarket && LiveTopMarket.isLoading && LiveTopMarket.isLoading()) {
            return;
          }
          watchBody.appendChild(domUtils.createElement('tr', {
            children: [
              domUtils.createElement('td', {
                attributes: { colspan: '7' },
                styles: { textAlign: 'center', padding: '20px', color: 'var(--text-muted)' },
                textContent: 'No data available'
              })
            ]
          }));
          return;
        }

        const fragment = document.createDocumentFragment();

        watchData[type].forEach(r => {
          let row;
          if (type === "indwch") {
            row = domUtils.createElement('tr', {
              children: [
                domUtils.createElement('td', { textContent: r.symbol }),
                domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.ltp) }),
                domUtils.createElement('td', { className: ['chg-driver', 'o'], textContent: String(r.change) }),
                domUtils.createElement('td', { className: 'o', textContent: `${r.pchange}%` })
              ]
            });
          } else {
            row = domUtils.createElement('tr', {
              children: [
                domUtils.createElement('td', { textContent: r.symbol }),
                domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.open) }),
                domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.high) }),
                domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.low) }),
                domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.ltp) }),
                domUtils.createElement('td', {
                  className: ['chg-driver', 'o'],
                  textContent: (r.change).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                }),
                domUtils.createElement('td', { className: 'o', textContent: `${r.pchange}%` })
              ]
            });
          }
          fragment.appendChild(row);
        });

        watchBody.appendChild(fragment);
        RowColor.apply();
      }

      tabs.forEach(tab => {
        tab.addEventListener("click", e => {
          e.preventDefault();
          tabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          render(tab.getAttribute("href").substring(1));
        });
      });

      return { render, updateFromLive };
    })();


    /* =========================================================
       ROW COLOR ENGINE
    ========================================================= */
    const RowColor = (() => {
      function apply() {
        document.querySelectorAll(".chg-driver").forEach(cell => {
          const row = cell.closest("tr");
          const val = parseFloat(cell.textContent);
          row.classList.remove("row-pos", "row-neg", "row-neu");

          if (isNaN(val) || val === 0) row.classList.add("row-neu");
          else if (val > 0) row.classList.add("row-pos");
          else row.classList.add("row-neg");
        });
      }
      return { apply };
    })();




    /* =========================================================
       LIVE TOP MARKET MODULE
       - Top Gainers
       - Top Losers
       - Top Turnover
       - Top Volume
       - Manual refresh only
    ========================================================= */

    const LiveTopMarket = (() => {

      /* ---------------- CONFIG ---------------- */
      const API_URL = "https://nepseapi-production-9edf.up.railway.app/live-nepse";
      const SECONDARY_API_URL = "https://dhanweb.up.railway.app/homepage-data";

      // Exclude non-tradable instruments
      const EXCLUDED_SECTORS = [
        "Mutual Fund",
        "Non-Convertible Debenture"
      ];

      /* ---------------- STATE ---------------- */
      async function fetchData() {
        const btn = document.getElementById("refresh-market");
        if (btn) {
          btn.disabled = true;
          btn.classList.add("spin");
        }
        loading = true;

        try {
          const res = await apiClient.get(API_URL, { 
            signal: dashboardController.signal,
            cacheKey: 'index_live_nepse'
          });
          let companies = Array.isArray(res.data) ? res.data : (res.liveData || []);

          const res2 = await apiClient.get(SECONDARY_API_URL, { 
            signal: dashboardController.signal,
            cacheKey: 'index_homepage_data'
          });
          const subIndices = res2.subIndices || [];

          if (companies.length === 0 && res2.liveCompanyData) {
            companies = res2.liveCompanyData;
          }

          processAndRender(companies, subIndices);
        } catch (err) {
          if (err.name !== 'AbortError') console.error("Dashboard Fetch Error:", err);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove("spin");
          }
          loading = false;
        }
      }

      function processAndRender(companies, subIndices) {
        const filtered = companies.filter(d => !EXCLUDED_SECTORS.includes(d.sector));

        gainers = filtered.filter(d => (d.percentageChange || 0) > 0)
          .sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 10);

        losers = filtered.filter(d => (d.percentageChange || 0) < 0)
          .sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 10);

        turnoverList = [...filtered].sort((a, b) => (b.totalTradeValue || 0) - (a.totalTradeValue || 0)).slice(0, 10);
        volumeList = [...filtered].sort((a, b) => (b.totalTradeQuantity || 0) - (a.totalTradeQuantity || 0)).slice(0, 10);

        renderGainers();
        renderLosers();
        renderTurnover();
        renderVolume();

        Watchlist.updateFromLive(companies, subIndices);
      }

      function loadFromCache() {
        const cachedNepse = apiClient.getCache('index_live_nepse');
        const cachedHome = apiClient.getCache('index_homepage_data');

        if (cachedNepse || cachedHome) {
            const companies = cachedNepse ? (Array.isArray(cachedNepse.data) ? cachedNepse.data : (cachedNepse.liveData || [])) : [];
            const subIndices = cachedHome ? (cachedHome.subIndices || []) : [];
            
            if (companies.length || subIndices.length) {
                processAndRender(companies, subIndices);
                return true;
            }
        }
        return false;
      }

      /* =========================================================
         PARTIAL REFRESH
         - Click "Top Turnover" title
         - Click "Top Volume" title
      ========================================================= */

      function refreshTurnover() { fetchData(); }
      function refreshVolume() { fetchData(); }

      /* =========================================================
         RENDER FUNCTIONS
      ========================================================= */

      function renderGainers() {
        const el = document.getElementById("gainer-body");
        if (!el) return;

        domUtils.clearNode(el);
        const fragment = document.createDocumentFragment();

        gainers.forEach(r => {
          const row = domUtils.createElement('tr', {
            children: [
              domUtils.createElement('td', { textContent: r.symbol }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.lastTradedPrice) }),
              domUtils.createElement('td', { className: ['chg-driver', 'o'], textContent: String(r.change) }),
              domUtils.createElement('td', { className: 'o', textContent: `${r.percentageChange}%` })
            ]
          });
          fragment.appendChild(row);
        });

        el.appendChild(fragment);
        RowColor.apply();
      }

      function renderLosers() {
        const el = document.getElementById("loser-body");
        if (!el) return;

        domUtils.clearNode(el);
        const fragment = document.createDocumentFragment();

        losers.forEach(r => {
          const row = domUtils.createElement('tr', {
            children: [
              domUtils.createElement('td', { textContent: r.symbol }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.lastTradedPrice) }),
              domUtils.createElement('td', { className: ['chg-driver', 'o'], textContent: String(r.change) }),
              domUtils.createElement('td', { className: 'o', textContent: `${r.percentageChange}%` })
            ]
          });
          fragment.appendChild(row);
        });

        el.appendChild(fragment);
        RowColor.apply();
      }

      function renderTurnover() {
        const el = document.getElementById("turnover-body");
        if (!el) return;

        domUtils.clearNode(el);
        const fragment = document.createDocumentFragment();

        turnoverList.forEach(r => {
          const row = domUtils.createElement('tr', {
            children: [
              domUtils.createElement('td', { textContent: r.symbol }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.totalTradeValue) }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.lastTradedPrice) })
            ]
          });
          fragment.appendChild(row);
        });
        el.appendChild(fragment);
      }

      function renderVolume() {
        const el = document.getElementById("volume-body");
        if (!el) return;

        domUtils.clearNode(el);
        const fragment = document.createDocumentFragment();

        volumeList.forEach(r => {
          const row = domUtils.createElement('tr', {
            children: [
              domUtils.createElement('td', { textContent: r.symbol }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.totalTradeQuantity) }),
              domUtils.createElement('td', { className: 'o', textContent: Utils.formatNepaliNumber(r.lastTradedPrice) })
            ]
          });
          fragment.appendChild(row);
        });
        el.appendChild(fragment);
      }

      /* =========================================================
         EVENT BINDINGS (SAFE)
      ========================================================= */

      const refreshBtn = document.getElementById("refresh-market");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchData);
      }

      const turnoverTitle = document.getElementById("refresh-turnover");
      if (turnoverTitle) {
        turnoverTitle.addEventListener("click", refreshTurnover);
      }

      const volumeTitle = document.getElementById("refresh-volume");
      if (volumeTitle) {
        volumeTitle.addEventListener("click", refreshVolume);
      }

      /* ---------------- PUBLIC API ---------------- */
      return {
        fetchData,
        init: () => {
          loadFromCache();
          fetchData();
        },
        isLoading: () => loading
      };

    })();

    /* =========================================================
       DASHBOARD CHART MODULE
    ========================================================= */
    const DashboardChart = (() => {
      const container = document.querySelector(".chart");
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTTlkVfkIa77xY5_uD4php6FbtZkMVoAXoxw97ZFKfYX0wiztxlRgSiqtTxTIDRSFq2YblS7Hg-BlbK/pub?gid=0&single=true&output=csv';

      let chart = null;
      let candleSeries = null;

      async function init() {
        if (!container || !window.LightweightCharts) return;

        domUtils.clearNode(container);
        const chartEl = domUtils.createElement('div', {
          styles: { width: '100%', height: '100%' }
        });
        container.appendChild(chartEl);

        chart = LightweightCharts.createChart(chartEl, {
          layout: {
            background: { color: 'transparent' },
            textColor: '#9ca3af'
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)' }
        });

        candleSeries = chart.addCandlestickSeries({
          upColor: '#26a69a', downColor: '#ef5350',
          borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350'
        });

        // Load from cache first
        const cachedText = apiClient.getCache('dashboard_chart_csv');
        if (cachedText) {
          processAndRender(cachedText);
        }

        try {
          const text = await apiClient.request(SHEET_URL, { 
            signal: dashboardController.signal, 
            method: 'GET', 
            responseType: 'text' 
          });
          
          if (text) {
            apiClient.setCache('dashboard_chart_csv', text);
            processAndRender(text);
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error("Dashboard Chart Error:", e);
            if (!cachedText && container) container.textContent = "Failed to load chart data.";
          }
        }

        const handleResize = () => {
          if (chart) {
            chart.applyOptions({
              width: container.clientWidth,
              height: container.clientHeight
            });
          }
        };
        window.addEventListener('resize', handleResize);
        dashboardController.signal.addEventListener('abort', () => window.removeEventListener('resize', handleResize));
      }

      function processAndRender(csvText) {
        if (!csvText || !candleSeries) return;
        
        try {
          const lines = csvText.trim().split('\n').slice(1);
          const data = lines.map(line => {
            const cols = line.split(',');
            if (cols.length < 6 || cols[1].trim() !== 'NEPSE') return null;
            return {
              time: cols[0].trim(),
              open: parseFloat(cols[2]),
              high: parseFloat(cols[3]),
              low: parseFloat(cols[4]),
              close: parseFloat(cols[5])
            };
          }).filter(d => d && !isNaN(d.close));

          data.sort((a, b) => new Date(a.time) - new Date(b.time));
          candleSeries.setData(data);
        } catch (err) {
          console.error("Error processing chart data:", err);
        }
      }

      return { init };
    })();

    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    DashboardChart.init();
    LiveTopMarket.init();
    TradeSummary.update();
    Collateral.update();
    Watchlist.render("indwch");

    document.addEventListener('nepse:data', (e) => {
      if (!LiveTopMarket.isLoading()) {
        Watchlist.updateFromLive(e.detail);
      }
    });

    document.addEventListener('holdings:updated', () => {
      const cachedMarket = sessionStorage.getItem('nepse_cache_data');
      if (cachedMarket) {
        try {
          const marketData = JSON.parse(cachedMarket);
          Watchlist.updateFromLive(marketData);
        } catch (e) {
          console.error("Failed to parse cached market data", e);
        }
      }
    });

    window.addEventListener('unload', () => dashboardController.abort());
  });
})();

/* =========================================================
     MARKET SUMMARY (HEADER)
     - Turnover
     - Volume
     - Transactions
     - Refresh every 1 second
  ========================================================= */

const MarketSummary = (() => {

  const API_URL = "https://dhanweb.up.railway.app/market-turnover";
  let intervalId = null;
  let controller = null;

  function formatNumber(num) {
    return Number(num || 0).toLocaleString("en-IN");
  }

  async function fetchSummary() {
    try {
      controller?.abort();
      controller = new AbortController();

      const data = await apiClient.request(API_URL, {
        method: "GET",
        signal: controller.signal
      });

      const summary = data?.totalTurnover;
      if (!summary) return;

      const turnoverEl = document.querySelector(".turnover");
      const volumeEl = document.querySelector(".volume");
      const transEl = document.querySelector(".transactions");

      if (turnoverEl)
        turnoverEl.textContent = formatNumber(summary.totalTradedValue);

      if (volumeEl)
        volumeEl.textContent = formatNumber(summary.totalTradedQuantity);

      if (transEl)
        transEl.textContent = formatNumber(summary.transactionCount);

    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Market Summary Fetch Error:", err);
      }
    }
  }

  function start() {
    if (intervalId) return;

    fetchSummary(); // immediate load
    intervalId = setInterval(fetchSummary, 2000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    controller?.abort();
  }

  return { start, stop };

})();

document.addEventListener("DOMContentLoaded", () => {
  MarketSummary.start();
});

