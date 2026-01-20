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
     SKELETON ENGINE
  ========================================================= */
  const Skeletons = (() => {
    function createTableRow(cols) {
        let cells = "";
        for(let i=0; i<cols; i++) {
            cells += `<td><div class="skeleton sk-cell"></div></td>`;
        }
        return `<tr>${cells}</tr>`;
    }

    function show(containerId, cols, rows = 5) {
        const container = document.getElementById(containerId);
        if (!container) return;
        let html = "";
        for(let i=0; i<rows; i++) {
            html += createTableRow(cols);
        }
        container.innerHTML = html;
    }

    return { show };
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

      watchBody.innerHTML = "";
      
      if (watchData[type].length === 0) {
        // If we are currently loading from API, don't show "No data available"
        // as the Skeletons should be visible.
        if (LiveTopMarket && LiveTopMarket.isLoading && LiveTopMarket.isLoading()) {
            return; 
        }
        watchBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No data available</td></tr>`;
        return;
      }

      watchData[type].forEach(r => {
        if (type === "indwch") {
          watchBody.insertAdjacentHTML("beforeend", `
            <tr>
              <td>${r.symbol}</td>
              <td class="o">${Utils.formatNepaliNumber(r.ltp)}</td>
              <td class="chg-driver o">${r.change}</td>
              <td class="o">${r.pchange}%</td>
            </tr>
          `);
        } else {
          watchBody.insertAdjacentHTML("beforeend", `
            <tr>
              <td>${r.symbol}</td>
              <td class="o">${Utils.formatNepaliNumber(r.open)}</td>
              <td class="o">${Utils.formatNepaliNumber(r.high)}</td>
              <td class="o">${Utils.formatNepaliNumber(r.low)}</td>
              <td class="o">${Utils.formatNepaliNumber(r.ltp)}</td>
              <td class="chg-driver o">${(r.change).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</td>
              <td class="o">${r.pchange}%</td>
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
      if (!data) return;
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
      if (!data) return;
      const count = document.getElementById("dp-count");
      const amount = document.getElementById("dp-amount");
      const pl = document.getElementById("dailypnl");
      if (!count || !amount || !pl) return;

      count.textContent = data.totalScrips || 0;
      amount.textContent = Utils.formatNepaliNumber(data.totalAmount || 0);
      pl.textContent = Utils.formatNepaliNumber(data.todayPL || 0);
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
    const API_URL = "https://turnover-19sr.onrender.com/homepage-data";

    // Exclude non-tradable instruments
    const EXCLUDED_SECTORS = [
      "Mutual Fund",
      "Non-Convertible Debenture"
    ];

    /* ---------------- STATE ---------------- */
    let losers = [];
    let turnoverList = []; // renamed to avoid conflict with var name "turnover"
    let volumeList = [];
    let loading = false;

    /* =========================================================
       MAIN FETCH (FULL REFRESH)
       - Used on initial load
       - Used by manual refresh button
    ========================================================= */
    function fetchData() {
      const btn = document.getElementById("refresh-market");
      if (btn) btn.disabled = true;
      loading = true;

      // Show Skeletons immediately
      Skeletons.show("gainer-body", 4, 8);
      Skeletons.show("loser-body", 4, 8);
      Skeletons.show("turnover-body", 3, 8);
      Skeletons.show("volume-body", 3, 8);
      
      // Also show for Index Watch/Watchlist if active
      const activeTab = document.querySelector(".head .lin.active");
      if (activeTab) {
          const type = activeTab.getAttribute("href").substring(1);
          const cols = type === "indwch" ? 4 : 7;
          Skeletons.show("watch-body", cols, 8);
      }

      fetch(API_URL)
        .then(res => res.json())
        .then(res => {
          const data = res.liveCompanyData || [];
          const subIndices = res.subIndices || [];
          const summary = res.marketSummary || {};

          // 1. Update Market Summary Cards
          updateMarketSummaryCards(summary);

          // 2. Filter unwanted sectors
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
          turnoverList = [...filtered]
            .sort((a, b) => b.totalTradeValue - a.totalTradeValue)
            .slice(0, 10);

          /* ---------- TOP VOLUME ---------- */
          volumeList = [...filtered]
            .sort((a, b) => b.totalTradeQuantity - a.totalTradeQuantity)
            .slice(0, 10);

          // Render all sections
          renderGainers();
          renderLosers();
          renderTurnover();
          renderVolume();

          // UPDATE WATCHLIST & SECTORS WITH LIVE DATA
          Watchlist.updateFromLive(data, subIndices);
        })
        .catch((err) => {
          console.error("Dashboard Fetch Error:", err);
        })
        .finally(() => {
          if (btn) btn.disabled = false;
          loading = false;
        });
    }

    function updateMarketSummaryCards(summary) {
        const turnoverEl = document.querySelector(".turnover");
        const volumeEl = document.querySelector(".volume");
        const transEl = document.querySelector(".transactions");

        if(turnoverEl) turnoverEl.textContent = summary.totalTurnover || "0";
        if(volumeEl) volumeEl.textContent = summary.totalTradedShares || "0";
        if(transEl) transEl.textContent = summary.totalTransactions || "0";
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

      el.innerHTML = "";
      gainers.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td class="o">${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
          <td class="chg-driver o">${r.change}</td>
          <td class="o">${r.percentageChange}%</td>
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
          <td class="o">${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
          <td class="chg-driver o">${r.change}</td>
          <td class="o">${r.percentageChange}%</td>
        </tr>
      `);
      });

      RowColor.apply();
    }

    function renderTurnover() {
      const el = document.getElementById("turnover-body");
      if (!el) return;

      el.innerHTML = "";
      turnoverList.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td class="o">${Utils.formatNepaliNumber(r.totalTradeValue)}</td>
          <td class="o">${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
        </tr>
      `);
      });
    }

    function renderVolume() {
      const el = document.getElementById("volume-body");
      if (!el) return;

      el.innerHTML = "";
      volumeList.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${r.symbol}</td>
          <td class="o">${Utils.formatNepaliNumber(r.totalTradeQuantity)}</td>
          <td class="o">${Utils.formatNepaliNumber(r.lastTradedPrice)}</td>
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
      fetchData,
      isLoading: () => loading
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
