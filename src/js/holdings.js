document.addEventListener('DOMContentLoaded', () => {
    // API Config
    const API_URL = 'https://script.google.com/macros/s/AKfycbxk0qnIbDA1xyzOvT4FNIbl-OJlpjHcDFbOSdFGBIMlQmmgu73OQbo0v_SW3yAK_z-X0A/exec';
    const REFRESH_INTERVAL = 60000; // 60 seconds

    // DOM Elements
    const tableBody = document.getElementById('holdings-list-body');
    const holdingCountEl = document.getElementById('holding-count');
    const totalInvEl = document.getElementById('total-investment');
    const currentValEl = document.getElementById('current-value');
    const dayPnlEl = document.getElementById('day-pnl');
    const dayPnlPercentEl = document.getElementById('day-pnl-percent');
    const searchInput = document.getElementById('holdings-search');
    const refreshBtn = document.getElementById('btn-refresh');

    // Shared formatter for cross-page consistency
    const sharedFormatter = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });

    let rawData = []; // Store fetched data
    let currentSort = {
        column: localStorage.getItem('holdings_sort_col') || 'symbol',
        direction: localStorage.getItem('holdings_sort_dir') || 'asc'
    };

    // Utility function to format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'NPR',
            maximumFractionDigits: 2
        }).format(value || 0);
    };
    
    // Utility to format numbers with commas
    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-IN').format(value || 0);
    };

    // Volatility Alert Store (Prevent Spams)
    let lastAlerts = {};
    const ALERT_COOLDOWN = 300000; // 5 minutes

    // Toast Utility
    const showToast = (title, message, type = 'info') => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'danger') icon = 'fa-exclamation-triangle';
        if (type === 'warning') icon = 'fa-bell';

        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icon}"></i></div>
            <div class="toast-info">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Remove after 5s
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    };

    // Check for high volatility in holdings
    const checkVolatility = (stock) => {
        const symbol = stock.symbol;
        const holding = rawData.find(h => h['Symbol'] === symbol);
        if (!holding) return;

        const pChange = parseFloat(stock.percentChange) || 0;
        const now = Date.now();

        // 1. Circuit Breakers (±10%) - High Priority
        if (Math.abs(pChange) >= 9.9) {
            if (!lastAlerts[`circuit_${symbol}`] || (now - lastAlerts[`circuit_${symbol}`] > ALERT_COOLDOWN)) {
                const move = pChange > 0 ? 'Upper' : 'Lower';
                showToast(
                    `🚨 ${symbol} Hit ${move} Circuit!`, 
                    `${symbol} has hit the 10% daily limit at ${stock.lastTradedPrice}. Trading may be restricted.`,
                    'warning'
                );
                lastAlerts[`circuit_${symbol}`] = now;
            }
        }

        // 2. High Volatility Alerts (8%)
        if (Math.abs(pChange) >= 8) {
            if (!lastAlerts[symbol] || (now - lastAlerts[symbol] > ALERT_COOLDOWN)) {
                const type = pChange > 0 ? 'success' : 'danger';
                const move = pChange > 0 ? 'Surged' : 'Crashed';
                showToast(
                    `${symbol} ${move}!`, 
                    `${symbol} is ${move} by ${pChange.toFixed(2)}% today. Current LTP: ${stock.lastTradedPrice}`,
                    type
                );
                lastAlerts[symbol] = now;
            }
        }
    };

    // --- Order Modal Logic ---
    const orderModal = document.getElementById('order-modal');
    const orderSymbolInput = document.getElementById('order-symbol');
    const orderQtyInput = document.getElementById('order-qty');
    const orderPriceInput = document.getElementById('order-price');
    const orderTotalEl = document.getElementById('order-total');
    let currentOrderType = 'BUY';

    const openOrderModal = (symbol, price) => {
        if (!orderModal) return;
        orderSymbolInput.value = symbol;
        orderPriceInput.value = price;
        orderQtyInput.value = '';
        updateOrderTotal();
        orderModal.style.display = 'flex';
    };

    const updateOrderTotal = () => {
        const total = (parseFloat(orderQtyInput.value) || 0) * (parseFloat(orderPriceInput.value) || 0);
        orderTotalEl.textContent = formatCurrency(total);
    };

    const setupModalEvents = () => {
        const closeBtn = document.getElementById('close-modal');
        const buyTab = document.getElementById('btn-type-buy');
        const sellTab = document.getElementById('btn-type-sell');
        const confirmBtn = document.getElementById('btn-confirm-order');

        if (closeBtn) closeBtn.onclick = () => orderModal.style.display = 'none';
        
        if (buyTab && sellTab) {
            buyTab.onclick = () => {
                currentOrderType = 'BUY';
                buyTab.classList.add('active');
                sellTab.classList.remove('active');
            };
            sellTab.onclick = () => {
                currentOrderType = 'SELL';
                sellTab.classList.add('active');
                buyTab.classList.remove('active');
            };
        }

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const qty = orderQtyInput.value;
                const price = orderPriceInput.value;
                if (!qty || qty <= 0) {
                    showToast('Invalid Order', 'Please enter a valid quantity.', 'danger');
                    return;
                }
                showToast(
                    'Order Placed', 
                    `${currentOrderType} Order for ${qty} shares of ${orderSymbolInput.value} at ${price} sent to exchange.`,
                    'success'
                );
                orderModal.style.display = 'none';
            };
        }

        if (orderQtyInput) orderQtyInput.oninput = updateOrderTotal;
        if (orderPriceInput) orderPriceInput.oninput = updateOrderTotal;

        // Close on overlay click
        if (orderModal) {
            orderModal.onclick = (e) => {
                if (e.target === orderModal) orderModal.style.display = 'none';
            };
        }
    };

    // Live Market Data Store
    let liveMarketData = {};

    // Helper to populate internal store from market data array
    const populateLiveStore = (data) => {
        if (!Array.isArray(data)) return;
        data.forEach(stock => {
            const ltp = parseFloat(stock.lastTradedPrice) || 0;
            const prevClose = parseFloat(stock.previousClose) || parseFloat(stock.previousPrice) || 0;
            
            liveMarketData[stock.symbol] = {
                ltp: ltp,
                prevClose: prevClose,
                sector: stock.sector || 'Others'
            };
        });
    };

    // 1. Initial Load from Cache (Snappy Startup)
    const cachedMarket = sessionStorage.getItem('nepse_cache_data');
    if (cachedMarket) {
        populateLiveStore(JSON.parse(cachedMarket));
    }

    // Listen for live market updates from market.js
    document.addEventListener('nepse:data', (e) => {
        const data = e.detail;
        populateLiveStore(data);
        
        // If we have holdings, refresh everything
        if (rawData.length > 0) {
            const enriched = enrichData(rawData);
            if (tableBody) renderTable(enriched);
            updateSummary(enriched);
            renderSectorAnalysis(enriched);
        }

        // Run volatility alerts
        if (Array.isArray(data)) {
            data.forEach(stock => checkVolatility(stock));
        }
    });

    // Enrich Data with Prices & Sector
    const enrichData = (data) => {
        return data.map(item => {
            const symbol = item['Symbol'] || item['Scrip'] || '';
            
            // ALWAYS use Live Data from internal store
            const ltp = liveMarketData[symbol]?.ltp || 0;
            const prevClose = liveMarketData[symbol]?.prevClose || 0;
            const sector = liveMarketData[symbol]?.sector || 'Unknown'; 

            // Flexible key mapping for balances
            const curBal = parseFloat(item['CDS Total Balance'] || item['Total Balance'] || item['Balance'] || 0);
            const prevCloseVal = prevClose || parseFloat(item['Prev Close'] || item['Previous Close'] || 0);
            
            return {
                ...item,
                Symbol: symbol, // Ensure normalized key
                _ltp: ltp,
                _prevClose: prevCloseVal,
                _valCp: curBal * prevCloseVal,
                _valLtp: curBal * ltp,
                _dayPnl: (curBal * ltp) - (curBal * prevCloseVal),
                _source: 'live',
                _sector: sector 
            };
        });
    };

    // Calculate Summary Metrics
    const updateSummary = (data) => {
        // ... (existing summary logic) ...
        let totalStats = {
            currentValue: 0,
            cpValue: 0
        };

        data.forEach(item => {
            totalStats.currentValue += item._valLtp;
            totalStats.cpValue += item._valCp;
        });

        // Day's P/L
        const dayPnl = totalStats.currentValue - totalStats.cpValue;
        const dayPnlPercent = totalStats.cpValue > 0 ? (dayPnl / totalStats.cpValue) * 100 : 0;
        const pnlClass = dayPnl >= 0 ? 'text-success' : 'text-danger';

        // Update Holdings Page DOM
        if (holdingCountEl) holdingCountEl.textContent = `(${data.length})`;
        if (totalInvEl) totalInvEl.textContent = formatCurrency(totalStats.cpValue); 
        if (currentValEl) currentValEl.textContent = formatCurrency(totalStats.currentValue);
        
        if (dayPnlEl) {
            dayPnlEl.textContent = formatCurrency(dayPnl);
            dayPnlEl.className = `pnl-value ${pnlClass}`;
        }
        
        if (dayPnlPercentEl) {
            dayPnlPercentEl.textContent = `(${dayPnlPercent.toFixed(2)}%)`;
            dayPnlPercentEl.className = `pnl-percent ${pnlClass}`;
        }

        // Update Index/Dashboard DOM (if elements exist)
        const dpCountEl = document.getElementById('dp-count');
        const dpAmountEl = document.getElementById('dp-amount');
        const dailyPnlEl = document.getElementById('dailypnl');

        // Use standard number formatter for dashboard to maintain look
        const dashboardFormatter = new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });

        if (dpCountEl) dpCountEl.textContent = data.length;
        if (dpAmountEl) dpAmountEl.textContent = 'Rs.' + dashboardFormatter.format(totalStats.currentValue);
        if (dailyPnlEl) {
             dailyPnlEl.textContent = 'Rs.' + dashboardFormatter.format(dayPnl);
             dailyPnlEl.style.color = dayPnl >= 0 ? '#0fc218' : '#ff0303';
        }

        // Update Top Ticker Tape (if on Index)
        renderTickerTape(data);
        
        // Notify other scripts (like index.js) that holdings data is ready/updated
        document.dispatchEvent(new CustomEvent('holdings:updated', { detail: data }));
    };

    // Render Ticker Tape for Dashboard
    const renderTickerTape = (data) => {
        const tickerWrapper = document.getElementById('holdings-ticker-wrapper');
        const tickerContent = document.getElementById('holdings-ticker-content');
        if (!tickerWrapper || !tickerContent) return;

        if (data.length === 0) {
            tickerWrapper.style.display = 'none';
            return;
        }

        tickerWrapper.style.display = 'block';

        let html = "";
        // Duplicate data for a seamless loop effect
        const displayData = [...data, ...data]; 

        displayData.forEach(item => {
            const sym = item['Symbol'];
            const ltp = item._ltp || 0;
            const prev = item._prevClose || 0;
            const change = ltp - prev;
            const pChange = prev > 0 ? (change / prev) * 100 : 0;
            
            let pnlClass = 'text-neutral';
            let icon = '■'; // Square for unchange
            if (change > 0) {
                pnlClass = 'text-success';
                icon = '▲';
            } else if (change < 0) {
                pnlClass = 'text-danger';
                icon = '▼';
            }

            html += `
                <span class="holding-item">
                    <span class="h-sym">${sym}</span>
                    <span class="h-price">${ltp.toFixed(2)}</span>
                    <span class="h-change ${pnlClass}">${icon} ${pChange.toFixed(2)}%</span>
                </span>
            `;
        });

        tickerContent.innerHTML = html;
    };

    // Render Sector Analysis
    const renderSectorAnalysis = (data) => {
        // Check if container exists, if not create it
        let sectorContainer = document.getElementById('sector-analysis-container');
        if (!sectorContainer) {
            const summaryContainer = document.querySelector('.holdings-summary-container');
            if (summaryContainer) {
                // Insert after summary container
                sectorContainer = document.createElement('div');
                sectorContainer.id = 'sector-analysis-container';
                sectorContainer.className = 'holdings-summary-container'; // Reuse analytics flex/grid style
                sectorContainer.style.marginTop = '20px';
                summaryContainer.parentNode.insertBefore(sectorContainer, summaryContainer.nextSibling);
            } else {
                return; // Can't find place to insert
            }
        }

        // Calculate Sector Metrics
        const sectorMap = {};
        let totalPortfolioValue = 0;

        data.forEach(item => {
            const sector = item._sector || 'Unknown';
            // Init if not exists
            if (!sectorMap[sector]) sectorMap[sector] = 0;
            // Add value
            sectorMap[sector] += item._valLtp;
            totalPortfolioValue += item._valLtp;
        });

        // Convert to Array & Sort
        const sortedSectors = Object.entries(sectorMap)
            .map(([name, value]) => ({
                name,
                value,
                percent: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value); // Descending order

        // Render HTML
        let html = `
            <div class="summary-card" style="grid-column: 1 / -1;">
                <h3>Sector Allocation</h3>
                <div class="sector-bars-wrapper" style="margin-top: 15px; display: grid; gap: 15px;">
        `;

        sortedSectors.forEach(sec => {
            html += `
                <div class="sector-row">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                        <span>${sec.name}</span>
                        <span>${formatCurrency(sec.value)} (${sec.percent.toFixed(1)}%)</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: var(--link-active); width: ${sec.percent}%; height: 100%;"></div>
                    </div>
                </div>
            `;
        });

        html += `   </div>
            </div>
        `;

        sectorContainer.innerHTML = html;
    };

    // Render Table
    const renderTable = (data) => {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        No holdings found.
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer'; // Make it clear it's clickable
            
            const symbol = item['Symbol'] || '-';
            const totalBal = parseFloat(item['CDS Total Balance']) || 0;
            const freeBal = parseFloat(item['CDS Free Balance']) || 0;
            const wealthEngine = item['WealthEngine'] || '-';
            const ltp = item._ltp || 0;

            row.onclick = () => openOrderModal(symbol, ltp);
            
            // Highlight row if Free Balance is 0
            if (freeBal === 0) {
                row.style.background = 'rgba(220, 38, 38, 0.1)';
            }

            row.innerHTML = `
                <td><span class="scrip-name">${symbol}</span></td>
                <td class="text-right">${formatNumber(totalBal)}</td>
                <td class="text-right ${freeBal === 0 ? 'text-danger' : ''}">${formatNumber(freeBal)}</td>
                <td class="text-right">${wealthEngine}</td>
                <td class="text-right">${(item._prevClose).toLocaleString({maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                <td class="text-right">${(item._valCp).toLocaleString({maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                <td class="text-right">${(item._ltp).toLocaleString({maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
                <td class="text-right fw-bold">${(item._valLtp).toLocaleString({maximumFractionDigits: 2, minimumFractionDigits: 2})}</td>
            `;
            tableBody.appendChild(row);
        });
    };

    // Sorting Function
    const sortData = (column) => {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Persist sort settings
        localStorage.setItem('holdings_sort_col', currentSort.column);
        localStorage.setItem('holdings_sort_dir', currentSort.direction);

        const sorted = [...rawData].sort((a, b) => {
            let valA, valB;

            switch(column) {
                case 'symbol': 
                    valA = a['Symbol']; valB = b['Symbol']; break;
                case 'qty': 
                    valA = parseFloat(a['CDS Total Balance']); valB = parseFloat(b['CDS Total Balance']); break;
                case 'value': 
                    valA = a._valLtp; valB = b._valLtp; break;
                default: return 0;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        rawData = sorted;
        renderTable(sorted);
    };

    // CSV Download
    const downloadCSV = () => {
        if (!rawData.length) return;
        
        const headers = ['Symbol', 'Total Balance', 'Free Balance', 'WealthEngine', 'Prev Close', 'LTP', 'Current Value'];
        const csvRows = [headers.join(',')];

        rawData.forEach(item => {
            const row = [
                item['Symbol'],
                item['CDS Total Balance'],
                item['CDS Free Balance'],
                item['WealthEngine'],
                item._prevClose,
                item._ltp,
                item._valLtp
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "holdings_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Fetch Data
    const fetchData = async () => {
        try {
            if(tableBody && tableBody.children.length === 0) {
                tableBody.innerHTML = `<tr class="empty-state"><td colspan="8" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
            }

            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const json = await response.json();
            
            // Save symbols for DP Watchlist (Dashboard)
            if (Array.isArray(json)) {
                const symbols = [...new Set(json.map(item => item['Symbol']))];
                localStorage.setItem('holding_symbols', JSON.stringify(symbols));
            }

            const enriched = enrichData(json); // Add prices
            rawData = enriched;
            
            // Render table only if existing
            if (tableBody) renderTable(enriched);
            updateSummary(enriched);

        } catch (error) {
            console.error('Error:', error);
            if (tableBody) {
                tableBody.innerHTML = `<tr class="empty-state"><td colspan="8" style="text-align: center; color: var(--color-danger);">Failed to load data.</td></tr>`;
            }
        }
    };

    // Initialize
    const init = () => {
        setupModalEvents();
        fetchData().then(() => {
            // Apply persisted sort after first fetch
            if (currentSort.column) {
                // We need a temporary toggle because sortData flips the direction
                const targetDir = currentSort.direction;
                currentSort.direction = targetDir === 'asc' ? 'desc' : 'asc'; 
                sortData(currentSort.column);
            }
        });
        setInterval(fetchData, REFRESH_INTERVAL);

        // Events
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toUpperCase();
                if (!rawData) return;
                const filtered = rawData.filter(item => (item['Symbol'] || '').includes(term));
                if (tableBody) renderTable(filtered);
            });
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                if(icon) icon.classList.add('fa-spin');
                fetchData().finally(() => {
                    if(icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
                });
            });
        }

        const downloadBtn = document.getElementById('btn-download');
        if (downloadBtn) downloadBtn.addEventListener('click', downloadCSV);

        const printBtn = document.getElementById('btn-print');
        if (printBtn) printBtn.addEventListener('click', () => window.print());
        
        // Attach Sort to Headers (Assuming fixed column order for now)
        const headers = document.querySelectorAll('.holdings-table th');
        if (headers.length > 0) {
            headers[0].addEventListener('click', () => sortData('symbol')); // Symbol
            headers[1].addEventListener('click', () => sortData('qty')); // Total Balance
            headers[7].addEventListener('click', () => sortData('value')); // Value (LTP)
            
            // Add cursor pointer to sortable headers
            headers[0].style.cursor = 'pointer';
            headers[1].style.cursor = 'pointer';
            headers[7].style.cursor = 'pointer';
        }
    };

    init();
});
