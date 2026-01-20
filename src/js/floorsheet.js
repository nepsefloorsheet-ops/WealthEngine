/**
 * Floorsheet Page JavaScript
 * Fetches and displays live floorsheet data from the API
 */

const API_URL = 'https://turnover-19sr.onrender.com/floorsheet';

// State management
let currentPage = 0;
let pageSize = 500;
let allData = [];
let filteredData = [];

// DOM Elements
const elements = {
    tbody: null,
    loading: null,
    searchInput: null,
    pageSizeSelect: null,
    refreshBtn: null,
    prevBtn: null,
    nextBtn: null,
    currentPageSpan: null,
    showingCount: null,
    totalCount: null,
    totalTrades: null,
    totalAmount: null,
    totalQty: null
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    fetchFloorsheetData();
    
    // Set current year in footer
    document.getElementById('we-year').textContent = new Date().getFullYear();
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
    elements.tbody = document.getElementById('floorsheet-body');
    elements.loading = document.getElementById('loading');
    elements.searchInput = document.getElementById('search-symbol');
    elements.pageSizeSelect = document.getElementById('page-size');
    elements.refreshBtn = document.getElementById('refresh-btn');
    elements.prevBtn = document.getElementById('prev-page');
    elements.nextBtn = document.getElementById('next-page');
    elements.currentPageSpan = document.getElementById('current-page');
    elements.showingCount = document.getElementById('showing-count');
    elements.totalCount = document.getElementById('total-count');
    elements.totalTrades = document.getElementById('total-trades');
    elements.totalAmount = document.getElementById('total-amount');
    elements.totalQty = document.getElementById('total-qty');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toUpperCase();
        filterData(searchTerm);
    });
    
    // Page size change
    elements.pageSizeSelect.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 0;
        fetchFloorsheetData();
    });
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        fetchFloorsheetData();
    });
    
    // Pagination buttons
    elements.prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            fetchFloorsheetData();
        }
    });
    
    elements.nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchFloorsheetData();
    });
}

/**
 * Fetch floorsheet data from API
 */
async function fetchFloorsheetData() {
    showLoading(true);
    
    try {
        const url = `${API_URL}?page=${currentPage}&size=${pageSize}&order=desc`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Handle different response formats
        if (result.success && result.data) {
            // Custom format from our API
            allData = result.data;
        } else if (result.data && result.data.content) {
            // Nepselytics format
            allData = result.data.content;
            updateHeaderStats(result.data);
        } else {
            allData = [];
        }
        
        filteredData = [...allData];
        renderTable();
        updatePagination();
        
    } catch (error) {
        console.error('Error fetching floorsheet data:', error);
        showError('Failed to load floorsheet data. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Update header statistics
 */
function updateHeaderStats(data) {
    if (data.totalTrades) {
        elements.totalTrades.textContent = data.totalTrades.toLocaleString('en-IN');
    }
    if (data.totalAmount) {
        elements.totalAmount.textContent = '₹' + (data.totalAmount / 10000000).toFixed(2) + ' Cr';
    }
    if (data.totalQty) {
        elements.totalQty.textContent = (data.totalQty / 100000).toFixed(2) + ' L';
    }
}

/**
 * Filter data based on search term
 */
function filterData(searchTerm) {
    if (!searchTerm) {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(item => 
            item.symbol && item.symbol.toUpperCase().includes(searchTerm)
        );
    }
    renderTable();
    updatePagination();
}

/**
 * Render table with data
 */
function renderTable() {
    if (!elements.tbody) return;
    
    elements.tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        elements.tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    No floorsheet data available
                </td>
            </tr>
        `;
        return;
    }
    
    filteredData.forEach((item, index) => {
        const row = createTableRow(item, index + 1);
        elements.tbody.appendChild(row);
    });
}

/**
 * Create a table row element
 */
function createTableRow(item, serialNo) {
    const row = document.createElement('tr');
    
    // Format numbers without rupee symbol
    const qty = item.contractQuantity ? item.contractQuantity.toLocaleString('en-IN') : '-';
    const rate = item.contractRate ? item.contractRate.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-';
    const amount = item.contractAmount ? item.contractAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-';
    
    row.innerHTML = `
        <td>${serialNo}</td>
        <td class="symbol-cell">${item.symbol || '-'}</td>
        <td class="broker-cell" title="${item.buyerBrokerName || '-'}">${item.buyerMemberId || '-'}</td>
        <td class="broker-cell" title="${item.sellerBrokerName || '-'}">${item.sellerMemberId || '-'}</td>
        <td class="text-right">${qty}</td>
        <td class="text-right">${rate}</td>
        <td class="text-right amount-cell">${amount}</td>
    `;
    
    return row;
}

/**
 * Format ISO timestamp to readable time
 */
function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
    } catch (error) {
        return '-';
    }
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const showing = filteredData.length;
    const total = filteredData.length;
    
    elements.showingCount.textContent = showing.toLocaleString('en-IN');
    elements.totalCount.textContent = total.toLocaleString('en-IN');
    elements.currentPageSpan.textContent = currentPage + 1;
    
    // Update button states
    elements.prevBtn.disabled = currentPage === 0;
    elements.nextBtn.disabled = filteredData.length < pageSize;
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    if (elements.loading) {
        elements.loading.classList.toggle('active', show);
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (elements.tbody) {
        elements.tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--color-danger);">
                    ⚠️ ${message}
                </td>
            </tr>
        `;
    }
}

// Auto-refresh every 30 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        fetchFloorsheetData();
    }
}, 60000);
