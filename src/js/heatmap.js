/**
 * WealthEngine Heatmap Engine
 * Uses ApexCharts to visualize market performance
 */

document.addEventListener('layout-injected', () => {
    HeatmapEngine.init();
});

const HeatmapEngine = (() => {
    const API_URL = "https://turnover-19sr.onrender.com/homepage-data";
    
    let allData = [];
    let sectorChart = null;
    let companyChart = null;

    const COLORS = {
        positive: '#00e396',
        negative: '#ff4560',
        neutral: '#404040',
        veryPositive: '#00b171',
        veryNegative: '#e63757'
    };

    let sectorsList = [];
    let currentSectorFilter = "all";
    let activeTab = "company";

    async function init() {
        try {
            setupEventListeners();
            setupTabs();
            setupResizeListener();
            await fetchData();
            renderSectorHeatmap();
            renderCompanyHeatmap();
        } catch (error) {
            console.error("Heatmap Initialization Error:", error);
            hideLoaders();
        }
    }

    function setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newHeight = calcChartHeight();
                if (sectorChart) sectorChart.updateOptions({ chart: { height: newHeight } });
                if (companyChart) companyChart.updateOptions({ chart: { height: newHeight } });
            }, 250);
        });
    }

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchTab(tab);
            });
        });

        // Set default tab
        switchTab("company");
    }

    function switchTab(tabId) {
        activeTab = tabId;
        
        // Update Buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        // Update Containers
        document.getElementById('sectorTab').classList.toggle('active', tabId === 'sector');
        document.getElementById('companyTab').classList.toggle('active', tabId === 'company');

        // Re-render/Refresh if needed (ApexCharts sometimes needs a resize trigger when hidden container is shown)
        if (tabId === 'sector' && sectorChart) sectorChart.windowResizeHandler();
        if (tabId === 'company' && companyChart) companyChart.windowResizeHandler();
    }

    function calcChartHeight() {
        // Container height is calc(100vh - 80px)
        // Card padding is 15px top/bottom = 30px
        // Header height is approx 60px
        // We want to fill the remaining space
        const containerHeight = document.querySelector('.heatmap-container').offsetHeight;
        const tabHeaderHeight = 40; 
        const cardPadding = 30;
        const chartHeaderHeight = 50;
        
        return containerHeight - tabHeaderHeight - cardPadding - chartHeaderHeight - 30; 
    }

    function setupEventListeners() {
        const filter = document.getElementById('sectorFilter');
        if (filter) {
            filter.addEventListener('change', (e) => {
                currentSectorFilter = e.target.value;
                renderCompanyHeatmap();
            });
        }
    }

    async function fetchData() {
        showLoaders();
        try {
            const json = await apiClient.get(API_URL);
            allData = json.liveCompanyData || [];
            
            if (!allData.length) {
                console.warn("No market data available for heatmap.");
            } else {
                // Extract unique sectors
                sectorsList = [...new Set(allData.map(item => item.sector).filter(s => s))].sort();
                populateSectorDropdown();
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            hideLoaders();
        }
    }

    function populateSectorDropdown() {
        const filter = document.getElementById('sectorFilter');
        if (!filter) return;

        domUtils.clearNode(filter);
        filter.appendChild(domUtils.createElement('option', { attributes: { value: 'all' }, textContent: 'All Sectors' }));
        
        sectorsList.forEach(sector => {
            filter.appendChild(domUtils.createElement('option', { attributes: { value: sector }, textContent: sector }));
        });
    }

    function getColorForChange(change) {
        const val = parseFloat(change);
        if (val <= -3) return COLORS.veryNegative;
        if (val < -1) return COLORS.negative;
        if (val <= 1) return COLORS.neutral;
        if (val < 3) return COLORS.positive;
        return COLORS.veryPositive;
    }

    function processSectorData() {
        const sectors = {};

        allData.forEach(item => {
            const sector = item.sector || "Unknown";
            const turnover = parseFloat(item.totalTradeValue) || 0;
            const pctChange = parseFloat(item.percentageChange) || 0;

            if (!sectors[sector]) {
                sectors[sector] = {
                    name: sector,
                    totalTurnover: 0,
                    weightedChangeSum: 0,
                    count: 0
                };
            }

            sectors[sector].totalTurnover += turnover;
            sectors[sector].weightedChangeSum += (turnover * pctChange);
            sectors[sector].count++;
        });

        return Object.values(sectors).map(s => {
            const avgChange = s.totalTurnover > 0 
                ? (s.weightedChangeSum / s.totalTurnover) 
                : 0;

            return {
                x: s.name,
                y: s.totalTurnover,
                change: avgChange.toFixed(2),
                fillColor: getColorForChange(avgChange)
            };
        }).filter(s => s.y > 0);
    }

    function processCompanyData() {
        const grouped = {};
        
        allData.forEach(item => {
            const sector = item.sector || "Unknown";
            
            // Apply filter
            if (currentSectorFilter !== "all" && sector !== currentSectorFilter) return;

            const change = parseFloat(item.percentageChange) || 0;
            const turnover = parseFloat(item.totalTradeValue) || 0;
            
            if (turnover <= 0) return;

            if (!grouped[sector]) {
                grouped[sector] = {
                    name: sector,
                    data: []
                };
            }

            grouped[sector].data.push({
                x: item.symbol,
                y: turnover,
                change: change,
                fillColor: getColorForChange(change)
            });
        });

        // Convert to array and sort sectors by total turnover (descending)
        return Object.values(grouped).sort((a, b) => {
            const totalA = a.data.reduce((sum, d) => sum + d.y, 0);
            const totalB = b.data.reduce((sum, d) => sum + d.y, 0);
            return totalB - totalA;
        });
    }

    function renderSectorHeatmap() {
        const data = processSectorData();
        const options = getChartOptions("Sector Performance", data, calcChartHeight());
        
        if (sectorChart) sectorChart.destroy();
        sectorChart = new ApexCharts(document.querySelector("#sectorHeatmap"), options);
        sectorChart.render();
    }

    function renderCompanyHeatmap() {
        const data = processCompanyData();
        const options = getChartOptions("Company Performance", data, calcChartHeight());
        
        // Slightly different options for company view (more labels)
        options.plotOptions.treemap.enableShades = false; // Disable shades to favor our specific colors
        options.dataLabels.style.fontSize = '10px';

        if (companyChart) companyChart.destroy();
        companyChart = new ApexCharts(document.querySelector("#companyHeatmap"), options);
        companyChart.render();
    }

    function getChartOptions(title, data, height = 450) {
        // If data is already an array of series objects (for grouping), use it.
        // Otherwise, wrap the flat data in a single series.
        const series = Array.isArray(data) && data[0]?.data 
            ? data 
            : [{ data: data }];

        return {
            series: series,
            legend: {
                show: false
            },
            chart: {
                height: height,
                type: 'treemap',
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            title: {
                show: false
            },
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'Outfit, sans-serif'
                },
                formatter: function(text, op) {
                    const dataObj = op.w.config.series[op.seriesIndex].data[op.dataPointIndex];
                    const change = dataObj.change || 0;
                    return [text, change + "%"];
                },
                offsetY: -4
            },
            plotOptions: {
                treemap: {
                    distributed: true,
                    enableShades: false
                }
            },
            theme: {
                mode: 'dark'
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                        const item = w.config.series[seriesIndex].data[dataPointIndex];
                        const formattedTurnover = new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'NPR',
                            maximumFractionDigits: 0
                        }).format(val);
                        return `Turnover: ${formattedTurnover} | Change: ${item.change}%`;
                    }
                }
            }
        };
    }

    function showLoaders() {
        document.getElementById('sectorLoader').style.display = 'flex';
        document.getElementById('companyLoader').style.display = 'flex';
    }

    function hideLoaders() {
        document.getElementById('sectorLoader').style.display = 'none';
        document.getElementById('companyLoader').style.display = 'none';
    }

    return { init };
})();
