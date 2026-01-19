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
    isMarket: false
};

// --- CONSTANTS ---
const LOT_SIZE = 10;
const PRICE_BAND_PERCENT = 0.02; // +/- 2%
const COMMISSION_RATE = 0.004;
const DP_CHARGE = 25;

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
    recentOrders: document.getElementById('recentOrdersBody')
});

// --- INITIALIZATION ---
function init() {
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

    dom.ltp.innerText = STATE.ltp.toFixed(1);
    dom.change.innerText = `${change > 0 ? '+' : ''}${change.toFixed(1)} (${pChange}%)`;
    dom.change.style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    dom.highLow.innerText = `${STATE.high} / ${STATE.low}`;

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

    document.getElementById('buyPriceRange').innerText = rangeText;
    document.getElementById('sellPriceRange').innerText = rangeText;
}

// --- MARKET DEPTH ---
function generateMarketDepth() {
    let bids = "";
    let asks = "";

    for (let i = 1; i <= 5; i++) {
        const bidPrice = (STATE.ltp - (i * 0.5) - Math.random()).toFixed(1);
        const askPrice = (STATE.ltp + (i * 0.5) + Math.random()).toFixed(1);

        const bidVol = Math.floor(Math.random() * 500) + 10;
        const askVol = Math.floor(Math.random() * 500) + 10;

        // Random Orders Count (for new columns)
        const bidOrders = Math.floor(Math.random() * 20) + 1;
        const askOrders = Math.floor(Math.random() * 20) + 1;

        bids += `<tr onclick="fillPrice(${bidPrice})">
                    <td class="depth-buy" style="color: var(--text-muted)">${bidOrders}</td> 
                    <td class="depth-buy">${bidVol}</td>
                    <td class="depth-buy" style="font-weight: bold;">${bidPrice}</td>
                 </tr>`;

        asks += `<tr onclick="fillPrice(${askPrice})">
                    <td class="depth-sell" style="font-weight: bold;">${askPrice}</td>
                    <td class="depth-sell">${askVol}</td>
                    <td class="depth-sell" style="color: var(--text-muted)">${askOrders}</td>
                 </tr>`;
    }

    document.getElementById('bidTable').innerHTML = bids;
    document.getElementById('askTable').innerHTML = asks;
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

window.calculateTotal = function (side) {
    const qtyInput = document.getElementById(`${side}Qty`);
    const priceInput = document.getElementById(`${side}Price`);
    const totalSpan = document.getElementById(`${side}Total`);

    const qty = parseInt(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    if (qty > 0 && price > 0) {
        const amount = qty * price;
        // const comm = amount * COMMISSION_RATE;
        // const total = amount + comm + DP_CHARGE;
        // Requested Change: Total = Qty * Price only (No Comm/DP)
        const total = amount;
        totalSpan.innerText = total.toFixed(2);
    } else {
        totalSpan.innerText = '0.00';
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

    const row = `
        <tr data-side="${side}" data-total="${total}" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 10px;">${now}</td>
            <td style="padding: 10px;">${STATE.symbol}</td>
            <td style="padding: 10px; color: ${color}; font-weight: bold;">${side.toUpperCase()}</td>
            <td style="padding: 10px;">${qty}</td>
            <td style="padding: 10px;">${price}</td>
             <td style="padding: 10px;">${total}</td>
            <td style="padding: 10px; color: #fbbf24;">OPEN</td>
            <td style="padding: 10px;">
                <button class="action-btn edit" onclick="showToast('Edit feature coming soon', 'success')"><i class="fas fa-edit"></i></button>
                <button class="action-btn cancel" onclick="cancelOrder(this)"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `;

    const tbody = document.getElementById('recentOrdersBody');
    if (tbody.innerText.includes("No orders")) tbody.innerHTML = "";
    tbody.innerHTML = row + tbody.innerHTML;
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
