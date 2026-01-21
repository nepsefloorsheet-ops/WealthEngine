let nepseTimer = null;
const REFRESH_INTERVAL = 10000; // 10 seconds
let allData = []; // Store all data for filtering
let activeCountFilter = null; // Track active count filter: 'positive', 'negative', 'unchanged', or null
let activeSectorFilter = null; // Track active sector filter

async function loadNepse() {
    // Show refresh indicator
    showRefreshIndicator();

    try {
        // Cache Logic: Check if we have valid data in sessionStorage
        const cachedData = sessionStorage.getItem('nepse_cache_data');
        const cachedTime = sessionStorage.getItem('nepse_cache_time');
        const now = Date.now();

        if (cachedData && cachedTime && (now - cachedTime < REFRESH_INTERVAL)) {
            const data = JSON.parse(cachedData);
            allData = data;
            
            const latestUpdateTime = data.length > 0 ? data[0].lastUpdatedDateTime : null;
            updateLastUpdated(latestUpdateTime);

            document.dispatchEvent(
                new CustomEvent("nepse:data", { detail: data })
            );

            applyFilters();
            hideRefreshIndicator();
            scheduleNext();
            return;
        }

        // Shimmer logic: Only show if we have no data
        const tbody = document.getElementById("nepse-body");
        if (tbody && !allData.length) {
            let skeletons = "";
            for (let i = 0; i < 20; i++) {
                skeletons += `
                    <tr>
                        <td class="middle"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="right"><div class="skeleton sk-cell"></div></td>
                        <td class="middle"><div class="skeleton sk-cell"></div></td>
                    </tr>
                `;
            }
            if (tbody) tbody.innerHTML = skeletons;
        }

        // user requested to switch to this faster API
        const res = await fetch("https://nepseapi-ouhd.onrender.com/api/live-nepse");
        const json = await res.json();

        // Handle new API structure: data is in `data` (direct array or wrapper)
        // Based on analysis: json.data is the array
        const data = Array.isArray(json.data) ? json.data : (json.liveData || []);

        // Sort by latest update time (newest first)
        data.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        // Update Cache
        sessionStorage.setItem('nepse_cache_data', JSON.stringify(data));
        sessionStorage.setItem('nepse_cache_time', Date.now());

        // Store all data for filtering
        allData = data;

        if (!data.length) {
            const tbody = document.getElementById("nepse-body");
            if (tbody) tbody.innerHTML = "<tr><td colspan='11'>No data available</td></tr>";
            updateLastUpdated(null);
            scheduleNext();
            return;
        }

        // Update last updated timestamp from the most recent data
        const latestUpdateTime = data.length > 0 ? data[0].lastUpdatedDateTime : null;
        updateLastUpdated(latestUpdateTime);

        document.dispatchEvent(
            new CustomEvent("nepse:data", { detail: data })
        );

        // Apply active filters (search and count filter)
        applyFilters();

    } catch (err) {
        console.error("NEPSE ERROR:", err);
        updateLastUpdated(null, true);
    } finally {
        // Hide refresh indicator
        hideRefreshIndicator();
        scheduleNext();
    }
}

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

function displayData(data) {
    const tbody = document.getElementById("nepse-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!data.length) {
        tbody.innerHTML = "<tr><td colspan='11'>No data available</td></tr>";
        // Still update counts from allData
        updateCounts();
        return;
    }

    const formatNumber = value =>
        Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    data.forEach(item => {
        const row = document.createElement("tr");
        const percentageChange = parseFloat(item.percentageChange) || 0;

        if (percentageChange > 0) {
            row.classList.add("positive");
        } else if (percentageChange < 0) {
            row.classList.add("negative");
        } else {
            row.classList.add("unchanged");
        }

        // Add significant change class for large moves (>8% or <-8%)
        if (Math.abs(percentageChange) >= 8) {
            row.classList.add("significant-change");
        }

        // Check if symbol is in watchlist
        const isWatched = window.watchlistUtils && window.watchlistUtils.isInWatchlist(item.symbol);
        const watchBtnClass = isWatched ? 'watch-btn active' : 'watch-btn';
        const watchBtnIcon = isWatched ? '⭐' : '☆';
        const watchBtnTitle = isWatched ? 'Remove from watchlist' : 'Add to watchlist';

        row.innerHTML = `
                <td class="middle"><strong>${item.symbol}</strong></td>
                <td class="right">${formatNumber(item.lastTradedPrice)}</td>
                <td class="right">-</td> <!-- LTV Not available in new API -->
                <td class="right">${formatNumber(item.change)}</td>
                <td class="right">${item.percentageChange}%</td>
                <td class="right">${formatNumber(item.openPrice)}</td>
                <td class="right">${formatNumber(item.highPrice)}</td>
                <td class="right">${formatNumber(item.lowPrice)}</td>
                <td class="right">${formatNumber(item.lastTradedPrice - item.change)}</td>
                <td class="right">${(item.totalTradeQuantity)}</td>
                <td class="right">${formatNumber(item.totalTradeValue)}</td>
                <td class="middle">
                    <button class="${watchBtnClass}" data-symbol="${item.symbol}" title="${watchBtnTitle}">${watchBtnIcon}</button>
                </td>
            `;

        tbody.appendChild(row);
    });

    // Add event listeners to watchlist buttons
    document.querySelectorAll('.watch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const symbol = e.target.getAttribute('data-symbol');
            if (window.watchlistUtils) {
                const isWatched = window.watchlistUtils.isInWatchlist(symbol);
                if (isWatched) {
                    window.watchlistUtils.removeFromWatchlist(symbol);
                    e.target.textContent = '☆';
                    e.target.classList.remove('active');
                    e.target.title = 'Add to watchlist';
                } else {
                    window.watchlistUtils.addToWatchlist(symbol);
                    e.target.textContent = '⭐';
                    e.target.classList.add('active');
                    e.target.title = 'Remove from watchlist';
                }
            }
        });
    });

    // Always update counts from allData (not filtered data)
    updateCounts();
}

// Update count displays from allData
function updateCounts() {
    let positive = 0;
    let negative = 0;
    let unchanged = 0;

    allData.forEach(item => {
        if (item.percentageChange > 0) {
            positive++;
        } else if (item.percentageChange < 0) {
            negative++;
        } else {
            unchanged++;
        }
    });

    const posEl = document.getElementById("positiveCount");
    const negEl = document.getElementById("negativeCount");
    const uncEl = document.getElementById("unchangedCount");

    if (posEl) posEl.textContent = positive;
    if (negEl) negEl.textContent = negative;
    if (uncEl) uncEl.textContent = unchanged;
}

function scheduleNext() {
    clearTimeout(nepseTimer);

    // Refresh ONLY when tab is active
    if (!document.hidden) {
        nepseTimer = setTimeout(loadNepse, REFRESH_INTERVAL);
    }
}

// Resume when tab becomes active again
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadNepse();
    }
});

// Initial load
loadNepse();



function updateMarketColor() {
    const marketPill = document.getElementById('market-pill');
    const liveMarket = document.getElementById('live-market');
    if (!marketPill || !liveMarket) return;

    const pillText = marketPill.innerText.toLowerCase();

    // Reset color
    liveMarket.style.color = '';

    // Change color based on market-pill text
    switch (pillText) {
        case 'market open':
            liveMarket.style.color = 'green';
            break;
        case 'market closed':
            liveMarket.style.color = 'red';
            break;
        case 'holiday':
            liveMarket.style.color = 'red';
            break;
        case 'pre-open':
            liveMarket.style.color = 'green';
            break;
        default:
            liveMarket.style.color = 'black';
    }
}

// Make #live-market blink continuously
function startBlinking() {
    const liveMarket = document.getElementById('live-market');
    if (!liveMarket) return;
    
    if (window.marketBlinkInterval) clearInterval(window.marketBlinkInterval);
    
    window.marketBlinkInterval = setInterval(() => {
        liveMarket.style.visibility = (liveMarket.style.visibility === 'hidden') ? 'visible' : 'hidden';
    }, 500); // Blink every 500ms
}

// Initialize UI dependent functions after layout injection
function initUI() {
    updateMarketColor();
    startBlinking();

    // Optional: If #market-pill text changes dynamically, update color automatically
    const marketPill = document.getElementById('market-pill');
    if (marketPill) {
        const marketPillObserver = new MutationObserver(updateMarketColor);
        marketPillObserver.observe(marketPill, { childList: true, characterData: true, subtree: true });
    }
}

// Check if layout is already injected
if (document.querySelector('#market-pill')) {
    initUI();
} else {
    document.addEventListener('layout-injected', initUI);
}

// Apply all active filters (search + count filter + sector filter)
function applyFilters() {
    let filteredData = [...allData];

    // Apply sector filter (read from dropdown to keep in sync)
    const sectorDropdown = document.getElementById('sectorFilter');
    const selectedSector = sectorDropdown ? sectorDropdown.value : null;

    if (selectedSector) {
        filteredData = filteredData.filter(item => {
            if (!item.sector) return false;
            // Normalize sector names for comparison (case-insensitive, trim whitespace)
            const itemSector = item.sector.trim().toUpperCase();
            const filterSector = selectedSector.trim().toUpperCase();
            return itemSector === filterSector;
        });
    }

    // Apply search filter
    const searchInput = document.getElementById('symbolSearch');
    const searchTerm = searchInput ? searchInput.value.trim().toUpperCase() : '';

    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.symbol && item.symbol.toUpperCase().includes(searchTerm)
        );
    }

    // Apply count filter (positive/negative/unchanged)
    if (activeCountFilter) {
        filteredData = filteredData.filter(item => {
            if (activeCountFilter === 'positive') {
                return item.percentageChange > 0;
            } else if (activeCountFilter === 'negative') {
                return item.percentageChange < 0;
            } else if (activeCountFilter === 'unchanged') {
                return item.percentageChange === 0 || item.percentageChange === null;
            }
            return true;
        });
    }

    displayData(filteredData);
}

// Search functionality
function filterData() {
    applyFilters();
}

// Count filter functionality
function handleCountFilter(filterType) {
    // Toggle: if clicking the same filter, clear it
    if (activeCountFilter === filterType) {
        activeCountFilter = null;
    } else {
        activeCountFilter = filterType;
    }

    // Update visual indication
    updateFilterIndicators();

    // Apply filters
    applyFilters();
}

// Update visual indicators for active filter
function updateFilterIndicators() {
    // Remove active class from all filters
    document.querySelectorAll('.clickable-filter').forEach(el => {
        el.classList.remove('active-filter');
    });

    // Add active class to current filter
    if (activeCountFilter) {
        const activeElement = document.getElementById(`filter${activeCountFilter.charAt(0).toUpperCase() + activeCountFilter.slice(1)}`);
        if (activeElement) {
            activeElement.classList.add('active-filter');
        }
    }
}

// Initialize search functionality when DOM is ready
function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const searchInput = document.getElementById('symbolSearch');

    if (searchBtn) {
        searchBtn.addEventListener('click', filterData);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
            }
            activeCountFilter = null;
            activeSectorFilter = null;
            updateFilterIndicators();
            // Reset sector dropdown
            const sectorDropdown = document.getElementById('sectorFilter');
            if (sectorDropdown) {
                sectorDropdown.value = '';
            }
            applyFilters();
        });
    }

    // Add event listener for sector dropdown
    const sectorDropdown = document.getElementById('sectorFilter');
    if (sectorDropdown) {
        sectorDropdown.addEventListener('change', (e) => {
            activeSectorFilter = e.target.value || null;
            applyFilters();
        });
        // Initialize activeSectorFilter from dropdown value if set
        if (sectorDropdown.value) {
            activeSectorFilter = sectorDropdown.value;
        }
    }

    // Add click handlers for count filters
    const positiveFilter = document.getElementById('filterPositive');
    const negativeFilter = document.getElementById('filterNegative');
    const unchangedFilter = document.getElementById('filterUnchanged');

    if (positiveFilter) {
        positiveFilter.addEventListener('click', () => handleCountFilter('positive'));
    }
    if (negativeFilter) {
        negativeFilter.addEventListener('click', () => handleCountFilter('negative'));
    }
    if (unchangedFilter) {
        unchangedFilter.addEventListener('click', () => handleCountFilter('unchanged'));
    }

    // Allow Enter key to trigger search
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filterData();
            }
        });
    }
}

// Initialize search when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    // DOM is already loaded
    initSearch();
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

    // Update after data loads
    document.addEventListener('nepse:data', () => {
        setTimeout(updateScrollIndicators, 100);
    });
}

// Initialize scroll indicators when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollIndicators);
} else {
    initScrollIndicators();
}

// Load watchlist utilities
function loadWatchlistUtils() {
    // Simple watchlist functions if watchlist.js is not loaded
    if (!window.watchlistUtils) {
        window.watchlistUtils = {
            loadWatchlist: function () {
                const saved = localStorage.getItem('watchlist');
                return saved ? JSON.parse(saved) : [];
            },
            addToWatchlist: function (symbol) {
                let watchlist = this.loadWatchlist();
                if (!watchlist.includes(symbol)) {
                    watchlist.push(symbol);
                    localStorage.setItem('watchlist', JSON.stringify(watchlist));
                }
            },
            removeFromWatchlist: function (symbol) {
                let watchlist = this.loadWatchlist();
                const index = watchlist.indexOf(symbol);
                if (index > -1) {
                    watchlist.splice(index, 1);
                    localStorage.setItem('watchlist', JSON.stringify(watchlist));
                }
            },
            isInWatchlist: function (symbol) {
                return this.loadWatchlist().includes(symbol);
            }
        };
    }
}

// Initialize watchlist utilities
loadWatchlistUtils();