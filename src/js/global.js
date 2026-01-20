// global.js - Shared application logic
document.addEventListener('layout-injected', () => {
    // ---------------------------------------------------------
    // 1. Sidebar / Header / Burger Logic
    // ---------------------------------------------------------
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('main');
    const burger = document.querySelector('.burger');

    if (burger && sidebar) {
        // LOAD SAVED STATE
        const isClosed = localStorage.getItem('sidebarClosed') === 'true';

        if (isClosed) {
            sidebar.classList.add('close');
            main.classList.add('close');
            burger.classList.remove('ope');
        } else {
            burger.classList.add('ope');
        }

        // TOGGLE ON CLICK
        burger.addEventListener('click', () => {
            sidebar.classList.toggle('close');
            main.classList.toggle('close');
            burger.classList.toggle('ope');

            // SAVE STATE
            const closed = sidebar.classList.contains('close');
            localStorage.setItem('sidebarClosed', closed);
        });
    }

    // ---------------------------------------------------------
    // 2. Active Tab Highlight
    // ---------------------------------------------------------
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const buttons = document.querySelectorAll('.sidebar .butt, .sidebar .but');

    buttons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (!onclick) return;

        const match = onclick.match(/'([^']+)'/);
        if (!match) return;
        const file = match[1].split('/').pop();

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
        const optionsDate = { month: 'short', day: '2-digit', year: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', optionsDate);
        const optionsDay = { weekday: 'long' };
        const dayStr = now.toLocaleDateString('en-US', optionsDay);
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
    function updateCountdown() {
        const el = document.getElementById("market-countdown");
        if (!el) return;

        const now = getKathmanduTime();
        const iso = now.toISOString().split("T")[0];
        const isHoli = now.getDay() === 5 || now.getDay() === 6 || HOLIDAYS.includes(iso);

        if (isHoli) {
            el.textContent = "Market closed (Holiday)";
            return;
        }

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const sessions = [
            { time: 10 * 60 + 30, label: "Pre-open starts in" },
            { time: 10 * 60 + 45, label: "Pre-open matching starts in" },
            { time: 11 * 60, label: "Market opens in" },
            { time: 15 * 60, label: "Market closes in" }
        ];

        let targetSession = sessions.find(s => currentMinutes < s.time);

        if (targetSession) {
            const diffMinutes = targetSession.time - currentMinutes;
            const h = Math.floor(diffMinutes / 60);
            const m = diffMinutes % 60;
            el.textContent = `${targetSession.label} ${h > 0 ? h + 'h ' : ''}${m}m`;
        } else {
            el.textContent = "Market closed for today";
        }
    }

    updateCountdown();
    setInterval(updateCountdown, 60000);

    // ---------------------------------------------------------
    // 6. Data Fetching (Turnover & NEPSE)
    // ---------------------------------------------------------
    const TURNOVER_API = "https://turnover-19sr.onrender.com/market-turnover";
    const NEPSE_API = "https://turnover-19sr.onrender.com/homepage-data";

    async function fetchData() {
        try {
            const [tRes, nRes] = await Promise.all([
                fetch(TURNOVER_API),
                fetch(NEPSE_API)
            ]);
            const tData = await tRes.json();
            const nData = await nRes.json();

            const t = tData.totalTurnover;
            const nepse = nData.indices.find(i => i.symbol === "NEPSE");

            document.querySelectorAll("#turnover").forEach(el => el.textContent = t.totalTradedValue.toLocaleString("en-IN"));
            document.querySelectorAll("#volume").forEach(el => el.textContent = t.totalTradedQuantity.toLocaleString("en-IN"));
            document.querySelectorAll("#transactions").forEach(el => el.textContent = t.transactionCount.toLocaleString("en-IN"));
            document.querySelectorAll(".nepse").forEach(el => el.textContent = nepse.currentValue.toLocaleString("en-IN"));
            document.querySelectorAll(".change").forEach(el => el.textContent = nepse.change.toLocaleString("en-IN"));
        } catch (error) {
            console.error("Global data fetch failed:", error);
        }
    }

    fetchData();
    setInterval(fetchData, 5000);
});
