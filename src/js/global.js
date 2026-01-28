(function () {
    const globalController = new AbortController();

    function init() {

        // ---------------------------------------------------------
        // 1. Sidebar / Header / Burger Logic
        // ---------------------------------------------------------
        const sidebar = document.querySelector('.sidebar');
        const main = document.querySelector('main');
        const burger = document.querySelector('.burger');

        if (burger && sidebar) {
            const isClosed = localStorage.getItem('sidebarClosed') === 'true';

            if (isClosed) {
                sidebar.classList.add('close');
                main.classList.add('close');
                burger.classList.remove('ope');
            } else {
                burger.classList.add('ope');
            }

            burger.addEventListener('click', () => {
                sidebar.classList.toggle('close');
                main.classList.toggle('close');
                burger.classList.toggle('ope');

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
            const url = btn.getAttribute('data-url');
            if (!url) return;

            const file = url.split('/').pop();
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
            const el = document.getElementById('hdr-date');
            if (!el) return;

            const now = new Date();

            const dateStr = now.toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric'
            });

            const dayStr = now.toLocaleDateString('en-US', {
                weekday: 'long'
            });

            const timeStr = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            });

            domUtils.clearNode(el);
            el.append(
                document.createTextNode(dateStr),
                domUtils.createElement('br'),
                document.createTextNode(dayStr),
                domUtils.createElement('br'),
                document.createTextNode(timeStr)
            );
        }

        showDateTime();
        const dateTimeInterval = setInterval(showDateTime, 1000);
        globalController.signal.addEventListener('abort', () =>
            clearInterval(dateTimeInterval)
        );

        // ---------------------------------------------------------
        // 4. NEPSE Market Status Pill
        // ---------------------------------------------------------
        function getKathmanduTime() {
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            return new Date(utc + 5.75 * 60 * 60000);
        }

        const HOLIDAYS = [
            "2026-01-15", "2026-01-19", "2026-01-30", "2026-02-15",
            "2026-02-18", "2026-02-19", "2026-03-02", "2026-03-08",
            "2026-03-18", "2026-03-27"
        ];

        function getNepseMarketState() {
            const now = getKathmanduTime();
            const day = now.getDay();
            const minutes = now.getHours() * 60 + now.getMinutes();
            const today = now.toISOString().split('T')[0];

            if (day === 5 || day === 6 || HOLIDAYS.includes(today)) {
                return { text: 'Holiday', class: 'pill-holiday' };
            }

            if (minutes >= 630 && minutes < 645) {
                return { text: 'Pre-Open', class: 'pill-preopen' };
            }

            if (minutes >= 645 && minutes < 660) {
                return { text: 'Matching', class: 'pill-matching' };
            }

            if (minutes >= 660 && minutes < 900) {
                return { text: 'Market Open', class: 'pill-open' };
            }

            return { text: 'Market Closed', class: 'pill-closed' };
        }

        function isMarketOpenNow() {
            const state = getNepseMarketState();
            return state.text === 'Market Open';
        }


        function updateMarketPill() {
            const pill = document.getElementById('hdr-market-pill');
            if (!pill) return;

            const state = getNepseMarketState();
            pill.textContent = state.text;
            pill.className = `market-pill ${state.class}`;
        }

        updateMarketPill();
        const marketPillInterval = setInterval(updateMarketPill, 60000);
        globalController.signal.addEventListener('abort', () =>
            clearInterval(marketPillInterval)
        );

        // ---------------------------------------------------------
        // 5. Market Open Countdown
        // ---------------------------------------------------------
        function updateCountdown() {
            const el = document.getElementById('hdr-market-countdown');
            if (!el) return;

            const now = getKathmanduTime();
            const today = now.toISOString().split('T')[0];
            const isHoliday =
                now.getDay() === 5 ||
                now.getDay() === 6 ||
                HOLIDAYS.includes(today);

            if (isHoliday) {
                el.textContent = 'Market closed (Holiday)';
                return;
            }

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const sessions = [
                { time: 630, label: 'Pre-open starts in' },
                { time: 645, label: 'Pre-open matching starts in' },
                { time: 660, label: 'Market opens in' },
                { time: 900, label: 'Market closes in' }
            ];

            const target = sessions.find(s => currentMinutes < s.time);

            if (target) {
                const diff = target.time - currentMinutes;
                const h = Math.floor(diff / 60);
                const m = diff % 60;

                el.textContent = `${target.label} ${h ? h + 'h ' : ''}${m}m`;
            } else {
                el.textContent = 'Market closed for today';
            }
        }

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 60000);
        globalController.signal.addEventListener('abort', () =>
            clearInterval(countdownInterval)
        );

        // ---------------------------------------------------------
        // 6. NEPSE Data Fetching (Market-aware polling)
        // ---------------------------------------------------------
        const API_ENDPOINTS = {
            NEPSE_HOME: "https://dhanweb.up.railway.app/homepage-data"
        };

        // Cache DOM references once
        const nepseWrappers = document.querySelectorAll('.nepse-wrapper');
        const nepseValues = document.querySelectorAll('.nepse');
        const nepseChanges = document.querySelectorAll('.change');
        const nepsePercents = document.querySelectorAll('#hdr-nepse-pcent');
        const nepseIcons = document.querySelectorAll('#hdr-nepse-icon');

        let dataInterval = null;

        // Start polling (only once)
        function startDataPolling() {
            if (dataInterval) return;

            loadFromCache();
            fetchData(); // immediate fetch on start
            dataInterval = setInterval(fetchData, 5000);
        }

        // Stop polling
        function stopDataPolling() {
            if (!dataInterval) return;

            clearInterval(dataInterval);
            dataInterval = null;
        }

        function loadFromCache() {
            const cached = apiClient.getCache('global_nepse_home');
            if (cached) {
                updateUI(cached);
            }
        }

        // Decide whether to poll or not
        let hasFetchedOnce = false;

        function handleMarketDataPolling() {

            // Always fetch once on load (even if market is closed)
            if (!hasFetchedOnce) {
                loadFromCache();
                fetchData();
                hasFetchedOnce = true;
            }

            // Poll only when market is open
            if (isMarketOpenNow()) {
                startDataPolling();
            } else {
                stopDataPolling();
            }
        }


        async function fetchData() {
            try {
                const nData = await apiClient.get(
                    API_ENDPOINTS.NEPSE_HOME,
                    { 
                        signal: globalController.signal,
                        cacheKey: 'global_nepse_home'
                    }
                );
                updateUI(nData);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Global data fetch failed:', error);
                }
            }
        }

        function updateUI(nData) {
            const nepse = (nData.indices || [])
                .find(i => i.symbol === 'NEPSE');

            if (!nepse) return;

            const curVal = nepse.currentValue;
            const change = nepse.change;
            const prevVal = curVal - change;
            const pcent = ((change / prevVal) * 100).toFixed(2);

            const colorClass =
                change > 0 ? 'nepse-pos' :
                    change < 0 ? 'nepse-neg' :
                        'nepse-neu';

            const sign = change > 0 ? '+' : '';

            nepseWrappers.forEach(el => {
                el.className = `nepse-wrapper ${colorClass}`;
            });

            nepseValues.forEach(el => {
                el.textContent = curVal.toLocaleString('en-IN', {
                    minimumFractionDigits: 2
                });
            });

            nepseChanges.forEach(el => {
                el.textContent =
                    `${sign}${change.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            });

            nepsePercents.forEach(el => {
                el.textContent = `(${sign}${pcent}%)`;
            });

            nepseIcons.forEach(el => {
                domUtils.clearNode(el);
                if (change !== 0) {
                    el.appendChild(
                        domUtils.createElement('i', {
                            className: [
                                'fas',
                                change > 0 ? 'fa-caret-up' : 'fa-caret-down'
                            ]
                        })
                    );
                }
            });

            clearNepseShimmer();
        }

        // ---- INIT LOGIC ----

        // Auto-run on page load
        handleMarketDataPolling();

        // Re-check market status every minute
        const pollingGuardInterval = setInterval(handleMarketDataPolling, 60000);

        // Cleanup on abort/unload
        globalController.signal.addEventListener('abort', () => {
            stopDataPolling();
            clearInterval(pollingGuardInterval);
        });
    }

    let shimmerCleared = false;

    function clearNepseShimmer() {
        if (shimmerCleared) return;
        shimmerCleared = true;

        document.querySelectorAll(
            '.nepse, .nepse-change-info'
        ).forEach(el => el.classList.remove('shimmer'));
    }

    if (window.layoutInjected) {
        init();
    } else {
        document.addEventListener('layout-injected', init);
    }

    window.addEventListener('unload', () =>
        globalController.abort()
    );
})();
