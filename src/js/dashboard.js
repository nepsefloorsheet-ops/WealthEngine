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
      dpwch: [
        { symbol: "HDHPC", open: 180, high: 182.5, low: 176.4, ltp: 176.8, change: -3.2, pchange: -1.78 },
        { symbol: "MBJC", open: 278.8, high: 282, low: 278.8, ltp: 510.25, change: 4.1, pchange: 0.8 },
      { symbol: "NICA", open: 346.0, high: 348.9, low: 339, ltp: 510.25, change: 4.1, pchange: 0.8 },
      { symbol: "RHGCL", open: 245.3, high: 246.5, low: 242.6, ltp: 510.25, change: 4.1, pchange: 0.8 },
      { symbol: "UPpER", open: 175, high: 176, low: 173.5, ltp: 510.25, change: 4.1, pchange: 0.8 },
      ],
      wch: [
        { symbol: "GFCL", open: 625, high: 642, low: 625, ltp: 632, change: 7.1, pchange: 1.14 }
      ]
    };

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
              <td class="chg-driver">${r.change}</td>
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

    return { render };
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
     TOP GAINER / LOSER MODULE
  ========================================================= */
  const TopMovers = (() => {
    const gainers = [
    { symbol: "SANVI", ltp: 795, change: 60, pchange: 8.16 },
    { symbol: 'SYPNL', ltp: 1558, change: 67.9, pchange: 5.71 },
    { symbol: 'KKHC', ltp: 225.9, change: 10, pchange: 4.63 },
    { symbol: 'SAIL', ltp: 1013, change: 42.9, pchange: 4.42 },
    { symbol: 'BHCL', ltp: 533, change: 20, pchange: 3.90 },
    { symbol: 'AKJCL', ltp: 205.9, change: 7.7, pchange: 3.88 },
    { symbol: 'TPC', ltp: 384, change: 14.3, pchange: 3.87 },
    { symbol: 'DHEL', ltp: 649.8, change: 22.8, pchange: 3.64 },
    { symbol: 'SSHL', ltp: 160.5, change: 5.4, pchange: 3.48 },
    { symbol: 'TTL', ltp: 826, change: 25.9, pchange: 3.24 }
    ];

    const losers = [
      { symbol: 'SMHL', ltp: 518, change: -21, pchange: -3.90 },
    { symbol: 'IHL', ltp: 548.7, change: -15.3, pchange: -2.71 },
    { symbol: 'GMFBS', ltp: 1480.4, change: -38.5, pchange: -2.53 },
    { symbol: 'NHDL', ltp: 666, change: -16, pchange: -2.35 },
    { symbol: 'AHL', ltp: 551, change: -12.9, pchange: -2.29 },
    { symbol: 'SFCL', ltp: 379.7, change: -8.2, pchange: -2.11 },
    { symbol: 'GFCL', ltp: 624.9, change: -13.1, pchange: -2.05 },
    { symbol: 'NWCL', ltp: 831.1, change: -16.9, pchange: -1.99 },
    { symbol: 'BUNGAL', ltp: 637.5, change: -12.6, pchange: -1.94 },
    { symbol: 'TSHL', ltp: 752, change: -14.1, pchange: -1.84 }
    ];

    function render(type) {
      const body = document.getElementById(type === "gainer" ? "gainer-body" : "loser-body");
      if (!body) return;

      body.innerHTML = "";
      const data = type === "gainer" ? gainers : losers;

      data.forEach(r => {
        body.insertAdjacentHTML("beforeend", `
          <tr>
            <td>${r.symbol}</td>
            <td>${Utils.formatNepaliNumber(r.ltp)}</td>
            <td class="chg-driver">${r.change}</td>
            <td>${r.pchange}%</td>
          </tr>
        `);
      });

      RowColor.apply();
    }

    return { render };
  })();


  /* =========================================================
     TOP TURNOVER / VOLUME MODULE
  ========================================================= */
  const TopStats = (() => {
    const turnoverData = [
      { symbol: "SYPNL", turnover: 200632769.5, ltp: 1258 },
      { symbol: "BANDIPUR", turnover: 176060188.5, ltp: 833 },
      { symbol: "SANVI", turnover: 158958116.7, ltp: 795 },
      { symbol: "SAGAR", turnover: 150347504.9, ltp: 1980 },
      { symbol: "SHIVM", turnover: 148926997.6, ltp: 625 },
      { symbol: "SAIL", turnover: 133165515.1, ltp: 1013 },
      { symbol: "MFIL", turnover: 132643246.9, ltp: 763 },
      { symbol: "RADHI", turnover: 115377549.7, ltp: 763 },
      { symbol: "BHPL", turnover: 113980974, ltp: 555 },
      { symbol: "BUNGAL", turnover: 95599814.2, ltp: 637.5 }
    ];

    const volumeData = [
      { symbol: "SSHL", shares: 559013, ltp: 160.5 },
      { symbol: "KKHC", shares: 413228, ltp: 225.9 },
      { symbol: "AKJCL", shares: 297985, ltp: 205.9 },
      { symbol: "SHIVM", shares: 241681, ltp: 625 },
      { symbol: "NGPL", shares: 239917, ltp: 392 },
      { symbol: "BANDIPUR", shares: 214428, ltp: 833 },
      { symbol: "BHPL", shares: 211257, ltp: 555 },
      { symbol: "SANVI", shares: 205667, ltp: 795 },
      { symbol: "LEC", shares: 197024, ltp: 202 },
      { symbol: "SBL", shares: 188567, ltp: 397.9 }
    ];

    function renderTurnover() {
      const el = document.getElementById("turnover-body");
      if (!el) return;

      el.innerHTML = "";
      turnoverData.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
          <tr>
            <td>${r.symbol}</td>
            <td>${Utils.formatNepaliNumber(r.turnover)}</td>
            <td>${Utils.formatNepaliNumber(r.ltp)}</td>
          </tr>
        `);
      });
    }

    function renderVolume() {
      const el = document.getElementById("volume-body");
      if (!el) return;

      el.innerHTML = "";
      volumeData.forEach(r => {
        el.insertAdjacentHTML("beforeend", `
          <tr>
            <td>${r.symbol}</td>
            <td>${Utils.formatNepaliNumber(r.shares)}</td>
            <td>${Utils.formatNepaliNumber(r.ltp)}</td>
          </tr>
        `);
      });
    }

    return { renderTurnover, renderVolume };
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

  const News = (() => {
    function render(newsArray) {
      const el = document.getElementById("news-list");
      if (!el) return;
      Utils.clearElement(el);
      newsArray.forEach(item => el.insertAdjacentHTML("beforeend", `<li>${item}</li>`));
    }

    return { render };
  })();

  // Example dashboard data
  const dashboardData = {
    settlement: { payable: 0, receivable: 25528.46 },
    dpHolding: { totalScrips: 5, totalAmount: 153197.6, todayPL: 1412.4 },
    news: ["NEPSE index gains 28 points"]
  };

  // Initialize
  TradeSummary.update();
  Collateral.update();
  Watchlist.render("indwch");
  TopMovers.render("gainer");
  TopMovers.render("loser");
  TopStats.renderTurnover();
  TopStats.renderVolume();
  Settlement.render(dashboardData.settlement);
  DPHolding.render(dashboardData.dpHolding);
  News.render(dashboardData.news);
});
