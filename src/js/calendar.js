document.addEventListener('DOMContentLoaded', () => {
    // Nepal Market Calendar Data (2081/82 BS -> 2025/26 AD)
    const holidays = [
        { date: '2026-01-14', name: 'Maghe Sankranti', type: 'holiday' },
        { date: '2026-01-19', name: 'Sonam Lhosar', type: 'holiday' },
        { date: '2026-01-30', name: 'Martyrs Day', type: 'holiday' },
        { date: '2026-02-15', name: 'Mahashiva Ratri', type: 'holiday' },
        { date: '2026-02-18', name: 'Gyalpo Lhosar', type: 'holiday' },
        { date: '2026-02-19', name: 'Prajatantra Diwas', type: 'holiday' },
        { date: '2026-03-02', name: 'Fagu Purnima (Holi)', type: 'holiday' },
        { date: '2026-03-08', name: 'International Woman Day', type: 'holiday' },
        { date: '2026-03-18', name: 'Ghode Jatra', type: 'holiday' },
        { date: '2026-03-27', name: 'Ram Nawami', type: 'holiday' },
        { date: '2026-04-14', name: 'Nepali New Year 2083', type: 'holiday' }
    ];

    // Check if Weekend (Friday and Saturday are holidays in Nepal)
    const isWeekend = (day, month, year) => {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
    };

    // Current View
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // DOM Elements
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    const eventsList = document.getElementById('events-list');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('btn-today');

    // Month Names
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Day Names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get Event for Date
    const getEventForDate = (dateStr) => {
        return holidays.find(h => h.date === dateStr);
    };

    // Render Calendar
    const renderCalendar = () => {
        domUtils.clearNode(calendarGrid);

        // Day Headers
        dayNames.forEach(day => {
            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // First day of month
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day other-month';
            dayEl.textContent = daysInPrevMonth - i;
            calendarGrid.appendChild(dayEl);
        }

        // Current month days
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            dayEl.textContent = i;

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const event = getEventForDate(dateStr);

            // Today
            if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                dayEl.classList.add('today');
            }

            // Weekend (Saturday)
            if (isWeekend(i, currentMonth, currentYear)) {
                dayEl.classList.add('weekend');
            }

            // Holiday
            if (event) {
                dayEl.classList.add(event.type);
                dayEl.title = event.name;
            }

            calendarGrid.appendChild(dayEl);
        }

        // Next month days (fill remaining)
        const totalCells = calendarGrid.children.length;
        const remaining = 42 - totalCells; // 6 rows x 7 days
        for (let i = 1; i <= remaining; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day other-month';
            dayEl.textContent = i;
            calendarGrid.appendChild(dayEl);
        }

        // Update Header
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Render Upcoming Events
        renderEvents();
    };

    // Render Upcoming Events
    const renderEvents = () => {
        domUtils.clearNode(eventsList);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = holidays
            .filter(h => new Date(h.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);

        if (upcoming.length === 0) {
            eventsList.appendChild(domUtils.createElement('li', {
                styles: { color: 'var(--text-muted)' },
                textContent: 'No upcoming events'
            }));
            return;
        }

        upcoming.forEach(event => {
            const eventDate = new Date(event.date);
            const day = eventDate.getDate();
            const month = monthNames[eventDate.getMonth()].substring(0, 3);

            const li = domUtils.createElement('li', {
                children: [
                    domUtils.createElement('div', { className: 'event-date', textContent: `${day} ${month}` }),
                    domUtils.createElement('div', {
                        className: 'event-info',
                        children: [
                            domUtils.createElement('div', { className: 'event-title', textContent: event.name }),
                            domUtils.createElement('div', { className: 'event-type', textContent: event.type === 'holiday' ? 'Market Holiday' : event.type })
                        ]
                    })
                ]
            });
            eventsList.appendChild(li);
        });
    };

    // Navigation
    prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    todayBtn.addEventListener('click', () => {
        const now = new Date();
        currentMonth = now.getMonth();
        currentYear = now.getFullYear();
        renderCalendar();
        
        // Use timeout to ensure DOM is rendered before scrolling
        setTimeout(scrollToToday, 100);
    });

    const scrollToToday = () => {
        const todayEl = document.querySelector('.day.today');
        if (todayEl) {
            todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Initial Render
    renderCalendar();
    
    // Auto-scroll to today
    setTimeout(scrollToToday, 500);
});
