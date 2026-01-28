const SUPABASE_URL = "https://drczviykmgapsptheate.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY3p2aXlrbWdhcHNwdGhlYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Mzg1MTIsImV4cCI6MjA4MzExNDUxMn0.I03-UrJKQlKzxLhmwhOj1Q7Zj9_tfQo7KDCvIO1agoM";

let allNepseData = [];

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
  fetchData();

  // 3. Search Event
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const selectedDate = dateInput.value;
      if (selectedDate) filterByDate(selectedDate);
    });
  }
});

async function fetchData() {
  const table = document.getElementById("nepse-table-body");
  if (!table) return;

  // Check cache first for immediate render
  const cached = apiClient.getCache('nepse_data_all');
  if (cached && !allNepseData.length) {
    allNepseData = cached;
    renderTable(cached);
  }

  try {
    const data = await apiClient.get(`${SUPABASE_URL}/rest/v1/nepase_data?select=*&order=trade_date.desc&limit=all`, {
      cacheKey: 'nepse_data_all',
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`
      }
    });
    allNepseData = data;
    renderTable(data);
  } catch (error) {
    console.error("Error fetching NEPSE data:", error);
    if (!allNepseData.length) {
        domUtils.clearNode(table);
        table.appendChild(domUtils.createElement('tr', {
          children: [domUtils.createElement('td', {
            attributes: { colspan: '13' },
            styles: { textAlign: 'center', color: 'red' },
            textContent: 'Failed to load data'
          })]
        }));
    }
  }
}

function filterByDate(dateStr) {
  const filtered = allNepseData.filter(row => row.trade_date === dateStr);
  renderTable(filtered);

  if (filtered.length === 0) {
    const table = document.getElementById("nepse-table-body");
    domUtils.clearNode(table);
    table.appendChild(domUtils.createElement('tr', {
      children: [domUtils.createElement('td', {
        attributes: { colspan: '13' },
        styles: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)' },
        textContent: `No data found for ${dateStr}.`
      })]
    }));
  }
}

function renderTable(data) {
  const table = document.getElementById("nepse-table-body");
  if (!table) return;
  
  domUtils.clearNode(table);
  data.forEach((row, index) => {
    const tr = domUtils.createElement("tr", {
      children: [
        domUtils.createElement("td", { textContent: (index + 1).toString() }),
        domUtils.createElement("td", { textContent: row.trade_date }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.open_price) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.high_price) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.low_price) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.close_price) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.pt_change) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.change_p) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.w52_high) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.w52_low) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.value) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.volume, 0) }),
        domUtils.createElement("td", { className: "o", textContent: formatNepaliNumber(row.txn, 0) })
      ]
    });
    table.appendChild(tr);
  });
}

function formatNepaliNumber(value, decimals = 2) {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
