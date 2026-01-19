/* =========================================================
   DASHBOARD JS - FULL MODULAR VERSION
   Author: You
   Features: Nepali style number formatting, modular sections
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     UTILITY FUNCTIONS
  ========================================================= */
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

    function clearElement(el) { if (el) el.innerHTML = ""; }

    return { parseAmount, formatNepaliNumber, clearElement };
  })();


  /* =========================================================
     TRADE SUMMARY BAR
  ========================================================= */
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
        buyBar.style.width = sellBar.style.width = "0%";
        buyText.textContent = sellText.textContent = "";
        noTradeText.style.display = "flex";
        return;
      }

      noTradeText.style.display = "none";
      const total = buyAmount + sellAmount;
      const buyPercent = (buyAmount / total) * 100;
      const sellPercent = 100 - buyPercent;

      buyBar.style.width = `${buyPercent}%`;
      sellBar.style.width = `${sellPercent}%`;
      buyText.textContent = `${buyPercent.toFixed(1)}%`;
      sellText.textContent = `${sellPercent.toFixed(1)}%`;
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
      indwch: [
        { symbol: "BANKSUBIND", high: "1376.68", low: "1367.52", ltp: "1375.98", change: '4.23', pchange: "0.31" },
        { symbol: "DEVBANKIND", high: "5575.07", low: "5523.61", ltp: "5575.07", change: '10.12', pchange: "0.18" },
        { symbol: "FININD", high: "2404.76", low: "2376.63", ltp: "2382.65", change: '-10.58', pchange: "-0.44" },
        { symbol: "FLOATIND", high: "181.26", low: "180.16", ltp: "181.26", change: '0.46', pchange: "0.25" },
        { symbol: "HOTELIND", high: "7067.05", low: "6957.45", ltp: "7048.58", change: '28.62', pchange: "0.41" },
        { symbol: "HYDPOWIND", high: "3350.33", low: "3321.15", ltp: "3349.06", change: '10.71', pchange: "0.32" },
        { symbol: "INVIDX", high: "102.63", low: "101.93", ltp: "102.36", change: '-0.22', pchange: "-0.21" },
        { symbol: "LIFINSIND", high: "12915.30", low: "12772.00", ltp: "12915.30", change: '42.77', pchange: "0.33" },
        { symbol: "MANPROCIND", high: "8811.80", low: "8723.28", ltp: "8789.50", change: '43.53', pchange: "0.50" },
        { symbol: "MICRFININD", high: "4934.76", low: "4904.56", ltp: "4933.63", change: '-2.20', pchange: "-0.04" },
        { symbol: "NEPSE", high: "2640.56", low: "2626.88", ltp: "2640.54", change: '4.60', pchange: "0.17" },
        { symbol: "NONLIFIND", high: "10918.56", low: "10848.21", ltp: "10914.03", change: '29.31', pchange: "0.27" },
        { symbol: "OTHERSIND", high: "2357.68", low: "2342.22", ltp: "2349.50", change: '-1.71', pchange: "-0.07" },
        { symbol: "SENSFLTIND", high: "155.23", low: "154.34", ltp: "155.17", change: '0.36', pchange: "0.23" },
        { symbol: "SENSIND", high: "455.95", low: "453.71", ltp: "455.93", change: '0.92', pchange: "0.20" }
      ],
      dpwch: [ /* ... (keep existing or empty) ... */],
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
    function updateFromLive(liveData) {
      if (!liveData || !Array.isArray(liveData)) return;

      const userSymbols = getUserSymbols();
      if (userSymbols.length === 0) {
        watchData.wch = [];
      } else {
        // Filter and Map to match our internal format
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
      }

      // Re-render if currently viewing watchlist
      const activeTab = document.querySelector(".head .lin.active");
      if (activeTab && activeTab.getAttribute("href") === "#wch") {
        render("wch");
      }
    }

    function render(type) {
      if (!watchBody || !watchData[type]) return;

      theads.forEach(th => th.style.display = "none");
      const activeHead = document.getElementById(`head-${type}`);
      if (activeHead) activeHead.style.display = "";

      watchBody.innerHTML = "";
      watchData[type].forEach(r => {
        if (type === "indwch") {
          watchBody.insertAdjacentHTML("beforeend", `
            <tr>
              <td>${r.symbol}</td>
              <td>${Utils.formatNepaliNumber(r.high)}</td>
              <td>${Utils.formatNepaliNumber(r.low)}</td>
              <td>${Utils.formatNepaliNumber(r.ltp)}</td>
              <td class="chg-driver">${r.change}</td>
              <td>${r.pchange}%</td>
            </tr>
          `);
        } else {
          watchBody.insertAdjacentHTML("beforeend", `
            <tr>
              <td>${r.symbol}</td>
              <td>${Utils.formatNepaliNumber(r.open)}</td>
              <td>${Utils.formatNepaliNumber(r.high)}</td>
              <td>${Utils.formatNepaliNumber(r.low)}</td>
              <td>${Utils.formatNepaliNumber(r.ltp)}</td>
              <td class="chg-driver">${(r.change).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</td>
              <td>${r.pchange}%</td>
            </tr>
          `);
        }
      });

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

  const Settlement = (() => {
    function render(data) {
      const payableEl = document.getElementById("payable");
      const receivableEl = document.getElementById("receivable");
      const netEl = document.getElementById("net-status");
      if (!payableEl || !receivableEl || !netEl) return;

      const payable = Number(data.payable) || 0;
      const receivable = Number(data.receivable) || 0;

      payableEl.textContent = Utils.formatNepaliNumber(payable);
      receivableEl.textContent = Utils.formatNepaliNumber(receivable);

      const diff = receivable - payable;
      netEl.className = "net"; // reset

      if (diff > 0) {
        netEl.textContent = `Net Receivable: ${Utils.formatNepaliNumber(diff)}`;
        netEl.classList.add("receivable");
      } else if (diff < 0) {
        netEl.textContent = `Net Payable: ${Utils.formatNepaliNumber(Math.abs(diff))}`;
        netEl.classList.add("payable");
      } else {
        netEl.textContent = "Settled";
      }
    }

    return { render };
  })();

  const DPHolding = (() => {
    function render(data) {
      const count = document.getElementById("dp-count");
      const amount = document.getElementById("dp-amount");
      const pl = document.getElementById("dailypnl");
      if (!count || !amount || !pl) return;

      count.textContent = data.totalScrips;
      amount.textContent = Utils.formatNepaliNumber(data.totalAmount);
      pl.textContent = Utils.formatNepaliNumber(data.todayPL);
    }

    return { render };
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
    const API_URL = "https://nepseapi-ouhd.onrender.com/api/live-nepse";

    // Exclude non-tradable instruments
    const EXCLUDED_SECTORS = [
      "Mutual Fund",
      "Non-Convertible Debenture"
    ];

    /* ---------------- STATE ---------------- */
    let gainers = [];
    let losers = [];
    let turnover = [];
    let volume = [];

    /* =========================================================
       MAIN FETCH (FULL REFRESH)
       - Used on initial load
       - Used by manual refresh button
    ========================================================= */
    function fetchData() {
      const btn = document.getElementById("refresh-market");
      if (btn) btn.disabled = true;

      fetch(API_URL)
        .then(res => res.json())
        .then(res => {
          const data = res.data || [];

          // Filter unwanted sectors once
          const filtered = data.filter(
            d => !EXCLUDED_SECTORS.includes(d.sector)
          );

          /* ---------- TOP GAINERS ---------- */
          gainers = filtered
            .filter(d => d.percentageChange > 0)
            .sort((a, b) => b.percentageChange - a.percentageChange)
            .slice(0, 10);

          /* ---------- TOP LOSERS ---------- */
          losers = filtered
            .filter(d => d.percentageChange < 0)
            .sort((a, b) => a.percentageChange - b.percentageChange)
            .slice(0, 10);

          /* ---------- TOP TURNOVER ---------- */
          turnover = [...filtered]
            .sort((a, b) => b.totalTradeValue - a.totalTradeValue)
            .slice(0, 10);

          /* ---------- TOP VOLUME ---------- */
          volume = [...filtered]
            .sort((a, b) => b.totalTradeQuantity - a.totalTradeQuantity)
            .slice(0, 10);

          // Render all sections
          renderGainers();
          renderLosers();
          renderTurnover();
          renderVolume();

          // UPDATE WATCHLIST WITH LIVE DATA
          Watchlist.updateFromLive(data);
        })
        .catch(() => {
          // silent fail (no UI noise)
        })
        .finally(() => {
          if (btn) btn.disabled = false;
        });
    }

    /* =========================================================
       PARTIAL REFRESH
       - Click "Top Turnover" title
       - Click "Top Volume" title
    ========================================================= */

    function refreshTurnover() {
      fetch(API_URL)
        .then(res => res.json())
        .then(res => {
          const filtered = (res.data || []).filter(
            d => !EXCLUDED_SECTORS.includes(d.sector)
          );

          turnover = [...filtered]
            .sort((a, b) => b.totalTradeValue - a.totalTradeValue)
            .slice(0, 10);

          renderTurnover();
        })
        .catch(() => { });
    }

    function refreshVolume() {
      fetch(API_URL)
        .then(res => res.json())
        .then(res => {
          const filtered = (res.data || []).filter(
            d => !EXCLUDED_SECTORS.includes(d.sector)
          );

          volume = [...filtered]
            .sort((a, b) => b.totalTradeQuantity - a.totalTradeQuantity)
            .slice(0, 10);

          renderVolume();
        })
        .catch(() => { });
    }

    /* =========================================================
       RENDER FUNCTIONS
    ========================================================= */

    function renderGainers() {
      const el = document.getElementById("gainer-body");
      if (!el) return;

      el.innerHTML = "";
      gainers.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td>${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
          <td class="chg-driver">${r.change}</td>
          <td>${r.percentageChange}%</td>
        </tr>
      `);
      });

      RowColor.apply();
    }

    function renderLosers() {
      const el = document.getElementById("loser-body");
      if (!el) return;

      el.innerHTML = "";
      losers.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td>${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
          <td class="chg-driver">${r.change}</td>
          <td>${r.percentageChange}%</td>
        </tr>
      `);
      });

      RowColor.apply();
    }

    function renderTurnover() {
      const el = document.getElementById("turnover-body");
      if (!el) return;

      el.innerHTML = "";
      turnover.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td>${Utils.formatNepaliNumber(r.totalTradeValue)}</td>
          <td>${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
        </tr>
      `);
      });
    }

    function renderVolume() {
      const el = document.getElementById("volume-body");
      if (!el) return;

      el.innerHTML = "";
      volume.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td>${Utils.formatNepaliNumber(r.totalTradeQuantity)}</td>
          <td>${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
        </tr>
      `);
      });
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
      fetchData
    };

  })();

  /* =========================================================
     INITIAL LOAD
  ========================================================= */
  LiveTopMarket.fetchData();
  // Initialize
  TradeSummary.update();
  Collateral.update();
  Watchlist.render("indwch");
  Settlement.render(dashboardData.settlement);
  DPHolding.render(dashboardData.dpHolding);
});
