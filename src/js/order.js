/* =========================================================
   NEPSE MOCK TRADING LOGIC (Dual Mode Capable)
========================================================= */

// --- STATE ---
const STATE = {
    symbol: "NICA",
    ltp: 740.0,
    open: 735.0,
    high: 752.0,
    low: 730.0,
    close: 732.0, // This is P.Close
    volume: 45020,
    turnover: 35000000,
    avgPrice: 742.5,
    collateral: 50000000.00, // Matching index.html (5 Crore)
    tradeMode: "buy", // 'buy', 'sell', 'dual'
    isMarket: false,
    depth: {
        bids: [],
        asks: []
    }
};

// --- CONSTANTS ---
const LOT_SIZE = 10;
const PRICE_BAND_PERCENT = 0.02; // +/- 2%
const COMMISSION_RATE = 0.004;
const DP_CHARGE = 25;

/* =========================================================
   MARKET DEPTH VISUALIZER (CANVAS)
========================================================= */
function renderDepthChart() {
    const canvas = document.getElementById('depthVisualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Set internal resolution for DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);

    if (STATE.depth.bids.length === 0 || STATE.depth.asks.length === 0) return;

    // Process Bids - Cumulative
    let cumulativeBidVol = 0;
    const processedBids = STATE.depth.bids.map(b => {
        cumulativeBidVol += b.vol;
        return { price: b.price, vol: cumulativeBidVol };
    });

    // Process Asks - Cumulative
    let cumulativeAskVol = 0;
    const processedAsks = STATE.depth.asks.map(a => {
        cumulativeAskVol += a.vol;
        return { price: a.price, vol: cumulativeAskVol };
    });

    const maxVol = Math.max(
        processedBids[processedBids.length - 1].vol,
        processedAsks[processedAsks.length - 1].vol
    ) * 1.1;

    const centerX = width / 2;

    // Draw Bids (Green) - Left to Center
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    processedBids.forEach((b, i) => {
        const x = (i / processedBids.length) * centerX;
        const y = height - (b.vol / maxVol) * height;
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(centerX, height - (processedBids[processedBids.length - 1].vol / maxVol) * height);
    ctx.lineTo(centerX, height);
    ctx.closePath();
    
    const greenGradient = ctx.createLinearGradient(0, 0, 0, height);
    greenGradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    greenGradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
    ctx.fillStyle = greenGradient;
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Asks (Red) - Center to Right
    ctx.beginPath();
    ctx.moveTo(centerX, height);
    
    processedAsks.forEach((a, i) => {
        const x = centerX + ((i + 1) / processedAsks.length) * centerX;
        const y = height - (a.vol / maxVol) * height;
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    
    const redGradient = ctx.createLinearGradient(0, 0, 0, height);
    redGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    redGradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
    ctx.fillStyle = redGradient;
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Needle
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
}

// --- DOM ELEMENTS (Dynamic Lookups helper) ---
const getDom = () => ({
    ltp: document.getElementById('tickerLTP'),
    change: document.getElementById('tickerChange'),
    highLow: document.getElementById('tickerHighLow'),
    bidTable: document.getElementById('bidTable'),
    askTable: document.getElementById('askTable'),

    // Toggle Buttons
    btnBuy: document.getElementById('btnToggleBuy'),
    btnSell: document.getElementById('btnToggleSell'),
    btnDual: document.getElementById('btnToggleDual'),

    // Sections
    orderCard: document.getElementById('orderCard'),
    buySection: document.getElementById('buySection'),
    sellSection: document.getElementById('sellSection'),

    toast: document.getElementById('toast'),
    recentOrders: document.getElementById('recentOrdersBody'),
    symbolSearch: document.getElementById('symbolSearch'),
    buyQty: document.getElementById('buyQty'),
    buyPrice: document.getElementById('buyPrice'),
    sellQty: document.getElementById('sellQty'),
    sellPrice: document.getElementById('sellPrice')
});

/* =========================================================
   KEYBOARD SHORTCUTS ENGINE
========================================================= */
const Shortcuts = (() => {
    function init() {
        document.addEventListener('keydown', handleGlobalKeys);
    }

    function handleGlobalKeys(e) {
        const dom = getDom();
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        
        // 1. GLOBAL NAVIGATION (Works even if inputs are focused if Alt/Shift is used)
        
        // Toggle Modes: Shift + B/S/D
        if (e.shiftKey && !e.ctrlKey && !e.altKey) {
            if (e.key.toUpperCase() === 'B') { e.preventDefault(); setTradeMode('buy'); showToast("Switched to BUY Mode", "success"); return; }
            if (e.key.toUpperCase() === 'S') { e.preventDefault(); setTradeMode('sell'); showToast("Switched to SELL Mode", "success"); return; }
            if (e.key.toUpperCase() === 'D') { e.preventDefault(); setTradeMode('dual'); showToast("Switched to DUAL Mode", "success"); return; }
        }

        // Focus Search: / or Alt + S
        if ((e.key === '/' && !isInput) || (e.altKey && e.key.toLowerCase() === 's')) {
            e.preventDefault();
            if (dom.symbolSearch) {
                dom.symbolSearch.focus();
                dom.symbolSearch.select();
            }
            return;
        }

        // 2. CONTEXTUAL (Only when specific elements are or are NOT focused)
        
        // Focus Qty/Price: Alt + Q/P
        if (e.altKey) {
            if (e.key.toLowerCase() === 'q') {
                e.preventDefault();
                const side = (STATE.tradeMode === 'sell') ? 'sell' : 'buy';
                const el = document.getElementById(`${side}Qty`);
                if (el) { el.focus(); el.select(); }
                return;
            }
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                const side = (STATE.tradeMode === 'sell') ? 'sell' : 'buy';
                const el = document.getElementById(`${side}Price`);
                if (el) { el.focus(); el.select(); }
                return;
            }
        }

        // Submit: Ctrl + Enter
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (STATE.tradeMode === 'dual') {
                // In dual mode, check which part of the form has focus, or submit both?
                // Standard: Submit whatever section is active or has focus.
                if (document.activeElement.closest('.sell-section')) submitOrder('sell');
                else submitOrder('buy');
            } else {
                submitOrder(STATE.tradeMode);
            }
            return;
        }

        // Escape: Blur/Clear
        if (e.key === 'Escape') {
            if (isInput) document.activeElement.blur();
            const legend = document.getElementById('hotkeyLegend');
            if (legend) legend.style.display = 'none';
            return;
        }

        // Help Legend: ?
        if (e.key === '?' && !isInput) {
            e.preventDefault();
            const legend = document.getElementById('hotkeyLegend');
            if (legend) {
                legend.style.display = (legend.style.display === 'none') ? 'block' : 'none';
            }
            return;
        }

        // 3. INPUT SPECIFIC (Arrow Keys for Qty)
        if (isInput && document.activeElement.id.endsWith('Qty')) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const side = document.activeElement.id.replace('Qty', '');
                addQty(side, LOT_SIZE);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const side = document.activeElement.id.replace('Qty', '');
                addQty(side, -LOT_SIZE);
            }
        }
    }

    return { init };
})();

/* =========================================================
   PROFIT/LOSS (RISK/REWARD) VISUALIZER
========================================================= */
const PLVisualizer = (() => {
    function init() {
        // Only for BUY side
        const targetSlider = document.getElementById(`buyTargetSlider`);
        const stopSlider = document.getElementById(`buyStopSlider`);
        const priceInput = document.getElementById(`buyPrice`);
        
        if (targetSlider) targetSlider.addEventListener('input', () => update('buy'));
        if (stopSlider) stopSlider.addEventListener('input', () => update('buy'));
        if (priceInput) priceInput.addEventListener('input', () => update('buy'));
        
        // Initial update
        update('buy');
    }

    function update(side) {
        if (side !== 'buy') return; // NEPSE No Short Selling

        const priceInput = document.getElementById(`buyPrice`);
        const targetSlider = document.getElementById(`buyTargetSlider`);
        const stopSlider = document.getElementById(`buyStopSlider`);
        const container = document.getElementById('buyRRContainer');
        
        if (!priceInput || !targetSlider || !stopSlider || !container) return;

        const targetPctEl = document.getElementById(`buyTargetPct`);
        const stopPctEl = document.getElementById(`buyStopPct`);
        const rrRatioEl = document.getElementById(`buyRRRatio`);
        const targetPriceEl = document.getElementById(`buyTargetPrice`);
        const stopPriceEl = document.getElementById(`buyStopPrice`);
        const gaugeLoss = document.getElementById(`buyGaugeLoss`);
        const gaugeProfit = document.getElementById(`buyGaugeProfit`);

        const entryPrice = parseFloat(priceInput.value) || 0;

        // HANDLE DISABLED STATE
        if (entryPrice <= 0) {
            container.classList.add('disabled');
            targetPriceEl.innerText = "--";
            stopPriceEl.innerText = "--";
            rrRatioEl.innerText = "R:R --";
            return;
        } else {
            container.classList.remove('disabled');
        }

        const targetPct = parseInt(targetSlider.value);
        const stopPct = parseInt(stopSlider.value);

        // Update Labels
        targetPctEl.innerText = `${targetPct}%`;
        stopPctEl.innerText = `${stopPct}%`;

        // Calculate Prices
        const targetPrice = entryPrice * (1 + targetPct / 100);
        const stopPrice = entryPrice * (1 - stopPct / 100);

        targetPriceEl.innerText = targetPrice.toFixed(2);
        stopPriceEl.innerText = stopPrice.toFixed(2);

        // R:R Ratio
        const ratio = (targetPct / stopPct).toFixed(1);
        rrRatioEl.innerText = `R:R 1:${ratio}`;
        
        // Update Gauge
        const total = stopPct + targetPct;
        const lossWidth = (stopPct / total) * 100;
        const profitWidth = (targetPct / total) * 100;

        gaugeLoss.style.width = `${lossWidth}%`;
        gaugeProfit.style.width = `${profitWidth}%`;
    }

    return { init, update };
})();

// --- INITIALIZATION ---
function init() {
    // Initialize Shortcuts
    Shortcuts.init();

    // Initialize P/L Visualizer
    PLVisualizer.init();

    // [SYNC] Load Collateral from localStorage (shared with Dashboard)
    const savedCollateral = localStorage.getItem('userCollateral');
    if (savedCollateral) {
        STATE.collateral = parseFloat(savedCollateral);
    }

    updateTicker();
    generateMarketDepth();
    calculatePriceBand();

    // Initial Mode
    setTradeMode('buy');

    // [NEW] Search Listener
    const searchInput = document.getElementById('symbolSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = e.target.value.trim().toUpperCase();
                if (val && val.length >= 3) {
                    changeSymbol(val);
                    e.target.blur(); // Remove focus
                }
            }
        });
    }

    // Handle Resize for Canvas
    window.addEventListener('resize', renderDepthChart);

    // Simulation Interval
    setInterval(() => {
        simulateTick();
    }, 3000);
}

// --- SYMBOL CHANGE ---
function changeSymbol(newSym) {
    STATE.symbol = newSym;

    // Simulate fetching new stock data (Randomize base values)
    STATE.ltp = Math.floor(Math.random() * 2000) + 100; // Random price 100-2100
    STATE.close = STATE.ltp - (Math.random() * 10 - 5);
    STATE.open = STATE.close;
    STATE.high = STATE.ltp + 5;
    STATE.low = STATE.ltp - 5;
    STATE.volume = Math.floor(Math.random() * 100000);

    // Update UI immediately
    updateTicker();
    let bids = ""; let asks = ""; // specific clear if needed, or let generateMarketDepth handle it
    generateMarketDepth();
    calculatePriceBand();

    showToast(`Switched to ${newSym}`, "success");
}

// --- SIMULATION ---
function simulateTick() {
    const move = (Math.random() - 0.5) * 2;
    STATE.ltp = parseFloat((STATE.ltp + move).toFixed(1));
    updateTicker();
    generateMarketDepth();
    calculatePriceBand(); // update ranges on tick
}

function updateTicker() {
    const change = STATE.ltp - STATE.close;
    const pChange = ((change / STATE.close) * 100).toFixed(2);
    const dom = getDom();

    if (dom.ltp) dom.ltp.innerText = STATE.ltp.toFixed(1);
    if (dom.change) {
        dom.change.innerText = `${change > 0 ? '+' : ''}${change.toFixed(1)} (${pChange}%)`;
        dom.change.style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    if (dom.highLow) dom.highLow.innerText = `${STATE.high} / ${STATE.low}`;

    // Update Stats Grid
    const el = (id) => document.getElementById(id);
    if (el('depthLTP')) {
        el('depthLTP').innerText = STATE.ltp.toFixed(1);
        el('depthChange').innerText = `${change > 0 ? '+' : ''}${change.toFixed(1)} (${pChange}%)`;
        el('depthChange').style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

        el('depthHigh').innerText = STATE.high;
        el('depthLow').innerText = STATE.low;
        el('depthAvg').innerText = STATE.avgPrice;
        el('depthPClose').innerText = STATE.close;
        el('depthVol').innerText = STATE.volume.toLocaleString();
        el('depthTurnover').innerText = (STATE.turnover / 100000).toFixed(2) + 'L';
    }

    // Update Collateral Display
    const colEl = document.getElementById('userCollateral');
    if (colEl) {
        colEl.innerText = "NPR " + STATE.collateral.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    }

    // Update inputs if empty
    ['buySymbol', 'sellSymbol'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = STATE.symbol;
    });
}

function calculatePriceBand() {
    const upper = STATE.ltp * (1 + PRICE_BAND_PERCENT);
    const lower = STATE.ltp * (1 - PRICE_BAND_PERCENT);
    const rangeText = `Range: ${lower.toFixed(1)} - ${upper.toFixed(1)}`;

    const bpr = document.getElementById('buyPriceRange');
    const spr = document.getElementById('sellPriceRange');
    if (bpr) bpr.innerText = rangeText;
    if (spr) spr.innerText = rangeText;
}

// --- MARKET DEPTH ---
function generateMarketDepth() {
    // Clear state arrays
    STATE.depth.bids = [];
    STATE.depth.asks = [];

    const bidTable = document.getElementById('bidTable');
    const askTable = document.getElementById('askTable');
    
    domUtils.clearNode(bidTable);
    domUtils.clearNode(askTable);

    for (let i = 1; i <= 5; i++) {
        const bidPrice = parseFloat((STATE.ltp - (i * 0.5) - Math.random()).toFixed(1));
        const askPrice = parseFloat((STATE.ltp + (i * 0.5) + Math.random()).toFixed(1));

        const bidVol = Math.floor(Math.random() * 500) + 10;
        const askVol = Math.floor(Math.random() * 500) + 10;

        const bidOrders = Math.floor(Math.random() * 20) + 1;
        const askOrders = Math.floor(Math.random() * 20) + 1;
        
        // Save to state for visualizer
        STATE.depth.bids.push({ price: bidPrice, vol: bidVol });
        STATE.depth.asks.push({ price: askPrice, vol: askVol });

        const bidRow = domUtils.createElement('tr', {
            attributes: { onclick: `fillPrice(${bidPrice})` },
            children: [
                domUtils.createElement('td', { className: 'depth-buy', styles: { color: 'var(--text-muted)' }, textContent: bidOrders.toString() }),
                domUtils.createElement('td', { className: 'depth-buy', textContent: bidVol.toString() }),
                domUtils.createElement('td', { className: 'depth-buy', styles: { fontWeight: 'bold' }, textContent: bidPrice.toString() })
            ]
        });
        bidTable.appendChild(bidRow);

        const askRow = domUtils.createElement('tr', {
            attributes: { onclick: `fillPrice(${askPrice})` },
            children: [
                domUtils.createElement('td', { className: 'depth-sell', styles: { fontWeight: 'bold' }, textContent: askPrice.toString() }),
                domUtils.createElement('td', { className: 'depth-sell', textContent: askVol.toString() }),
                domUtils.createElement('td', { className: 'depth-sell', styles: { color: 'var(--text-muted)' }, textContent: askOrders.toString() })
            ]
        });
        askTable.appendChild(askRow);
    }
    
    // RENDER VISUALIZER
    renderDepthChart();
}

// --- MODE HANDLING ---
window.setTradeMode = function (mode) {
    STATE.tradeMode = mode;
    const dom = getDom();

    // Reset Buttons
    [dom.btnBuy, dom.btnSell, dom.btnDual].forEach(b => b.classList.remove('active'));

    // Reset Sections
    dom.buySection.style.display = 'none';
    dom.sellSection.style.display = 'none';
    dom.orderCard.classList.remove('dual-mode');

    // Activate Mode
    if (mode === 'buy') {
        dom.btnBuy.classList.add('active');
        dom.buySection.style.display = 'block';
    } else if (mode === 'sell') {
        dom.btnSell.classList.add('active');
        dom.sellSection.style.display = 'block';
    } else { // Dual
        dom.btnDual.classList.add('active');
        dom.buySection.style.display = 'block';
        dom.sellSection.style.display = 'block';
        dom.orderCard.classList.add('dual-mode');
    }
}

// --- CALCULATION & FILL ---
window.fillPrice = function (p) {
    // Fill active forms
    if (STATE.tradeMode === 'buy' || STATE.tradeMode === 'dual') {
        document.getElementById('buyPrice').value = p;
        calculateTotal('buy');
    }
    if (STATE.tradeMode === 'sell' || STATE.tradeMode === 'dual') {
        document.getElementById('sellPrice').value = p;
        calculateTotal('sell');
    }
}

// --- SHORTCUTS ---
window.addQty = function (side, amount) {
    const qtyInput = document.getElementById(`${side}Qty`);
    let current = parseInt(qtyInput.value) || 0;
    current += amount;
    
    // Round to nearest lot size
    current = Math.floor(current / LOT_SIZE) * LOT_SIZE;
    if (current < LOT_SIZE) current = LOT_SIZE;

    qtyInput.value = current;
    calculateTotal(side);
}

window.setPct = function (side, pct) {
    const qtyInput = document.getElementById(`${side}Qty`);
    const priceInput = document.getElementById(`${side}Price`);
    let price = parseFloat(priceInput.value) || STATE.ltp;

    if (side === 'buy') {
        if (price <= 0) price = STATE.ltp;
        // Qty = (Collateral / Price) * pct
        let maxQty = (STATE.collateral / price) * pct;
        let qty = Math.floor(maxQty / LOT_SIZE) * LOT_SIZE;
        if (qty < LOT_SIZE && maxQty >= LOT_SIZE) qty = LOT_SIZE;
        else if (qty < LOT_SIZE) qty = 0;
        
        qtyInput.value = qty;
    } else {
        // Mock Holding: 1000 shares for simulation
        const mockHolding = 1000;
        let qty = Math.floor((mockHolding * pct) / LOT_SIZE) * LOT_SIZE;
        qtyInput.value = qty;
    }
    
    calculateTotal(side);
}

window.calculateTotal = function (side) {
    const qtyInput = document.getElementById(`${side}Qty`);
    const priceInput = document.getElementById(`${side}Price`);
    const totalSpan = document.getElementById(`${side}Total`);

    const qty = parseInt(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    if (qty > 0 && price > 0) {
        const amount = qty * price;
        const total = amount;
        totalSpan.innerText = total.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    } else {
        totalSpan.innerText = '0.00';
    }

    // Update P/L Visualizer
    if (typeof PLVisualizer !== 'undefined') {
        PLVisualizer.update(side);
    }
}

// --- SUBMISSION ---
window.submitOrder = function (side) {
    const qty = parseInt(document.getElementById(`${side}Qty`).value);
    const price = parseFloat(document.getElementById(`${side}Price`).value);

    // Validation
    if (!qty || qty % LOT_SIZE !== 0) {
        showToast("Error: Quantity must be a multiple of " + LOT_SIZE, "error");
        return;
    }

    if (!price || price <= 0) {
        showToast("Error: Invalid Price", "error");
        return;
    }

    // Price Band
    const upper = STATE.ltp * (1 + PRICE_BAND_PERCENT);
    const lower = STATE.ltp * (1 - PRICE_BAND_PERCENT);

    if (price > upper || price < lower) {
        showToast(`Error: Price out of band (${lower.toFixed(1)} - ${upper.toFixed(1)})`, "error");
        return;
    }

    // Collateral Validation (BUY only)
    if (side === 'buy') {
        const totalAmt = qty * price;
        // Note: In real world, include comm/dp in check. Here simplistic as requested.
        if (totalAmt > STATE.collateral) {
            showToast(`Error: Insufficient Collateral (Req: ${totalAmt.toLocaleString()})`, "error");
            return;
        }

        // DEDUCT COLLATERAL
        STATE.collateral -= totalAmt;
        localStorage.setItem('userCollateral', STATE.collateral);

        // Force immediate UI update
        const colEl = document.getElementById('userCollateral');
        if (colEl) {
            colEl.innerText = "NPR " + STATE.collateral.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        }
    }

    // Success
    showToast(`${side.toUpperCase()} Order Placed: ${qty} @ ${price}`, "success");
    addRecentOrder(side, qty, price);

    // Reset specific form
    document.getElementById(`${side}Qty`).value = "";
    document.getElementById(`${side}Total`).innerText = "0.00";
}

function addRecentOrder(side, qty, price) {
    const now = new Date().toLocaleTimeString();
    const color = side === 'buy' ? 'var(--color-success)' : 'var(--color-danger)';
    const total = (qty * price).toFixed(2);

    const tbody = document.getElementById('recentOrdersBody');
    if (tbody.innerText.includes("No orders")) domUtils.clearNode(tbody);

    const row = domUtils.createElement('tr', {
        attributes: { 'data-side': side, 'data-total': total },
        styles: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
        children: [
            domUtils.createElement('td', { styles: { padding: '10px' }, textContent: now }),
            domUtils.createElement('td', { styles: { padding: '10px' }, textContent: STATE.symbol }),
            domUtils.createElement('td', { styles: { padding: '10px', color: color, fontWeight: 'bold' }, textContent: side.toUpperCase() }),
            domUtils.createElement('td', { styles: { padding: '10px' }, textContent: qty.toString() }),
            domUtils.createElement('td', { styles: { padding: '10px' }, textContent: price.toString() }),
            domUtils.createElement('td', { styles: { padding: '10px' }, textContent: total }),
            domUtils.createElement('td', { styles: { padding: '10px', color: '#fbbf24' }, textContent: 'OPEN' }),
            domUtils.createElement('td', {
                styles: { padding: '10px' },
                children: [
                    domUtils.createElement('button', {
                        className: 'action-btn edit',
                        attributes: { onclick: "showToast('Edit feature coming soon', 'success')" },
                        children: [domUtils.createElement('i', { className: 'fas fa-edit' })]
                    }),
                    domUtils.createElement('button', {
                        className: 'action-btn cancel',
                        attributes: { onclick: 'cancelOrder(this)' },
                        children: [domUtils.createElement('i', { className: 'fas fa-times' })]
                    })
                ]
            })
        ]
    });

    tbody.insertBefore(row, tbody.firstChild);
}

window.cancelOrder = function (btn) {
    const row = btn.closest('tr');
    const side = row.getAttribute('data-side');
    const total = parseFloat(row.getAttribute('data-total'));

    // Refund if BUY order
    if (side === 'buy') {
        STATE.collateral += total;
        localStorage.setItem('userCollateral', STATE.collateral);

        // Update UI
        const colEl = document.getElementById('userCollateral');
        if (colEl) {
            colEl.innerText = "NPR " + STATE.collateral.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        }
        showToast(`Order Cancelled. Refunded NPR ${total.toFixed(2)}`, "success");
    } else {
        showToast('Order Cancelled', 'error');
    }

    row.remove();
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = `toast-notification toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
