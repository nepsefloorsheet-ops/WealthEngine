// Burger script
const sidebar = document.querySelector('.sidebar')
const main = document.querySelector('main')
const burger = document.querySelector('.burger')

// ---- LOAD SAVED STATE ----
const isClosed = localStorage.getItem('sidebarClosed') === 'true'

if (isClosed) {
  sidebar.classList.add('close')
  main.classList.add('close')
  burger.classList.remove('ope')   // ❌ no ope when closed
} else {
  burger.classList.add('ope')      // ✅ ope only when open
}

// ---- TOGGLE ON CLICK ----
burger.addEventListener('click', () => {
  sidebar.classList.toggle('close')
  main.classList.toggle('close')
  burger.classList.toggle('ope')

  // SAVE STATE
  const closed = sidebar.classList.contains('close')
  localStorage.setItem('sidebarClosed', closed)
})

// clicked tab active js

document.addEventListener('DOMContentLoaded', () => {
  // Get current page path
  const path = window.location.pathname.split('/').pop(); // e.g., "order.html"

  // Select all sidebar buttons
  const buttons = document.querySelectorAll('.sidebar .butt, .sidebar .but');

  buttons.forEach(btn => {
    // Get the href from inline onclick (extract filename)
    const onclick = btn.getAttribute('onclick'); // e.g., document.location='pages/order.html'
    if (!onclick) return;

    const file = onclick.match(/'([^']+)'/)[1].split('/').pop(); // extract "order.html"x

    if (file === path) {
      // Add active class to button's parent <li> or button itself
      btn.classList.add('active');
      if (btn.parentElement.classList.contains('link')) {
        btn.parentElement.classList.add('active');
      }
    }
  });
});

// Date, Weekday, and Time
function showDateTime() {
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

  // Combine as desired format
  document.getElementById('date').innerHTML = `${dateStr}<br>${dayStr}<br>${timeStr}`;
}

// Update immediately
showDateTime();

// Update every second
setInterval(showDateTime, 1000);


// ===============================
// NEPSE Market Status Pill Script
// Timezone: Kathmandu (GMT +5:45)
// ===============================

(function () {

  function getKathmanduTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5.75 * 60 * 60000);
  }

  // ---- NEPSE Holidays (YYYY-MM-DD) ----
  const HOLIDAYS = [
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

  function getNepseMarketState() {
    const now = getKathmanduTime();

    const day = now.getDay(); // 5 = Friday, 6 = Saturday
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = now.toISOString().split("T")[0];

    // ---- Holiday / Weekend ----
    if (day === 5 || day === 6 || HOLIDAYS.includes(today)) {
      return { text: "Holiday", class: "pill-holiday" };
    }

    // ---- Sessions ----
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

  function formatDateTime(date) {
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(",", "");
  }

  function getLastTradingDate() {
    const now = getKathmanduTime();
    const minutes = now.getHours() * 60 + now.getMinutes();

    let date = new Date(now);

    // ⛔ Before market close today → go back one day
    if (minutes < 900) { // 15:00
      date.setDate(date.getDate() - 1);
    }

    while (true) {
      const day = date.getDay();
      const iso = date.toISOString().split("T")[0];

      if (day !== 5 && day !== 6 && !HOLIDAYS.includes(iso)) {
        return date;
      }

      date.setDate(date.getDate() - 1);
    }
  }

  // 🔥 THIS IS THE KEY PART
  function updateLastUpdated(data) {
    const el = document.getElementById("lastUpdated");
    if (!el || !data || !data.length) return;

    const market = getNepseMarketState();

    if (market.open) {
      const latest = data.reduce((max, item) => {
        const t = new Date(item.lastUpdatedDateTime);
        return t > max ? t : max;
      }, new Date(0));

      el.textContent = `As of: ${formatDateTime(latest)}`;
    } else {
      const lastTrade = getLastTradingDate();
      lastTrade.setHours(15, 0, 0, 0);

      el.textContent = `As of: ${formatDateTime(lastTrade)}`;
    }
  }

  // ✅ LISTEN FOR DATA FROM load-nepse.js
  document.addEventListener("nepse:data", e => {
    updateLastUpdated(e.detail);
  });

  // Initial load
  updateMarketPill();

  // Update every minute
  setInterval(updateMarketPill, 60000);

})();


//Market open Countdown
(function () {

  function getKathmanduTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5.75 * 60 * 60000);
  }

  const HOLIDAYS = [
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
    const day = date.getDay(); // 5 = Friday, 6 = Saturday
    const iso = date.toISOString().split("T")[0];
    return day === 5 || day === 6 || HOLIDAYS.includes(iso);
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
      if (currentMinutes < s.time) {
        return s;
      }
    }

    return null; // market already closed
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
      target.setHours(
        Math.floor(nextSession.time / 60),
        nextSession.time % 60,
        0,
        0
      );

      const diffMinutes = Math.max(
        0,
        Math.floor((target - now) / 60000)
      );

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

})();

document.addEventListener("DOMContentLoaded", () => {
  const startYear = 2026;
  const currentYear = new Date().getFullYear();
  const yearText =
    currentYear > startYear
      ? `${startYear}-${currentYear}`
      : `${startYear}`;

  const yearEl = document.getElementById("we-year");
  if (yearEl) {
    yearEl.textContent = yearText;
  }
});