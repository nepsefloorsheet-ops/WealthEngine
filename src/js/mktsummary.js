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

function fetchMktSummaryData() {
    const tableBody = document.getElementById("nepse-table-body");
    if (tableBody) {
        let skeletons = "";
        for (let i = 0; i < 10; i++) {
            skeletons += `
                <tr>
                    <td><div class="skeleton sk-cell"></div></td>
                    <td><div class="skeleton sk-cell"></div></td>
                    <td><div class="skeleton sk-cell"></div></td>
                    <td><div class="skeleton sk-cell"></div></td>
                    <td><div class="skeleton sk-cell"></div></td>
                    <td><div class="skeleton sk-cell"></div></td>
                </tr>
            `;
        }
        tableBody.innerHTML = skeletons;
    }

    fetch(`${SUPABASE_URL}/rest/v1/mkt_summary?select=*&order=trade_date.desc&limit=all`, {
        headers: {
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`
        }
    })
        .then(response => response.json())
        .then(data => {
            allMktSummaryData = data;
            renderMktSummaryTable(data);
        })
        .catch(error => {
            console.error("Error fetching NEPSE data:", error);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Failed to load data</td></tr>`;
        });
}

function filterMktSummaryByDate(dateStr) {
    const filtered = allMktSummaryData.filter(row => row.trade_date === dateStr);
    renderMktSummaryTable(filtered);

    if (filtered.length === 0) {
        const tableBody = document.getElementById("nepse-table-body");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No summary found for ${dateStr}.</td></tr>`;
        }
    }
}

function renderMktSummaryTable(data) {
    const tableBody = document.getElementById("nepse-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    data.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="l">${index + 1}</td>
            <td class="l">${row.trade_date}</td>
            <td class="o">${formatNepaliNumber(row.turnover)}</td>
            <td class="o">${formatNepaliNumber(row.volume, 0)}</td>
            <td class="o">${formatNepaliNumber(row.txn, 0)}</td>
            <td class="o">${formatNepaliNumber(row.scrip_traded, 0)}</td>
                `;
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
