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

    let rawData = []; // Store fetched data

    // Utility function to format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value || 0);
    };
    
    // Utility to format numbers with commas
    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-IN').format(value || 0);
    };

    // Live Market Data Store
    let liveMarketData = {};

    // Listen for live market updates from market.js
    document.addEventListener('nepse:data', (e) => {
        const data = e.detail;
        console.log('Received Nepse Data:', data); // Debugging

        if (Array.isArray(data)) {
            data.forEach(stock => {
                // Strictly load only Prev Close and Last Traded Price as requested
                const ltp = parseFloat(stock.lastTradedPrice) || 0;
                
                // Try to find previous close in likely fields since market.js implies it might not be standard
                // But strict instruction is "Only load...", so we look for valid property.
                const prevClose = parseFloat(stock.previousClose) || parseFloat(stock.previousPrice) || 0;

                liveMarketData[stock.symbol] = {
                    ltp: ltp,
                    prevClose: prevClose
                };
            });
            
            // Re-render if we have holdings data
            if (rawData.length > 0) {
                const enriched = enrichData(rawData);
                // Only render table if it exists
                if (tableBody) renderTable(enriched);
                updateSummary(enriched);
            }
        }
    });

    // Enrich Data with Prices
    const enrichData = (data) => {
        return data.map(item => {
            const symbol = item['Symbol'];
            
            // ALWAYS use Live Data from market.js
            // If not available yet, default to 0
            const ltp = liveMarketData[symbol]?.ltp || 0;
            const prevClose = liveMarketData[symbol]?.prevClose || 0;
            const curBal = parseFloat(item['CDS Total Balance']) || 0;
            
            return {
                ...item,
                _ltp: ltp,
                _prevClose: prevClose,
                _valCp: curBal * prevClose,
                _valLtp: curBal * ltp,
                _dayPnl: (curBal * ltp) - (curBal * prevClose),
                _source: 'live' 
            };
        });
    };

    // Calculate Summary Metrics
    const updateSummary = (data) => {
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

        if (dpCountEl) dpCountEl.textContent = data.length;
        if (dpAmountEl) dpAmountEl.textContent = formatCurrency(totalStats.currentValue);
        if (dailyPnlEl) {
             dailyPnlEl.textContent = formatCurrency(dayPnl);
             // Update color for Dashboard P/L
             dailyPnlEl.style.color = dayPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        }
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
            
            const symbol = item['Symbol'] || '-';
            const totalBal = parseFloat(item['CDS Total Balance']) || 0;
            const freeBal = parseFloat(item['CDS Free Balance']) || 0;
            const wealthEngine = item['WealthEngine'] || '-';
            
            // Highlight row if Free Balance is 0
            if (freeBal === 0) {
                row.style.background = 'rgba(220, 38, 38, 0.1)';
            }

            row.innerHTML = `
                <td><span class="scrip-name">${symbol}</span></td>
                <td class="text-right">${formatNumber(totalBal)}</td>
                <td class="text-right ${freeBal === 0 ? 'text-danger' : ''}">${formatNumber(freeBal)}</td>
                <td class="text-right">${wealthEngine}</td>
                <td class="text-right">${formatCurrency(item._prevClose)}</td>
                <td class="text-right">${formatCurrency(item._valCp)}</td>
                <td class="text-right">${formatCurrency(item._ltp)}</td>
                <td class="text-right fw-bold">${formatCurrency(item._valLtp)}</td>
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
        fetchData();
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
