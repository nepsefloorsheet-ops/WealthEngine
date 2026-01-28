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
            container = domUtils.createElement('div', { className: 'toast-container' });
            document.body.appendChild(container);
        }

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'danger') icon = 'fa-exclamation-triangle';
        if (type === 'warning') icon = 'fa-bell';

        const toast = domUtils.createElement('div', {
            className: ['toast', `toast-${type}`],
            children: [
                domUtils.createElement('div', { 
                    className: 'toast-icon', 
                    children: [domUtils.createElement('i', { className: ['fas', icon] })] 
                }),
                domUtils.createElement('div', {
                    className: 'toast-info',
                    children: [
                        domUtils.createElement('div', { className: 'toast-title', textContent: title }),
                        domUtils.createElement('div', { className: 'toast-message', textContent: message })
                    ]
                })
            ]
        });

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

        if (closeBtn) closeBtn.addEventListener('click', () => orderModal.style.display = 'none');
        
        if (buyTab && sellTab) {
            buyTab.addEventListener('click', () => {
                currentOrderType = 'BUY';
                buyTab.classList.add('active');
                sellTab.classList.remove('active');
            });
            sellTab.addEventListener('click', () => {
                currentOrderType = 'SELL';
                sellTab.classList.add('active');
                buyTab.classList.remove('active');
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
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
            });
        }

        if (orderQtyInput) orderQtyInput.addEventListener('input', updateOrderTotal);
        if (orderPriceInput) orderPriceInput.addEventListener('input', updateOrderTotal);

        // Close on overlay click
        if (orderModal) {
            orderModal.addEventListener('click', (e) => {
                if (e.target === orderModal) orderModal.style.display = 'none';
            });
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
        domUtils.clearNode(tickerContent);

        const fragment = document.createDocumentFragment();
        // Duplicate data for a seamless loop effect
        const displayData = [...data, ...data]; 

        displayData.forEach(item => {
            const sym = item['Symbol'];
            const ltp = item._ltp || 0;
            const prev = item._prevClose || 0;
            const change = ltp - prev;
            const pChange = prev > 0 ? (change / prev) * 100 : 0;
            
            let pnlClass = 'text-neutral';
            let icon = '■';
            if (change > 0) {
                pnlClass = 'text-success';
                icon = '▲';
            } else if (change < 0) {
                pnlClass = 'text-danger';
                icon = '▼';
            }

            const span = domUtils.createElement('span', {
                className: 'holding-item',
                children: [
                    domUtils.createElement('span', { className: 'h-sym', textContent: sym }),
                    domUtils.createElement('span', { className: 'h-price', textContent: ltp.toFixed(2) }),
                    domUtils.createElement('span', { 
                        className: ['h-change', pnlClass], 
                        textContent: `${icon} ${pChange.toFixed(2)}%` 
                    })
                ]
            });
            fragment.appendChild(span);
        });

        tickerContent.appendChild(fragment);
    };

    // Render Sector Analysis
    const renderSectorAnalysis = (data) => {
        let sectorContainer = document.getElementById('sector-analysis-container');
        if (!sectorContainer) {
            const summaryContainer = document.querySelector('.holdings-summary-container');
            if (summaryContainer) {
                sectorContainer = domUtils.createElement('div', {
                    id: 'sector-analysis-container',
                    className: 'holdings-summary-container',
                    styles: { marginTop: '20px' }
                });
                summaryContainer.parentNode.insertBefore(sectorContainer, summaryContainer.nextSibling);
            } else {
                return;
            }
        }

        const sectorMap = {};
        let totalPortfolioValue = 0;

        data.forEach(item => {
            const sector = item._sector || 'Unknown';
            if (!sectorMap[sector]) sectorMap[sector] = 0;
            sectorMap[sector] += item._valLtp;
            totalPortfolioValue += item._valLtp;
        });

        const sortedSectors = Object.entries(sectorMap)
            .map(([name, value]) => ({
                name,
                value,
                percent: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);

        domUtils.clearNode(sectorContainer);

        const card = domUtils.createElement('div', {
            className: 'summary-card',
            styles: { gridColumn: '1 / -1' },
            children: [
                domUtils.createElement('h3', { textContent: 'Sector Allocation' }),
                domUtils.createElement('div', {
                    className: 'sector-bars-wrapper',
                    styles: { marginTop: '15px', display: 'grid', gap: '15px' },
                    children: sortedSectors.map(sec => 
                        domUtils.createElement('div', {
                            className: 'sector-row',
                            children: [
                                domUtils.createElement('div', {
                                    styles: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' },
                                    children: [
                                        domUtils.createElement('span', { textContent: sec.name }),
                                        domUtils.createElement('span', { textContent: `${formatCurrency(sec.value)} (${sec.percent.toFixed(1)}%)` })
                                    ]
                                }),
                                domUtils.createElement('div', {
                                    styles: { background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' },
                                    children: [
                                        domUtils.createElement('div', {
                                            styles: { background: 'var(--link-active)', width: `${sec.percent}%`, height: '100%' }
                                        })
                                    ]
                                })
                            ]
                        })
                    )
                })
            ]
        });

        sectorContainer.appendChild(card);
    };

    // Render Table
    const renderTable = (data) => {
        if (!tableBody) return;
        domUtils.clearNode(tableBody);

        if (!data || data.length === 0) {
            tableBody.appendChild(domUtils.createElement('tr', {
                className: 'empty-state',
                children: [
                    domUtils.createElement('td', {
                        attributes: { colspan: '8' },
                        styles: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)' },
                        textContent: 'No holdings found.'
                    })
                ]
            }));
            return;
        }

        const fragment = document.createDocumentFragment();

        data.forEach(item => {
            const symbol = item['Symbol'] || '-';
            const totalBal = parseFloat(item['CDS Total Balance']) || 0;
            const freeBal = parseFloat(item['CDS Free Balance']) || 0;
            const wealthEngine = item['WealthEngine'] || '-';
            const ltp = item._ltp || 0;

            const rowStyles = { cursor: 'pointer' };
            if (freeBal === 0) {
                rowStyles.background = 'rgba(220, 38, 38, 0.1)';
            }

            const row = domUtils.createElement('tr', {
                styles: rowStyles,
                children: [
                    domUtils.createElement('td', { children: [domUtils.createElement('span', { className: 'scrip-name', textContent: symbol })] }),
                    domUtils.createElement('td', { className: 'text-right', textContent: formatNumber(totalBal) }),
                    domUtils.createElement('td', { 
                        className: ['text-right', freeBal === 0 ? 'text-danger' : ''], 
                        textContent: formatNumber(freeBal) 
                    }),
                    domUtils.createElement('td', { className: 'text-right', textContent: String(wealthEngine) }),
                    domUtils.createElement('td', { 
                        className: 'text-right', 
                        textContent: (item._prevClose).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) 
                    }),
                    domUtils.createElement('td', { 
                        className: 'text-right', 
                        textContent: (item._valCp).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) 
                    }),
                    domUtils.createElement('td', { 
                        className: 'text-right', 
                        textContent: (item._ltp).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) 
                    }),
                    domUtils.createElement('td', { 
                        className: ['text-right', 'fw-bold'], 
                        textContent: (item._valLtp).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) 
                    })
                ]
            });

            row.addEventListener('click', () => openOrderModal(symbol, ltp));
            fragment.appendChild(row);
        });

        tableBody.appendChild(fragment);
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
                domUtils.clearNode(tableBody);
                tableBody.appendChild(domUtils.createElement('tr', {
                    className: 'empty-state',
                    children: [
                        domUtils.createElement('td', {
                            attributes: { colspan: '8' },
                            styles: { textAlign: 'center', padding: '20px' },
                            children: [
                                domUtils.createElement('i', { className: ['fas', 'fa-spinner', 'fa-spin'] }),
                                document.createTextNode(' Loading...')
                            ]
                        })
                    ]
                }));
            }

            const json = await apiClient.get(API_URL);
            
            if (Array.isArray(json)) {
                const symbols = [...new Set(json.map(item => item['Symbol']))];
                localStorage.setItem('holding_symbols', JSON.stringify(symbols));
            }

            const enriched = enrichData(json);
            rawData = enriched;
            
            if (tableBody) renderTable(enriched);
            updateSummary(enriched);

        } catch (error) {
            console.error('Error:', error);
            if (tableBody) {
                domUtils.clearNode(tableBody);
                tableBody.appendChild(domUtils.createElement('tr', {
                    className: 'empty-state',
                    children: [
                        domUtils.createElement('td', {
                            attributes: { colspan: '8' },
                            styles: { textAlign: 'center', color: 'var(--color-danger)' },
                            textContent: 'Failed to load data.'
                        })
                    ]
                }));
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
