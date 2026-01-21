const SUPABASE_URL = "https://drczviykmgapsptheate.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY3p2aXlrbWdhcHNwdGhlYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Mzg1MTIsImV4cCI6MjA4MzExNDUxMn0.I03-UrJKQlKzxLhmwhOj1Q7Zj9_tfQo7KDCvIO1agoM";

let allMktSummaryData = [];

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('historyDate');
    const searchBtn = document.getElementById('searchBtn');

    if (dateInput) {
        // 1. Set Date Constraints (Today to 1 Year Ago)
        const today = new Date();
        const lastYear = new Date(new Date().setFullYear(today.getFullYear() - 1));
        const formatDate = (date) => date.toISOString().split('T')[0];

        dateInput.max = formatDate(today);
        dateInput.min = formatDate(lastYear);
        dateInput.value = formatDate(today);
    }

    // 2. Fetch Initial Data
    fetchMktSummaryData();

    // 3. Search Event
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const selectedDate = dateInput.value;
            if (selectedDate) filterMktSummaryByDate(selectedDate);
        });
    }
});

async function fetchMktSummaryData() {
    const tableBody = document.getElementById("nepse-table-body");
    if (!tableBody) return;

    domUtils.clearNode(tableBody);
    for (let i = 0; i < 10; i++) {
        const skeletonRow = domUtils.createElement('tr', {
            children: Array(6).fill(0).map(() => 
                domUtils.createElement('td', {
                    children: [domUtils.createElement('div', { className: 'skeleton sk-cell' })]
                })
            )
        });
        tableBody.appendChild(skeletonRow);
    }

    try {
        const data = await apiClient.get(`${SUPABASE_URL}/rest/v1/mkt_summary?select=*&order=trade_date.desc&limit=all`, {
            headers: {
                "apikey": ANON_KEY,
                "Authorization": `Bearer ${ANON_KEY}`
            }
        });
        allMktSummaryData = data;
        renderMktSummaryTable(data);
    } catch (error) {
        console.error("Error fetching NEPSE data:", error);
        domUtils.clearNode(tableBody);
        tableBody.appendChild(domUtils.createElement('tr', {
            children: [domUtils.createElement('td', {
                attributes: { colspan: '6' },
                styles: { textAlign: 'center', color: 'red' },
                textContent: 'Failed to load data'
            })]
        }));
    }
}

function filterMktSummaryByDate(dateStr) {
    const filtered = allMktSummaryData.filter(row => row.trade_date === dateStr);
    renderMktSummaryTable(filtered);

    if (filtered.length === 0) {
        const tableBody = document.getElementById("nepse-table-body");
        if (tableBody) {
            domUtils.clearNode(tableBody);
            tableBody.appendChild(domUtils.createElement('tr', {
                children: [domUtils.createElement('td', {
                    attributes: { colspan: '6' },
                    styles: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)' },
                    textContent: `No summary found for ${dateStr}.`
                })]
            }));
        }
    }
}

function renderMktSummaryTable(data) {
    const tableBody = document.getElementById("nepse-table-body");
    if (!tableBody) return;

    domUtils.clearNode(tableBody);
    data.forEach((row, index) => {
        const tr = domUtils.createElement("tr", {
            children: [
                domUtils.createElement("td", { className: "l", textContent: (index + 1).toString() }),
                domUtils.createElement("td", { className: "l", textContent: row.trade_date }),
                domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.turnover) }),
                domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.volume, 0) }),
                domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.txn, 0) }),
                domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.scrip_traded, 0) })
            ]
        });
        tableBody.appendChild(tr);
    });
}

function formatNepaliNumber(value, decimals = 2) {
    if (value === null || value === undefined) return "";
    return Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}
