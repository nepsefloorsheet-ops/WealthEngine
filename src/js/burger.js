// Burger script - Consolidated
document.addEventListener('layout-injected', () => {
  // ---------------------------------------------------------
  // 1. Sidebar / Header / Burger Logic
  // ---------------------------------------------------------
  const sidebar = document.querySelector('.sidebar')
  const main = document.querySelector('main')
  const burger = document.querySelector('.burger')

  if (burger && sidebar) {
    // LOAD SAVED STATE
    const isClosed = localStorage.getItem('sidebarClosed') === 'true'

    if (isClosed) {
      sidebar.classList.add('close')
      main.classList.add('close')
      burger.classList.remove('ope')
    } else {
      burger.classList.add('ope')
    }

    // TOGGLE ON CLICK
    burger.addEventListener('click', () => {
      sidebar.classList.toggle('close')
      main.classList.toggle('close')
      burger.classList.toggle('ope')

      // SAVE STATE
      const closed = sidebar.classList.contains('close')
      localStorage.setItem('sidebarClosed', closed)
    })
  }

  // ---------------------------------------------------------
  // 2. Active Tab Highlight
  // ---------------------------------------------------------
  const path = window.location.pathname.split('/').pop(); // e.g., "order.html"
  const buttons = document.querySelectorAll('.sidebar .butt, .sidebar .but');

  buttons.forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (!onclick) return;

    const file = onclick.match(/'([^']+)'/)[1].split('/').pop();

    if (file === path) {
      btn.classList.add('active');
      if (btn.parentElement.classList.contains('link')) {
        btn.parentElement.classList.add('active');
      }
    }
  });

  // ---------------------------------------------------------
  // 3. Date, Weekday, and Time
  // ---------------------------------------------------------
  function showDateTime() {
    const el = document.getElementById('date');
    if (!el) return;

    const now = new Date();

    // Format date as "Jan 05, 2026"
    const optionsDate = { month: 'short', day: '2-digit', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', optionsDate);

    // Get weekday name
    const optionsDay = { weekday: 'long' };
    const dayStr = now.toLocaleDateString('en-US', optionsDay);

    // Format time
    const optionsTime = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
    const timeStr = now.toLocaleTimeString('en-US', optionsTime);

    el.innerHTML = `${dateStr}<br>${dayStr}<br>${timeStr}`;
  }

  showDateTime();
  setInterval(showDateTime, 1000);

  // ---------------------------------------------------------
  // 4. NEPSE Market Status Pill Script
  // ---------------------------------------------------------
  function getKathmanduTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5.75 * 60 * 60000);
  }

  const HOLIDAYS = [
    "2026-01-15", "2026-01-19", "2026-01-30", "2026-02-15",
    "2026-02-18", "2026-02-19", "2026-03-02", "2026-03-08",
    "2026-03-18", "2026-03-27",
  ];

  function getNepseMarketState() {
    const now = getKathmanduTime();
    const day = now.getDay(); // 5 = Friday, 6 = Saturday
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = now.toISOString().split("T")[0];

    if (day === 5 || day === 6 || HOLIDAYS.includes(today)) {
      return { text: "Holiday", class: "pill-holiday" };
    }
    if (minutes >= 630 && minutes < 645) {
      return { text: "Pre-Open", class: "pill-preopen" };
    }
    if (minutes >= 645 && minutes < 660) {
      return { text: "Matching", class: "pill-matching" };
    }
    if (minutes >= 660 && minutes < 900) {
      return { text: "Market Open", class: "pill-open" };
    }
    return { text: "Market Closed", class: "pill-closed" };
  }

  function updateMarketPill() {
    const pill = document.getElementById("market-pill");
    if (!pill) return;
    const state = getNepseMarketState();
    pill.textContent = state.text;
    pill.className = `market-pill ${state.class}`;
  }

  updateMarketPill();
  setInterval(updateMarketPill, 60000);

  // ---------------------------------------------------------
  // 5. Market Open Countdown
  // ---------------------------------------------------------
  // Re-declare getKathmanduTime and HOLIDAYS for this scope if not already defined globally or in a parent scope.
  // Since the instruction provides a consolidated block, these functions/variables should be defined once.
  // For now, I'll assume the HOLIDAYS array from section 4 is used here, and getKathmanduTime is also available.
  // The instruction's provided code for this section also includes getKathmanduTime and HOLIDAYS,
  // so I'll use the ones from the instruction to ensure consistency.

  // The HOLIDAYS array in the instruction for this section is slightly different from section 4's HOLIDAYS.
  // I will use the one provided in the instruction for this specific section.
  const COUNTDOWN_HOLIDAYS = [
    "2026-01-11",
    "2026-01-15",
    "2026-01-19",
    "2026-01-30",
    "2026-02-15",
    "2026-02-18",
    "2026-02-19",
    "2026-03-02",
    "2026-03-08",
    "2026-03-18",
    "2026-03-27",
  ];

  function isHoliday(date) {
    const day = date.getDay();
    const iso = date.toISOString().split("T")[0];
    return day === 5 || day === 6 || COUNTDOWN_HOLIDAYS.includes(iso);
  }

  function minutesToHMS(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function getNextSession(date) {
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const sessions = [
      { time: 10 * 60 + 30, label: "Pre-open starts in" },
      { time: 10 * 60 + 45, label: "Pre-open matching starts in" },
      { time: 11 * 60, label: "Market opens in" },
      { time: 15 * 60, label: "Market closes in" }
    ];
    for (let s of sessions) {
      if (currentMinutes < s.time) return s;
    }
    return null;
  }

  function getNextTradingDay(date) {
    const next = new Date(date);
    do {
      next.setDate(next.getDate() + 1);
    } while (isHoliday(next));
    return next;
  }

  function updateCountdown() {
    const el = document.getElementById("market-countdown");
    if (!el) return;

    const now = getKathmanduTime();
    if (isHoliday(now)) {
      el.textContent = "Market closed (Holiday)";
      return;
    }

    const nextSession = getNextSession(now);
    if (nextSession) {
      const target = new Date(now);
      target.setHours(Math.floor(nextSession.time / 60), nextSession.time % 60, 0, 0);
      const diffMinutes = Math.max(0, Math.floor((target - now) / 60000));
      el.textContent = `${nextSession.label} ${minutesToHMS(diffMinutes)}`;
    } else {
      const nextDay = getNextTradingDay(now);
      nextDay.setHours(10, 30, 0, 0);
      const diffMinutes = Math.floor((nextDay - now) / 60000);
      el.textContent = `Market opens in ${minutesToHMS(diffMinutes)}`;
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 60000);

  // ---------------------------------------------------------
  // 6. Year Update
  // ---------------------------------------------------------
  const startYear = 2026;
  const currentYear = new Date().getFullYear();
  const yearText = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;
  const yearEl = document.getElementById("we-year");
  if (yearEl) {
    yearEl.textContent = yearText;
  }

  // ---------------------------------------------------------
  // 7. Data Fetching (Turnover & NEPSE)
  // ---------------------------------------------------------
  const TURNOVER_API = "https://turnover-19sr.onrender.com/market-turnover";
  const NEPSE_API = "https://turnover-19sr.onrender.com/homepage-data";

  async function fetchTurnover() {
    try {
      const res = await fetch(TURNOVER_API);
      const data = await res.json();
      const t = data.totalTurnover;

      const turnEl = document.getElementById("turnover");
      const volEl = document.getElementById("volume");

      if (turnEl) turnEl.textContent = t.totalTradedValue.toLocaleString("en-IN");
      if (volEl) volEl.textContent = t.totalTradedQuantity.toLocaleString("en-IN");

      // Updates for elements that might exist
      document.querySelectorAll(".turnover").forEach(el => el.textContent = t.totalTradedValue.toLocaleString("en-IN"));
      document.querySelectorAll(".volume").forEach(el => el.textContent = t.totalTradedQuantity.toLocaleString("en-IN"));
      document.querySelectorAll(".transactions").forEach(el => el.textContent = t.transactionCount.toLocaleString("en-IN"));

    } catch (error) {
      console.error(error);
      // Silent fail or UI indication?
    }
  }

  async function getNepseIndex() {
    try {
      const res = await fetch(NEPSE_API);
      const data = await res.json();
      const nepse = data.indices.find(i => i.symbol === "NEPSE");

      document.querySelectorAll(".nepse").forEach(el => el.textContent = nepse.currentValue.toLocaleString("en-IN"));
      document.querySelectorAll(".change").forEach(el => el.textContent = nepse.change.toLocaleString("en-IN"));
    } catch (error) {
      console.error("Error fetching NEPSE data:", error);
    }
  }

  fetchTurnover();
  setInterval(fetchTurnover, 5000);

  getNepseIndex();
  setInterval(getNepseIndex, 5000);

});
