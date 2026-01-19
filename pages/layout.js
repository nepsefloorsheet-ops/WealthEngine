/* =========================================================
   DYNAMIC LAYOUT ENGINE
   - Injects Sidebar and Header
   - Handles relative paths automatically
========================================================= */

(function () {
    // 1. Determine relative path depth
    // If we are in /pages/, depth is 1 (prefix need '../')
    // If we are in root, depth is 0 (prefix need './')

    const path = window.location.pathname;
    const isCalculatorDir = path.includes("/calculator/") || path.includes("\\calculator\\");
    const isPagesDir = (path.includes("/pages/") || path.includes("\\pages\\")) && !isCalculatorDir;

    let root, pages, calc;

    if (isCalculatorDir) {
        root = "../../";
        pages = "../";
        calc = "./";
    } else if (isPagesDir) {
        root = "../";
        pages = "./";
        calc = "./calculator/";
    } else {
        root = "./";
        pages = "./pages/";
        calc = "./pages/calculator/";
    }

    // Get current Page Name (for title, etc) - optional improvement
    const pageName = document.title.replace("WealthEngine - ", "");

    // 2. Define HTML Strings
    const sidebarHTML = `
    <header class="navhead">
        <h3>WealthEngine</h3>
    </header>
    <div class="burger ope">
        <span></span>
        <span></span>
        <span></span>
    </div>
    <ul class="dropdown">
        <li class="link"><button class="butt" onclick="document.location='${root}index.html'">Home </button></li>
        <li class="link"><button class="butt" onclick="document.location='${pages}order.html'">Order </button></li>
        <li class="link"><button class="butt" onclick="document.location='${pages}market.html'">Market </button></li>
        <li class="link"><button class="butt" onclick="document.location='${pages}watchlist.html'">Watchlist </button></li>
        <li class="link"><button class="butt" onclick="document.location='${pages}holdings.html'">Holdings </button></li>
        <li class="drop">
            <button class="link but">Books<span class="tri">&#9660;</span></button>
            <ul class="dropdown-menu">
                <li class="link"><button class="butt" onclick="document.location='${pages}orderbook.html'">Daily Order Book </button></li>
                <li class="link"><button class="butt" onclick="document.location='${pages}tradebook.html'">Daily Trade Book </button></li>
            </ul>
        </li>
        <li class="link"><button class="butt" onclick="document.location='${pages}charts.html'">Charts </button></li>
        <li class="drop">
            <button class="link but">NEPSE Data<span class="tri">&#9660;</span></button>
            <ul class="dropdown-menu">
                <li class="link"><button class="butt" onclick="document.location='${pages}datewise-index.html'">Datewise Index </button></li>
                <li class="link"><button class="butt" onclick="document.location='${pages}mktsummary.html'">Market Summary </button></li>
            </ul>
        </li>
        <li class="drop">
            <button class="link but">Calculator<span class="tri">&#9660;</span></button>
            <ul class="dropdown-menu">
                <li class="link"><button class="butt" onclick="document.location='${calc}buysell.html'">Buy/Sell Calculator </button></li>
                <li class="link"><button class="butt" onclick="document.location='${calc}dividend.html'">Dividend Calculator </button></li>
            </ul>
        </li>
        <li class="link"><button class="butt" onclick="document.location='${pages}contact.html'">Contact</button></li>
    </ul>
  `;

    const headerHTML = `
    <index>
        <nepse>
            <h4>NEPSE</h4>
            <div style="display: flex; flex-direction: row; gap: 8px; align-items: center;">
                <p class="nepse">0</p>
                <p class="change">0</p>
            </div>
        </nepse>
        <data>
            <p class="tv"><strong>Turnover:</strong> <span id="turnover">0</span></p>
            <p class="tv"><strong>Total Volume:</strong> <span id="volume">0</span></p>
        </data>
    </index>
    <h2 id="page-title">${pageName}</h2>
    <div class="time">
        <p id="date"></p>
        <status class="status">
            <span id="market-pill" class="market-pill"></span>
            <div id="market-countdown"></div>
        </status>
    </div>
  `;

    // 3. Inject
    function inject() {
        // Inject Sidebar
        const nav = document.querySelector("nav.sidebar");
        if (nav) nav.innerHTML = sidebarHTML;

        // Inject Header
        const header = document.querySelector("header.open");
        if (header) header.innerHTML = headerHTML;

        // Set Active Link
        highlightActiveLink();

        // Dispatch Event so other scripts know DOM is ready
        document.dispatchEvent(new Event("layout-injected"));
    }

    function highlightActiveLink() {
        const currentFile = path.split("/").pop() || "index.html";
        const buttons = document.querySelectorAll(".butt");
        buttons.forEach(btn => {
            const onclickVal = btn.getAttribute("onclick");
            if (onclickVal) {
                // Extract path from: document.location='path'
                const match = onclickVal.match(/document\.location='([^']+)'/);
                if (match && match[1]) {
                    const targetFile = match[1].split("/").pop();
                    if (targetFile === currentFile) {
                        btn.closest("li").classList.add("active");
                        // If inside dropdown, open it
                        const parentDrop = btn.closest(".drop");
                        if (parentDrop) parentDrop.classList.add("dnopen");
                    }
                }
            }
        });
    }

    // Run immediately if DOM ready, or wait
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inject);
    } else {
        inject();
    }

})();
