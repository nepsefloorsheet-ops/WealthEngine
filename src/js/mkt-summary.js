const SUPABASE_URL = "https://drczviykmgapsptheate.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY3p2aXlrbWdhcHNwdGhlYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Mzg1MTIsImV4cCI6MjA4MzExNDUxMn0.I03-UrJKQlKzxLhmwhOj1Q7Zj9_tfQo7KDCvIO1agoM";

// Fetch NEPSE table data
fetch(`${SUPABASE_URL}/rest/v1/mkt_summary?select=*&order=trade_date.desc&limit=all`, {
    headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`
    }
})

    .then(response => response.json())
    .then(data => {
        const table = document.getElementById("nepse-table-body");
        data.forEach((row,index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td class="l">${index+1}</td>
            <td class="l">${row.trade_date}</td>
            <td class="o">${formatNepaliNumber(row.turnover)}</td>
            <td class="o">${formatNepaliNumber(row.volume, 0)}</td>
            <td class="o">${formatNepaliNumber(row.txn, 0)}</td>
            <td class="o">${formatNepaliNumber(row.scrip_traded, 0)}</td>
                `;
            table.appendChild(tr);
        });
    })
    .catch(error => {
        console.error("Error fetching NEPSE data:", error);
        const table = document.getElementById("nepse-table-body");
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="12" style="text-align:center; color:red;">Failed to load data</td>`;
        table.appendChild(tr);
    });

function formatNepaliNumber(value, decimals = 2) {
    if (value === null || value === undefined) return "";
    return Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}
