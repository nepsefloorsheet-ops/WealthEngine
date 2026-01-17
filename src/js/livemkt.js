let nepseTimer = null;
const REFRESH_INTERVAL = 20000; // 20 seconds

async function loadNepse() {
    try {
        const res = await fetch("https://nepseapi-ouhd.onrender.com/api/live-nepse");
        const json = await res.json();

        console.log("API RESPONSE:", json);

        // Handle array & object responses
        const data = Array.isArray(json)
            ? json
            : json.data || json.liveNepse || [];

        // Sort by latest update time (newest first)
        data.sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime));

        const tbody = document.getElementById("nepse-body");
        tbody.innerHTML = "";

        if (!data.length) {
            tbody.innerHTML = "<tr><td colspan='15'>No data available</td></tr>";
            scheduleNext();
            return;
        }

        document.dispatchEvent(
            new CustomEvent("nepse:data", { detail: data })
        );


        let positive = 0;
        let negative = 0;
        let unchanged = 0;

        const formatNumber = value =>
            Number(value || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

        data.forEach(item => {
            const row = document.createElement("tr");

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

        document.getElementById("positiveCount").textContent = positive;
        document.getElementById("negativeCount").textContent = negative;
        document.getElementById("unchangedCount").textContent = unchanged;

    } catch (err) {
        console.error("NEPSE ERROR:", err);
    } finally {
        scheduleNext();
    }
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