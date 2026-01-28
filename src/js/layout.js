(function () {
    const path = window.location.pathname;
    const isCalculatorDir = path.includes("/calculator/") || path.includes("\\calculator\\");
    const isPagesDir = (path.includes("/pages/") || path.includes("\\pages\\")) && !isCalculatorDir;

    let root = isCalculatorDir ? "../../" : (isPagesDir ? "../" : "./");
    let pages = isCalculatorDir ? "../" : (isPagesDir ? "./" : "./pages/");
    let calc = isCalculatorDir ? "./" : (isPagesDir ? "./calculator/" : "./pages/calculator/");

    const pageName = document.title.replace("WealthEngine - ", "");
    
    // Use AbortController to manage async tasks link ticker
    const layoutController = new AbortController();

    /**
     * Safe navigation helper to replace onclick
     */
    function navigateTo(url) {
        window.location.href = url;
    }

    function createSidebar() {
        const nav = domUtils.createElement('nav', { className: 'sidebar' });
        
        const header = domUtils.createElement('header', {
            className: 'navhead',
            children: [domUtils.createElement('h3', { textContent: 'WealthEngine' })]
        });

        const burger = domUtils.createElement('div', {
            className: 'burger ope',
            children: [domUtils.createElement('span'), domUtils.createElement('span'), domUtils.createElement('span')]
        });

        const menu = domUtils.createElement('ul', { className: 'dropdown' });

        const links = [
            { text: 'Home', url: `${root}index.html` },
            { text: 'Order', url: `${pages}order.html` },
            { text: 'Market', url: `${pages}market.html` },
            { text: 'Watchlist', url: `${pages}watchlist.html` },
            { text: 'Holdings', url: `${pages}holdings.html` },
            {
                text: 'Books', isDrop: true, children: [
                    { text: 'Daily Order Book', url: `${pages}orderbook.html` },
                    { text: 'Daily Trade Book', url: `${pages}tradebook.html` }
                ]
            },
            { text: 'Charts', url: `${pages}charts.html` },
            {
                text: 'NEPSE Data', isDrop: true, children: [
                    { text: 'Datewise Index', url: `${pages}datewise-index.html` },
                    { text: 'Market Summary', url: `${pages}mktsummary.html` },
                ]
            },
            {
                text: 'Calculator', isDrop: true, children: [
                    { text: 'Buy/Sell Calculator', url: `${calc}buysell.html` },
                    { text: 'Dividend Calculator', url: `${calc}dividend.html` }
                ]
            },
            { text: 'Contact', url: `${pages}contact.html` }
        ];

        links.forEach(link => {
            const li = domUtils.createElement('li', { className: link.isDrop ? 'drop' : 'link' });
            const btn = domUtils.createElement('button', {
                className: link.isDrop ? 'link but' : 'butt',
                attributes: { 'data-url': link.url || '' },
                children: link.isDrop ? [link.text, domUtils.createElement('span', { className: 'tri', textContent: '▼' })] : [link.text]
            });

            if (!link.isDrop) {
                btn.addEventListener('click', () => navigateTo(link.url));
            } else {
                const subMenu = domUtils.createElement('ul', { className: 'dropdown-menu' });
                link.children.forEach(sub => {
                    const subLi = domUtils.createElement('li', { className: 'link' });
                    const subBtn = domUtils.createElement('button', { className: 'butt', textContent: sub.text });
                    subBtn.addEventListener('click', () => navigateTo(sub.url));
                    subLi.appendChild(subBtn);
                    subMenu.appendChild(subLi);
                });
                li.appendChild(subMenu);
                // Toggle logic is handled in global.js, but we ensure structure is sound here
            }

            li.insertBefore(btn, li.firstChild);
            menu.appendChild(li);
        });

        nav.appendChild(header);
        nav.appendChild(burger);
        nav.appendChild(menu);
        
        nav.addEventListener('mouseenter', lazyLoadFontAwesome, { once: true });
        
        return nav;
    }

    function createHeader() {
        const indexEl = domUtils.createElement('index', {
            children: [
                domUtils.createElement('nepse', {
                    children: [
                        domUtils.createElement('h4', { textContent: 'NEPSE' }),
                        domUtils.createElement('div', {
                            className: 'nepse-wrapper',
                            children: [
                                domUtils.createElement('span', { attributes: { id: 'hdr-nepse-icon' }, className: 'nepse-icon' }),
                                domUtils.createElement('p', { className: 'nepse', textContent: '0' }),
                                domUtils.createElement('div', {
                                    className: 'nepse-change-info',
                                    children: [
                                        domUtils.createElement('span', { className: 'change', textContent: '0' }),
                                        domUtils.createElement('span', { attributes: { id: 'hdr-nepse-pcent' }, className: 'nepse-pcent' })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
            ]
        });

        const titleEl = domUtils.createElement('h2', { attributes: { id: 'page-title' }, textContent: pageName });
        const timeEl = domUtils.createElement('div', {
            className: 'time',
            children: [
                domUtils.createElement('p', { attributes: { id: 'hdr-date' } }),
                domUtils.createElement('status', {
                    className: 'status',
                    children: [
                        domUtils.createElement('span', { attributes: { id: 'hdr-market-pill' }, className: 'market-pill' }),
                        domUtils.createElement('div', { attributes: { id: 'hdr-market-countdown' } })
                    ]
                })
            ]
        });

        return [indexEl, titleEl, timeEl];
    }

    function createTicker() {
        return domUtils.createElement('div', {
            className: 'news-ticker',
            children: [
                domUtils.createElement('div', { className: 'ticker-label', textContent: 'NEWS' }),
                domUtils.createElement('div', {
                    className: 'ticker-wrap',
                    children: [domUtils.createElement('div', { className: 'ticker-content', attributes: { id: 'hdr-ticker-content' } })]
                })
            ]
        });
    }

    function inject() {
        // Styles
        if (!document.getElementById('help-styles')) {
            const link = domUtils.createElement('link', {
                id: 'help-styles',
                attributes: { rel: 'stylesheet', href: `${root}src/css/help.css` }
            });
            document.head.appendChild(link);
        }

        // Sidebar
        const existingSidebar = document.querySelector("nav.sidebar");
        if (existingSidebar) {
            const newSidebar = createSidebar();
            existingSidebar.replaceWith(newSidebar);
        }

        // Header
        const header = document.querySelector("header.open");
        if (header) {
            domUtils.clearNode(header);
            const content = createHeader();
            content.forEach(el => header.appendChild(el));
        }

        // Ticker
        let ticker = document.querySelector(".news-ticker");
        if (!ticker) {
            ticker = createTicker();
            document.body.appendChild(ticker);
        }
        populateTicker();

        highlightActiveLink();
        window.layoutInjected = true;
        document.dispatchEvent(new Event("layout-injected"));
    }

    function lazyLoadFontAwesome() {
        if (window.fontAwesomeLoaded) return;
        const link = domUtils.createElement('link', {
            attributes: { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css' }
        });
        document.head.appendChild(link);
        window.fontAwesomeLoaded = true;
    }

    async function populateTicker() {
        const content = document.getElementById("hdr-ticker-content");
        if (!content) return;

        // Load from cache first
        const cached = apiClient.getCache('news_announcements');
        if (cached) {
            renderTickerItems(content, cached);
        }

        let newsItems = [];

        try {
            const json = await apiClient.get("https://sharehubnepal.com/data/api/v1/announcement?Size=12&Page=1", { 
                signal: layoutController.signal,
                cacheKey: 'news_announcements'
            });
            if (json && json.data && Array.isArray(json.data.content)) {
                newsItems = json.data.content.map(item => ({ text: item.title }));
                renderTickerItems(content, newsItems);
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.warn("News API failed:", error);
        }

        if (newsItems.length === 0 && !cached) {
            newsItems = [{ text: "NEPSE reaches a new 52-week high." }, { text: "Market turnover crosses 12 Billion." }];
            renderTickerItems(content, newsItems);
        }
    }

    function renderTickerItems(container, items) {
        if (!items || items.length === 0) return;
        domUtils.clearNode(container);
        const displayNews = [...items, ...items];
        displayNews.forEach(item => {
            const span = domUtils.createElement('span', {
                className: 'news-item',
                children: [
                    domUtils.createElement('i', { className: 'fas fa-bullhorn' }),
                    document.createTextNode(` ${item.text} `),
                    domUtils.createElement('span', { className: 'sep', textContent: '|' })
                ]
            });
            container.appendChild(span);
        });
    }

    function highlightActiveLink() {
        const currentFile = path.split("/").pop() || "index.html";
        const buttons = document.querySelectorAll(".sidebar .butt, .sidebar .but");
        buttons.forEach(btn => {
            // Check active based on some logic, but since we removed onclick, we just use a data attribute or similar
            // For now, we can check based on relative paths calculated earlier if we store them
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inject);
    } else {
        inject();
    }

    // Cleanup on unload
    window.addEventListener('unload', () => layoutController.abort());

})();
