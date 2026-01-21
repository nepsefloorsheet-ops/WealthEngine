/* =========================================================
   CHART LOADER - Google Sheets + Lightweight Charts
========================================================= */

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTTlkVfkIa77xY5_uD4php6FbtZkMVoAXoxw97ZFKfYX0wiztxlRgSiqtTxTIDRSFq2YblS7Hg-BlbK/pub?gid=0&single=true&output=csv';

let chart = null;
let candleSeries = null;
let volumeSeries = null;
let allDataCache = []; // Store parsed CSV data
let currentSymbol = "NEPSE";

// --- DOM ELEMENTS ---
const container = document.getElementById('chartContainer');
const loader = document.getElementById('loader');
const symbolInput = document.getElementById('symbolInput');
const btnLoad = document.getElementById('btnLoadChart');

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    // Pre-fill input with default
    if (symbolInput) symbolInput.value = currentSymbol;
    fetchDataAndRender(currentSymbol);

    // Events
    btnLoad.addEventListener('click', () => {
        const sym = symbolInput.value.toUpperCase().trim();
        if (sym) fetchDataAndRender(sym);
    });

    symbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const sym = symbolInput.value.toUpperCase().trim();
            if (sym) fetchDataAndRender(sym);
        }
    });

    // Resize Observer
    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) { return; }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ height: newRect.height, width: newRect.width });
    }).observe(container);
});

// --- CHART INITIALIZATION ---
function initChart() {
    if (!window.LightweightCharts) {
        console.error("LightweightCharts library not loaded!");
        alert("Error: Chart library failed to load. Please check internet connection.");
        return;
    }

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: '#0d1520' },
            textColor: '#9ca3af',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
    });

    // 1. Candlestick Series
    candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

    // 2. Volume Series (Histogram)
    volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '', // Overlay on same scale? or separate? "overlay" needs configuration
    });

    // Setting volume to separate scale to avoid overlap mess
    chart.priceScale('').applyOptions({
        scaleMargins: {
            top: 0.8, // Highest volume bar uses bottom 20%
            bottom: 0,
        },
    });

    // --- LEGEND LOGIC ---
    const legend = document.getElementById('chartLegend');

    chart.subscribeCrosshairMove(param => {
        // Simple check: if no time, we are not on a candle
        if (!param.time) {
            return;
        }

        const candle = param.seriesData.get(candleSeries);
        const volume = param.seriesData.get(volumeSeries);

        if (candle) {
            updateLegend(param.time, candle, volume);
        }
    });
}

function updateLegend(date, candle, volume) {
    const legend = document.getElementById('chartLegend');
    if (!legend) return;

    const color = candle.close >= candle.open ? '#26a69a' : '#ef5350';
    const volVal = volume && volume.value !== undefined ? volume.value : 0;

    let dateStr = date;
    if (typeof date === 'object') {
        dateStr = `${date.year}-${date.month}-${date.day}`;
    }

    domUtils.clearNode(legend);
    
    const title = domUtils.createElement('div', {
        styles: { fontSize: '16px', fontWeight: 'bold', marginBottom: '5px', color: '#e5e7eb' },
        children: [
            document.createTextNode(currentSymbol + ' '),
            domUtils.createElement('span', {
                styles: { fontSize: '14px', color: '#9ca3af', marginLeft: '8px' },
                textContent: dateStr
            })
        ]
    });

    const stats = domUtils.createElement('div', {
        styles: { display: 'flex', flexWrap: 'wrap', gap: '15px' },
        children: [
            domUtils.createElement('span', { children: [document.createTextNode('O: '), domUtils.createElement('span', { className: 'val', styles: { color: color }, textContent: candle.open.toFixed(2) })] }),
            domUtils.createElement('span', { children: [document.createTextNode('H: '), domUtils.createElement('span', { className: 'val', styles: { color: color }, textContent: candle.high.toFixed(2) })] }),
            domUtils.createElement('span', { children: [document.createTextNode('L: '), domUtils.createElement('span', { className: 'val', styles: { color: color }, textContent: candle.low.toFixed(2) })] }),
            domUtils.createElement('span', { children: [document.createTextNode('C: '), domUtils.createElement('span', { className: 'val', styles: { color: color }, textContent: candle.close.toFixed(2) })] }),
            domUtils.createElement('span', { children: [document.createTextNode('Vol: '), domUtils.createElement('span', { className: 'val', styles: { color: '#d1d5db' }, textContent: volVal.toLocaleString() })] })
        ]
    });

    legend.appendChild(title);
    legend.appendChild(stats);
}

// --- DATA FETCHING ---
async function fetchDataAndRender(symbol) {
    showLoader(true);
    currentSymbol = symbol;

    try {
        // Fetch only if cache empty (or implementing refresh logic later)
        if (allDataCache.length === 0) {
            console.log("Fetching CSV...");
            const res = await fetch(SHEET_URL);
            const text = await res.text();
            parseCSV(text);
        }

        // Filter for Symbol
        const symbolData = allDataCache.filter(d => d.Symbol === symbol);

        if (symbolData.length === 0) {
            alert(`No data found for ${symbol} in the Google Sheet.`);
            showLoader(false);
            return;
        }

        // Sort by Date Ascending
        symbolData.sort((a, b) => a.rawDate - b.rawDate);

        // Map to Chart Format with Validation
        // Lightweight Charts throws "Value is null" if ANY value is undefined/NaN
        const candles = [];
        const volumes = [];

        symbolData.forEach(d => {
            // Strict check
            if (
                d.dateStr &&
                !isNaN(d.Open) &&
                !isNaN(d.High) &&
                !isNaN(d.Low) &&
                !isNaN(d.Close)
            ) {
                candles.push({
                    time: d.dateStr,
                    open: d.Open,
                    high: d.High,
                    low: d.Low,
                    close: d.Close
                });

                // Volume is optional but better if valid
                const vol = isNaN(d.Volume) ? 0 : d.Volume;
                volumes.push({
                    time: d.dateStr,
                    value: vol,
                    color: d.Close >= d.Open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                });
            }
        });

        if (candles.length === 0) {
            alert(`Data for ${symbol} exists but is invalid (NaN/Null).`);
            showLoader(false);
            return;
        }

        // Set Data
        candleSeries.setData(candles);
        volumeSeries.setData(volumes);

        // Default View: Show latest candles (user can scroll back)
        // chart.timeScale().fitContent(); // Removed as per user request

        // Init Legend with last bar
        if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1];
            const lastVol = volumes[volumes.length - 1];
            updateLegend(lastCandle.time, lastCandle, lastVol);
        }

    } catch (err) {
        console.error("Chart Load Error:", err);
        alert("Failed to load chart data. Check console.");
    } finally {
        showLoader(false);
    }
}

// --- CSV PARSING ---
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    // Assume Header: Date,Symbol,Open,High,Low,Close,Volume
    // Skip index 0

    allDataCache = lines.slice(1).map(line => {
        const cols = line.split(',');
        // Handle rows that might be empty or malformed
        if (cols.length < 6) return null;

        // Try to handle "null" string or empty values
        const parseNum = (val) => {
            if (!val) return NaN;
            val = val.trim();
            if (val === 'null') return NaN;
            return parseFloat(val);
        };

        return {
            dateStr: cols[0] ? cols[0].trim() : "",
            rawDate: new Date(cols[0]),
            Symbol: cols[1] ? cols[1].trim().toUpperCase() : "",
            Open: parseNum(cols[2]),
            High: parseNum(cols[3]),
            Low: parseNum(cols[4]),
            Close: parseNum(cols[5]),
            Volume: parseInt(cols[6] || 0)
        };
    }).filter(d => d !== null && d.Symbol !== ""); // Filter out nulls and empty symbols

    console.log(`Parsed ${allDataCache.length} valid rows.`);
}

function showLoader(show) {
    if (show) loader.classList.add('active');
    else loader.classList.remove('active');
}

// Ensure chart is destroyed on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (chart) {
        chart.remove();
        chart = null;
    }
});