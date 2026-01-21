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
        <li class="link"><button class="butt" onclick="document.location='${pages}heatmap.html'">Heatmap </button></li> 
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
                <li class="link"><button class="butt" onclick="document.location='${pages}calendar.html'">Market Calendar </button></li>
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
            <div class="nepse-wrapper">
                <span id="nepse-icon" class="nepse-icon"></span>
                <p class="nepse">0</p>
                <div class="nepse-change-info">
                    <span class="change">0</span>
                    <span id="nepse-pcent" class="nepse-pcent"></span>
                </div>
            </div>
        </nepse>
        <data>
            <p class="tv">Turnover:<span id="turnover">0</span></p>
            <p class="tv">Total Volume:<span id="volume">0</span></p>
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


    const tickerHTML = `
    <div class="news-ticker">
        <div class="ticker-label">NEWS</div>
        <div class="ticker-wrap">
            <div class="ticker-content" id="ticker-content">
                <!-- News items injected here -->
            </div>
        </div>
    </div>
  `;

    // 3. Inject
    function inject() {
        // Inject Help Styles
        if (!document.getElementById('help-styles')) {
            const link = domUtils.createElement('link', {
                id: 'help-styles',
                attributes: { rel: 'stylesheet', href: `${root}src/css/help.css` }
            });
            document.head.appendChild(link);
        }

        // Inject Sidebar
        const nav = document.querySelector("nav.sidebar");
        if (nav) {
            nav.innerHTML = sidebarHTML;
            // Lazy load Font Awesome on sidebar interaction
            nav.addEventListener('mouseenter', lazyLoadFontAwesome, { once: true });
            nav.addEventListener('click', lazyLoadFontAwesome, { once: true });
        }

        // Inject Header
        const header = document.querySelector("header.open");
        if (header) header.innerHTML = headerHTML;

        // Inject Ticker (Body level)
        const existingTicker = document.querySelector(".news-ticker");
        if (!existingTicker) {
            document.body.insertAdjacentHTML('beforeend', tickerHTML);
            populateTicker();
        }

        // Set Active Link
        highlightActiveLink();

        // Dispatch Event so other scripts know DOM is ready
        document.dispatchEvent(new Event("layout-injected"));
    }

    function setupHelpEvents() {
        const helpBtn = document.getElementById('btn-help');
        const helpModal = document.getElementById('help-modal');
        const closeHelp = document.getElementById('close-help');

        if (helpBtn && helpModal) {
            helpBtn.onclick = () => {
                lazyLoadFontAwesome(); // Ensure icons are loaded when opening help
                helpModal.style.display = 'flex';
            };
        }

        if (closeHelp) {
            closeHelp.onclick = () => helpModal.style.display = 'none';
        }

        if (helpModal) {
            helpModal.onclick = (e) => {
                if (e.target === helpModal) helpModal.style.display = 'none';
            };
        }
    }

    function lazyLoadFontAwesome() {
        if (window.fontAwesomeLoaded) return;
        
        const link = domUtils.createElement('link', {
            attributes: { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css' }
        });
        document.head.appendChild(link);
        
        window.fontAwesomeLoaded = true;
        console.log("Font Awesome lazy-loaded");
    }

    async function populateTicker() {
        const content = document.getElementById("ticker-content");
        if (!content) return;

        let newsItems = [];

        try {
            const json = await apiClient.get("https://sharehubnepal.com/data/api/v1/announcement?Size=12&Page=1");
            
            if (json && json.data && Array.isArray(json.data.content)) {
                newsItems = json.data.content.map(item => ({ text: item.title }));
            } else if (Array.isArray(json)) {
                newsItems = json.map(item => ({ text: item.title || item.text }));
            }
        } catch (error) {
            console.warn("News API fetch failed, using fallback mock data:", error);
        }

        // If API failed or returned no data, use fallback
        if (newsItems.length === 0) {
            newsItems = [
                { text: "NICA declares 10.5% Cash Dividend for the fiscal year 2080/81." },
                { text: "NEPSE reaches a new 52-week high of 2,215.34 points." },
                { text: "UPPER Tamakoshi to issue 1:1 Right Shares starting next Sunday." },
                { text: "Market hours extended until 4:00 PM for upcoming festival season." },
                { text: "Trading of JLI suspended due to merger process with LI." },
                { text: "Total market turnover crosses 12 Billion in a single trading day." }
            ];
        }

        domUtils.clearNode(content);
        // Duplicate for seamless loop
        const displayNews = [...newsItems, ...newsItems];
        
        displayNews.forEach(item => {
            const span = domUtils.createElement('span', {
                className: 'news-item',
                children: [
                    domUtils.createElement('i', { className: 'fas fa-bullhorn' }),
                    document.createTextNode(` ${item.text || 'News update...'} `),
                    domUtils.createElement('span', { className: 'sep', textContent: '|' })
                ]
            });
            content.appendChild(span);
        });
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
