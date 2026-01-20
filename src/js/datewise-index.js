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

function fetchData() {
  const table = document.getElementById("nepse-table-body");
  if (table) {
      let skeletons = "";
      for (let i = 0; i < 15; i++) {
          skeletons += `
              <tr>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
                  <td><div class="skeleton sk-cell"></div></td>
              </tr>
          `;
      }
      table.innerHTML = skeletons;
  }

  fetch(`${SUPABASE_URL}/rest/v1/nepase_data?select=*&order=trade_date.desc&limit=all`, {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`
    }
  })
    .then(response => response.json())
    .then(data => {
      allNepseData = data;
      renderTable(data);
    })
    .catch(error => {
      console.error("Error fetching NEPSE data:", error);
      if (table) table.innerHTML = `<tr><td colspan="13" style="text-align:center; color:red;">Failed to load data</td></tr>`;
    });
}

function filterByDate(dateStr) {
  const filtered = allNepseData.filter(row => row.trade_date === dateStr);
  renderTable(filtered);

  if (filtered.length === 0) {
    const table = document.getElementById("nepse-table-body");
    table.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 40px; color: var(--text-muted);">No data found for ${dateStr}.</td></tr>`;
  }
}

function renderTable(data) {
  const table = document.getElementById("nepse-table-body");
  if (!table) return;
  
  table.innerHTML = "";
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${row.trade_date}</td>
            <td class="o">${formatNepaliNumber(row.open_price)}</td>
            <td class="o">${formatNepaliNumber(row.high_price)}</td>
            <td class="o">${formatNepaliNumber(row.low_price)}</td>
            <td class="o">${formatNepaliNumber(row.close_price)}</td>
            <td class="o">${formatNepaliNumber(row.pt_change)}</td>
            <td class="o">${formatNepaliNumber(row.change_p)}</td>
            <td class="o">${formatNepaliNumber(row.w52_high)}</td>
            <td class="o">${formatNepaliNumber(row.w52_low)}</td>
            <td class="o">${formatNepaliNumber(row.value)}</td>
            <td class="o">${formatNepaliNumber(row.volume, 0)}</td>
            <td class="o">${formatNepaliNumber(row.txn, 0)}</td>
                `;
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
