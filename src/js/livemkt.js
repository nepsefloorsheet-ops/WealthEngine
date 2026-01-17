async function loadNepse() {
    try {
        const res = await fetch("https://nepseapi-ouhd.onrender.com/api/live-nepse");
        const json = await res.json();

        console.log("API RESPONSE:", json); // DEBUG

        // ✅ HANDLE BOTH array & object responses
        const data = Array.isArray(json)
            ? json
            : json.data || json.liveNepse || [];

        // Sort data by lastUpdatedDateTime (newest first)
        data.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const tbody = document.getElementById("nepse-body");
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = "<tr><td colspan='15'>No data available</td></tr>";
            return;
        }

        let positive = 0;
        let negative = 0;
        let unchanged = 0;

        data.forEach(item => {
            const row = document.createElement("tr");

            //format number
            const formatNumber = (value, decimals = 2) => {
                return Number(value || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2
                });
            };

            // row color + count
            row.classList.remove("positive", "negative", "unchanged");

            if (item.change > 0) {
                row.classList.add("positive");
                positive++;
            } else if (item.change < 0) {
                row.classList.add("negative");
                negative++;
            } else {
                row.classList.add("unchanged");
                unchanged++;
            }

            row.innerHTML = `
                <td class="middle"><strong>${item.symbol}</strong></td>
                <td class="right">${formatNumber(item.lastTradedPrice)}</td>
                <td class="right">${item.lastTradedVolume}</td>
                <td class="right">${formatNumber(item.change)}</td>
                <td class="right">${item.percentageChange}%</td>
                <td class="right">${formatNumber(item.openPrice)}</td>
                <td class="right">${formatNumber(item.highPrice)}</td>
                <td class="right">${formatNumber(item.lowPrice)}</td>
                <td class="right">${formatNumber(item.previousClose)}</td>
                <td class="right">${item.totalTradeQuantity}</td>
                <td class="right">${formatNumber(item.totalTradeValue)}</td>
            `;

            tbody.appendChild(row);
        });

        // write counts to IDs (LIVE)
        document.getElementById("positiveCount").textContent = positive;
        document.getElementById("negativeCount").textContent = negative;
        document.getElementById("unchangedCount").textContent = unchanged;

    } catch (err) {
        console.error("JS ERROR:", err);
    }
}

loadNepse();
setInterval(loadNepse, 20000);


function updateMarketColor() {
    const marketPill = document.getElementById('market-pill').innerText.toLowerCase();
    const liveMarket = document.getElementById('live-market');

    // Reset color
    liveMarket.style.color = '';

    // Change color based on market-pill text
    switch (marketPill) {
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
            liveMarket.style.color = 'white';
    }
}

// Make #live-market blink continuously
function startBlinking() {
    const liveMarket = document.getElementById('live-market');
    setInterval(() => {
        liveMarket.style.visibility = (liveMarket.style.visibility === 'hidden') ? 'visible' : 'hidden';
    }, 500); // Blink every 500ms
}

// Initial setup
updateMarketColor();
startBlinking();

// Optional: If #market-pill text changes dynamically, update color automatically
const marketPillObserver = new MutationObserver(updateMarketColor);
marketPillObserver.observe(document.getElementById('market-pill'), { childList: true, characterData: true, subtree: true });