let watchlistTimer = null;
const WATCHLIST_REFRESH_INTERVAL = 10000; // 10 seconds
let watchlistSymbols = []; // Array of symbols in watchlist
let watchlistAllData = []; // Store all fetched data for watchlist
let previousPrices = {}; // Store previous prices for comparison {symbol: {price, percentageChange}}

// Load watchlist from localStorage
function loadWatchlist() {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
        try {
            watchlistSymbols = JSON.parse(saved);
        } catch (err) {
            console.error("Error loading watchlist:", err);
            watchlistSymbols = [];
        }
    }
    return watchlistSymbols;
}

// Load watchlist order from localStorage
function loadWatchlistOrder() {
    // First, ensure we have the latest watchlist from localStorage
    const latestWatchlist = loadWatchlist();
    
    const saved = localStorage.getItem('watchlistOrder');
    if (saved) {
        try {
            const order = JSON.parse(saved);
            // Reorder watchlistSymbols based on saved order
            if (Array.isArray(order) && order.length > 0) {
                const ordered = [];
                const unordered = [...latestWatchlist]; // Use latest watchlist, not the module variable
                
                // Add symbols in saved order (only if they exist in current watchlist)
                order.forEach(symbol => {
                    if (unordered.includes(symbol)) {
                        ordered.push(symbol);
                        unordered.splice(unordered.indexOf(symbol), 1);
                    }
                });
                
                // Add any new symbols that weren't in the saved order
                ordered.push(...unordered);
                watchlistSymbols = ordered;
            } else {
                // If no saved order, use the latest watchlist as-is
                watchlistSymbols = latestWatchlist;
            }
        } catch (err) {
            console.error("Error loading watchlist order:", err);
            // On error, use the latest watchlist
            watchlistSymbols = latestWatchlist;
        }
    } else {
        // No saved order, use the latest watchlist
        watchlistSymbols = latestWatchlist;
    }
}

// Save watchlist to localStorage
function saveWatchlist() {
    localStorage.setItem('watchlist', JSON.stringify(watchlistSymbols));
    // Also save the order
    localStorage.setItem('watchlistOrder', JSON.stringify(watchlistSymbols));
}

// Add symbol to watchlist
function addToWatchlist(symbol) {
    // Reload watchlist from localStorage first to ensure we have latest
    const currentWatchlist = loadWatchlist();
    watchlistSymbols = currentWatchlist;
    
    if (!watchlistSymbols.includes(symbol)) {
        watchlistSymbols.push(symbol);
        saveWatchlist();
        return true;
    }
    return false;
}

// Remove symbol from watchlist
function removeFromWatchlist(symbol) {
    // Reload watchlist from localStorage first to ensure we have latest
    const currentWatchlist = loadWatchlist();
    watchlistSymbols = currentWatchlist;
    
    const index = watchlistSymbols.indexOf(symbol);
    if (index > -1) {
        watchlistSymbols.splice(index, 1);
        saveWatchlist();
        return true;
    }
    return false;
}

// Check if symbol is in watchlist
function isInWatchlist(symbol) {
    return watchlistSymbols.includes(symbol);
}

async function loadWatchlistData() {
    // Only run on watchlist page
    if (!isWatchlistPage()) {
        return;
    }

    // Always reload watchlist from localStorage to get latest
    loadWatchlist();
    loadWatchlistOrder();

    if (watchlistSymbols.length === 0) {
        showEmptyWatchlist();
        updateWatchlistStats([]);
        return;
    }

    // Show refresh indicator
    showRefreshIndicator();

    try {
        const json = await apiClient.get("https://nepseapi-production-9edf.up.railway.app/live-nepse");

        // Handle array & object responses
        const data = Array.isArray(json)
            ? json
            : json.data || json.liveNepse || [];

        // Store all data
        watchlistAllData = data;

        // Filter data to only show watchlist symbols
        const watchlistData = data.filter(item =>
            item.symbol && watchlistSymbols.includes(item.symbol)
        );

        // Sort by symbol order in watchlist
        watchlistData.sort((a, b) => {
            const indexA = watchlistSymbols.indexOf(a.symbol);
            const indexB = watchlistSymbols.indexOf(b.symbol);
            return indexA - indexB;
        });

        // Update last updated timestamp
        const latestUpdateTime = data.length > 0 ? data[0].lastUpdatedDateTime : null;
        updateLastUpdated(latestUpdateTime);

        // Display watchlist data (with price change indicators)
        displayWatchlistData(watchlistData);

        // Update previous prices after displaying
        updatePreviousPrices(watchlistData);

        // Update statistics
        updateWatchlistStats(watchlistData);

        // Show table if we have data
        if (watchlistData.length > 0) {
            hideEmptyWatchlist();
        } else {
            showEmptyWatchlist();
            updateWatchlistStats([]);
        }

    } catch (err) {
        console.error("WATCHLIST ERROR:", err);
        updateLastUpdated(null, true);
    } finally {
        hideRefreshIndicator();
        scheduleNext();
    }
}

function displayWatchlistData(data) {
    const tbody = document.getElementById("watchlist-body");
    if (!tbody) {
        console.error("watchlist-body element not found");
        return;
    }
    
    domUtils.clearNode(tbody);

    if (!data.length) {
        showEmptyWatchlist();
        return;
    }

    const formatNumber = value =>
        Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const fragment = document.createDocumentFragment();

    data.forEach(item => {
        const percentageChange = parseFloat(item.percentageChange) || 0;
        const currentPrice = parseFloat(item.lastTradedPrice) || 0;
        
        const prevData = previousPrices[item.symbol];
        const priceDiff = prevData ? Math.abs(currentPrice - prevData.price) : 0;
        const priceChangePercent = prevData && prevData.price > 0 ? (priceDiff / prevData.price) * 100 : 0;
        const priceChanged = prevData && (priceDiff > 0.01 || priceChangePercent > 0.01);
        const significantChange = prevData && Math.abs(percentageChange - prevData.percentageChange) >= 1;
        
        const rowClasses = ['draggable-row'];
        let priceIndicator = null;

        if (priceChanged && prevData) {
            if (currentPrice > prevData.price) {
                priceIndicator = domUtils.createElement('span', { className: 'price-up', textContent: '↑' });
                rowClasses.push('price-increased');
            } else if (currentPrice < prevData.price) {
                priceIndicator = domUtils.createElement('span', { className: 'price-down', textContent: '↓' });
                rowClasses.push('price-decreased');
            }
        }

        if (percentageChange > 0) {
            rowClasses.push("positive");
        } else if (percentageChange < 0) {
            rowClasses.push("negative");
        } else {
            rowClasses.push("unchanged");
        }

        if (Math.abs(percentageChange) >= 8) {
            rowClasses.push("significant-change");
        }

        if (priceChanged) {
            rowClasses.push('price-updated');
            if (significantChange) {
                rowClasses.push('significant-price-change');
            }
        }

        const row = domUtils.createElement('tr', {
            className: rowClasses,
            attributes: { draggable: 'true', 'data-symbol': item.symbol },
            children: [
                domUtils.createElement('td', { className: 'drag-handle', attributes: { title: 'Drag to reorder' }, textContent: '☰' }),
                domUtils.createElement('td', { 
                    className: 'middle', 
                    children: [
                        domUtils.createElement('strong', { textContent: item.symbol }),
                        document.createTextNode(' '),
                        priceIndicator || document.createTextNode('')
                    ] 
                }),
                domUtils.createElement('td', { className: ['right', 'price-cell'], textContent: formatNumber(item.lastTradedPrice) }),
                domUtils.createElement('td', { className: 'right', textContent: String(item.lastTradedVolume) }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.change) }),
                domUtils.createElement('td', { className: 'right', textContent: `${item.percentageChange}%` }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.openPrice) }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.highPrice) }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.lowPrice) }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.previousClose) }),
                domUtils.createElement('td', { className: 'right', textContent: String(item.totalTradeQuantity) }),
                domUtils.createElement('td', { className: 'right', textContent: formatNumber(item.totalTradeValue) }),
                domUtils.createElement('td', { 
                    className: 'middle', 
                    children: [
                        domUtils.createElement('button', {
                            className: 'remove-btn',
                            attributes: { 'data-symbol': item.symbol, title: 'Remove from watchlist' },
                            textContent: '✕'
                        })
                    ]
                })
            ]
        });

        fragment.appendChild(row);
        
        if (priceChanged) {
            setTimeout(() => {
                row.classList.add('flash-animation');
                setTimeout(() => {
                    row.classList.remove('flash-animation');
                }, 1000);
            }, 100);
        }
    });

    tbody.appendChild(fragment);

    tbody.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const symbol = e.target.getAttribute('data-symbol');
            if (confirm(`Remove ${symbol} from watchlist?`)) {
                removeFromWatchlist(symbol);
                loadWatchlistData();
            }
        });
    });

    initDragAndDrop();
}

// Update previous prices for comparison
function updatePreviousPrices(data) {
    data.forEach(item => {
        previousPrices[item.symbol] = {
            price: parseFloat(item.lastTradedPrice) || 0,
            percentageChange: parseFloat(item.percentageChange) || 0,
            timestamp: Date.now()
        };
    });
}

// Clear previous prices (useful for reset)
function clearPreviousPrices() {
    previousPrices = {};
}

// Update watchlist statistics
function updateWatchlistStats(data) {
    const totalStocks = document.getElementById('totalStocks');
    const totalGainers = document.getElementById('totalGainers');
    const totalLosers = document.getElementById('totalLosers');
    const totalUnchanged = document.getElementById('totalUnchanged');

    if (!totalStocks || !totalGainers || !totalLosers || !totalUnchanged) return;

    let gainers = 0;
    let losers = 0;
    let unchanged = 0;

    data.forEach(item => {
        const percentageChange = parseFloat(item.percentageChange) || 0;
        if (percentageChange > 0) {
            gainers++;
        } else if (percentageChange < 0) {
            losers++;
        } else {
            unchanged++;
        }
    });

    totalStocks.textContent = data.length;
    totalGainers.textContent = gainers;
    totalLosers.textContent = losers;
    totalUnchanged.textContent = unchanged;
}

// Initialize drag and drop functionality
function initDragAndDrop() {
    const tbody = document.getElementById("watchlist-body");
    if (!tbody) return;

    let draggedElement = null;

    // Add drag event listeners to all rows
    tbody.querySelectorAll('.draggable-row').forEach((row) => {
        row.addEventListener('dragstart', (e) => {
            draggedElement = row;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.dataset.symbol);
        });

        row.addEventListener('dragend', (e) => {
            row.classList.remove('dragging');
            // Remove drag-over class from all rows
            tbody.querySelectorAll('.draggable-row').forEach(r => {
                r.classList.remove('drag-over');
            });
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement && row !== draggedElement) {
                const afterElement = getDragAfterElement(tbody, e.clientY);
                
                if (afterElement == null) {
                    tbody.appendChild(draggedElement);
                } else {
                    tbody.insertBefore(draggedElement, afterElement);
                }
            }
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement) {
                // Get new order from DOM
                const rows = Array.from(tbody.querySelectorAll('.draggable-row'));
                const newOrder = rows.map(r => r.dataset.symbol).filter(s => s);
                
                // Update watchlist order
                watchlistSymbols = newOrder;
                saveWatchlist();
            }
        });

        row.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (row !== draggedElement) {
                row.classList.add('drag-over');
            }
        });

        row.addEventListener('dragleave', (e) => {
            row.classList.remove('drag-over');
        });
    });
}

// Helper function to determine where to insert dragged element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-row:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function showEmptyWatchlist() {
    const emptyDiv = document.getElementById('emptyWatchlist');
    const tableContainer = document.getElementById('tableContainer');
    if (emptyDiv) {
        emptyDiv.style.display = 'block';
    }
    if (tableContainer) {
        tableContainer.style.display = 'none';
    }
}

function hideEmptyWatchlist() {
    const emptyDiv = document.getElementById('emptyWatchlist');
    const tableContainer = document.getElementById('tableContainer');
    if (emptyDiv) {
        emptyDiv.style.display = 'none';
    }
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
}

function scheduleNext() {
    clearTimeout(watchlistTimer);

    // Refresh ONLY when tab is active
    if (!document.hidden) {
        watchlistTimer = setTimeout(loadWatchlistData, WATCHLIST_REFRESH_INTERVAL);
    }
}

// Resume when tab becomes active again
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadWatchlistData();
    }
});

// Format timestamp to readable format (e.g., "2:59 PM")
function formatTimestamp(dateTimeString) {
    if (!dateTimeString) return null;

    try {
        const date = new Date(dateTimeString);

        // Check if date is valid
        if (isNaN(date.getTime())) return null;

        // Format: "2:59 PM" or "14:59" (12-hour format preferred)
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12; // Convert to 12-hour format
        const displayMinutes = minutes.toString().padStart(2, '0');

        // Also include date if it's not today
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return `${displayHours}:${displayMinutes} ${ampm}`;
        } else {
            // Include date: "Jan 18, 2:59 PM"
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const day = date.getDate();
            return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`;
        }
    } catch (err) {
        console.error("Error formatting timestamp:", err);
        return null;
    }
}

// Update last updated timestamp display
function updateLastUpdated(dateTimeString, isError = false) {
    const lastUpdatedText = document.getElementById('lastUpdatedText');
    if (!lastUpdatedText) return;

    if (isError) {
        lastUpdatedText.textContent = 'As of: Error loading data';
        return;
    }

    const formattedTime = formatTimestamp(dateTimeString);
    if (formattedTime) {
        lastUpdatedText.textContent = `Last updated: ${formattedTime}`;
    } else {
        lastUpdatedText.textContent = 'As of: --';
    }
}

// Show refresh indicator
function showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.style.display = 'inline-block';
    }
}

// Hide refresh indicator
function hideRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Check if we're on watchlist page
function isWatchlistPage() {
    return document.getElementById('watchlist-body') !== null;
}

// Horizontal scroll indicator functionality
function initScrollIndicators() {
    const tableContainer = document.getElementById('tableContainer');
    const scrollLeftIndicator = document.getElementById('scrollLeftIndicator');
    const scrollRightIndicator = document.getElementById('scrollRightIndicator');

    if (!tableContainer || !scrollLeftIndicator || !scrollRightIndicator) return;

    function updateScrollIndicators() {
        const { scrollLeft, scrollWidth, clientWidth } = tableContainer;
        const isScrollable = scrollWidth > clientWidth;
        const isAtStart = scrollLeft <= 5;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 5;

        // Show/hide left indicator
        if (isScrollable && !isAtStart) {
            scrollLeftIndicator.classList.add('visible');
        } else {
            scrollLeftIndicator.classList.remove('visible');
        }

        // Show/hide right indicator
        if (isScrollable && !isAtEnd) {
            scrollRightIndicator.classList.add('visible');
        } else {
            scrollRightIndicator.classList.remove('visible');
        }
    }

    // Update on scroll
    tableContainer.addEventListener('scroll', updateScrollIndicators);

    // Update on resize
    window.addEventListener('resize', updateScrollIndicators);

    // Initial update
    setTimeout(updateScrollIndicators, 100);
}

// Initialize when DOM is ready
function initWatchlist() {
    // Only initialize if we're on the watchlist page
    if (!isWatchlistPage()) {
        return;
    }
    
    // Load watchlist first, then apply order
    loadWatchlist();
    loadWatchlistOrder(); // Load custom order (this will also reload from localStorage)
    loadWatchlistData();
    initScrollIndicators();
    
    // Listen for storage events to update when watchlist changes from another tab/page
    window.addEventListener('storage', (e) => {
        if (e.key === 'watchlist') {
            loadWatchlist();
            loadWatchlistOrder();
            loadWatchlistData();
        }
    });
}

// Initialize when DOM is ready (only on watchlist page)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWatchlist);
} else {
    // DOM is already loaded
    initWatchlist();
}

// Export functions for use in market page
if (typeof window !== 'undefined') {
    window.watchlistUtils = {
        loadWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        saveWatchlist
    };
}
