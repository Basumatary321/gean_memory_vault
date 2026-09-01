 /* =======================================================
   NEXUS MEMORY - DYNAMIC RELATIVE DATE & STATS ENGINE
   ======================================================= */

const STATE = {
  currentCategoryFilter: 'All',
  currentTagFilter: null,
  searchQuery: '',
  calendarCurrentDate: new Date(),
  isDarkMode: true
};

document.addEventListener('DOMContentLoaded', () => {
  renderGreeting();
  syncCardsFromHTML();
  renderCalendar();
  setupEventListeners();
  refreshIcons();

  // Auto-refresh relative time labels every 60 seconds
  setInterval(updateAllDateLabels, 60000);
});

/* =======================================================
   AUTOMATIC HTML PARSING, DATES & STATS CALCULATION
   ======================================================= */

function syncCardsFromHTML() {
  const cards = document.querySelectorAll('#cardsGrid .memory-card');
  const tagCounts = {};
  const categories = new Set();
  let totalCards = cards.length;
  let favoritesCount = 0;
  let thisWeekCount = 0;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 3600 * 1000;

  cards.forEach(card => {
    // 1. Categories
    const category = card.getAttribute('data-category');
    if (category) categories.add(category);

    // 2. Star Status
    const isStarred = card.getAttribute('data-starred') === 'true';
    const starBtn = card.querySelector('.star-btn');
    if (starBtn) {
      starBtn.classList.toggle('starred', isStarred);
    }
    if (isStarred) favoritesCount++;

    // 3. Real Dynamic Time Ago Calculation
    const rawDate = card.getAttribute('data-date');
    const dateLabel = card.querySelector('.card-date-label');
    
    if (rawDate) {
      const cardDate = new Date(rawDate);
      const cardTime = cardDate.getTime();
      
      if (!isNaN(cardTime)) {
        if (cardTime >= oneWeekAgo) thisWeekCount++;
        
        // Calculate & display dynamic relative time
        if (dateLabel) {
          dateLabel.innerText = formatTimeAgo(cardTime, now);
          dateLabel.setAttribute('title', cardDate.toLocaleString()); // tooltip with exact full date
        }
      }
    }

    // 4. Tags Extraction
    card.querySelectorAll('.tag-chip').forEach(chip => {
      const tag = chip.innerText.trim();
      if (tag) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  // Update Metric UI
  document.getElementById('statTotalMemories').innerText = totalCards;
  document.getElementById('statFavorites').innerText = favoritesCount;
  document.getElementById('statCategories').innerText = categories.size;
  document.getElementById('statWeekMemories').innerText = thisWeekCount;
  document.getElementById('welcomeSub').innerText = `You have ${totalCards} memories across ${categories.size} categories.`;

  // Populate Sidebar Tags
  renderDynamicTags(tagCounts);
}

// Background updater for date labels
function updateAllDateLabels() {
  const now = Date.now();
  document.querySelectorAll('#cardsGrid .memory-card').forEach(card => {
    const rawDate = card.getAttribute('data-date');
    const dateLabel = card.querySelector('.card-date-label');
    if (rawDate && dateLabel) {
      const cardTime = new Date(rawDate).getTime();
      if (!isNaN(cardTime)) {
        dateLabel.innerText = formatTimeAgo(cardTime, now);
      }
    }
  });
}

/**
 * Computes: (Current Date) - (Card Date) = relative time ago
 */
function formatTimeAgo(pastTimeMs, currentTimeMs = Date.now()) {
  const diffInSeconds = Math.floor((currentTimeMs - pastTimeMs) / 1000);

  if (diffInSeconds < 0) return 'Just now'; // Handles future/sync edge cases
  if (diffInSeconds < 60) return 'Just now';
  
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function renderDynamicTags(tagCounts) {
  const container = document.getElementById('tagListContainer');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(tagCounts).forEach(([tag, count]) => {
    const item = document.createElement('div');
    item.className = `tag-item ${STATE.currentTagFilter === tag ? 'active' : ''}`;
    item.innerHTML = `
      <div class="tag-label"><span class="hash">#</span> ${escapeHtml(tag)}</div>
      <span class="tag-count">${count}</span>
    `;
    item.addEventListener('click', () => {
      STATE.currentTagFilter = STATE.currentTagFilter === tag ? null : tag;
      renderDynamicTags(tagCounts);
      filterCards();
      closeDrawers();
    });
    container.appendChild(item);
  });
}

function filterCards() {
  const cards = document.querySelectorAll('#cardsGrid .memory-card');
  const query = STATE.searchQuery.toLowerCase().trim();
  let visibleCount = 0;

  cards.forEach(card => {
    const category = card.getAttribute('data-category');
    const title = (card.querySelector('.card-title')?.innerText || '').toLowerCase();
    const desc = (card.querySelector('.card-description')?.innerText || '').toLowerCase();
    const allText = card.innerText.toLowerCase();

    const cardTags = Array.from(card.querySelectorAll('.tag-chip')).map(el => el.innerText.trim());

    const categoryMatch = STATE.currentCategoryFilter === 'All' || category === STATE.currentCategoryFilter;
    const tagMatch = !STATE.currentTagFilter || cardTags.includes(STATE.currentTagFilter);
    const searchMatch = !query || title.includes(query) || desc.includes(query) || allText.includes(query);

    if (categoryMatch && tagMatch && searchMatch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  let noMsg = document.getElementById('noResultsMessage');
  if (visibleCount === 0) {
    if (!noMsg) {
      noMsg = document.createElement('div');
      noMsg.id = 'noResultsMessage';
      noMsg.className = 'no-results-msg';
      noMsg.innerHTML = '<p>No memories match your search query or active filter.</p>';
      document.getElementById('cardsGrid').appendChild(noMsg);
    }
  } else if (noMsg) {
    noMsg.remove();
  }
}

/* =======================================================
   CALENDAR & GREETING
   ======================================================= */

function renderGreeting() {
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 18) greeting = 'Good afternoon';
  else if (currentHour >= 18) greeting = 'Good evening';

  document.getElementById('welcomeTitle').innerText = `${greeting}, ! 👋`;
}

function renderCalendar() {
  const grid = document.getElementById('calendarDaysGrid');
  const label = document.getElementById('calMonthYearLabel');
  if (!grid || !label) return;
  
  const current = STATE.calendarCurrentDate;
  const year = current.getFullYear();
  const month = current.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  label.innerText = `${monthNames[month]} ${year}`;

  grid.innerHTML = `
    <div class="cal-day-name">Su</div>
    <div class="cal-day-name">Mo</div>
    <div class="cal-day-name">Tu</div>
    <div class="cal-day-name">We</div>
    <div class="cal-day-name">Th</div>
    <div class="cal-day-name">Fr</div>
    <div class="cal-day-name">Sa</div>
  `;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let i = firstDayIndex; i > 0; i--) {
    const day = prevMonthDays - i + 1;
    const cell = document.createElement('div');
    cell.className = 'cal-cell other-month';
    cell.innerText = day;
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (isCurrentMonth && today.getDate() === day) {
      cell.classList.add('active');
    }
    cell.innerText = day;
    cell.addEventListener('click', () => {
      grid.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('active'));
      cell.classList.add('active');
      showToast(`Selected date: ${monthNames[month]} ${day}, ${year}`);
    });
    grid.appendChild(cell);
  }

  const totalRendered = firstDayIndex + daysInMonth;
  const remaining = (7 - (totalRendered % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell other-month';
    cell.innerText = day;
    grid.appendChild(cell);
  }
}

/* =======================================================
   EVENT LISTENERS
   ======================================================= */

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', (e) => {
    STATE.searchQuery = e.target.value;
    filterCards();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileRightPanelBtn = document.getElementById('mobileRightPanelBtn');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const closeRightPanelBtn = document.getElementById('closeRightPanelBtn');

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => openLeftSidebar());
  if (mobileRightPanelBtn) mobileRightPanelBtn.addEventListener('click', () => openRightPanel());
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => closeDrawers());
  if (closeRightPanelBtn) closeRightPanelBtn.addEventListener('click', () => closeDrawers());
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => closeDrawers());

  // Filter Pills
  document.querySelectorAll('#filterPillsContainer .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#filterPillsContainer .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      STATE.currentCategoryFilter = pill.dataset.filter;
      
      document.querySelectorAll('#sidebarNav .nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.filter === STATE.currentCategoryFilter);
      });

      filterCards();
    });
  });

  // Sidebar Nav Items
  document.querySelectorAll('#sidebarNav .nav-item').forEach(nav => {
    nav.addEventListener('click', () => {
      document.querySelectorAll('#sidebarNav .nav-item').forEach(n => n.classList.remove('active'));
      nav.classList.add('active');
      STATE.currentCategoryFilter = nav.dataset.filter;

      document.querySelectorAll('#filterPillsContainer .pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.filter === STATE.currentCategoryFilter);
      });

      filterCards();
      closeDrawers();
    });
  });

  // Reset Filters
  document.getElementById('resetFilterLink').addEventListener('click', (e) => {
    e.preventDefault();
    STATE.currentCategoryFilter = 'All';
    STATE.currentTagFilter = null;
    STATE.searchQuery = '';
    searchInput.value = '';
    
    document.querySelectorAll('#filterPillsContainer .pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'All'));
    document.querySelectorAll('#sidebarNav .nav-item').forEach(p => p.classList.toggle('active', p.dataset.filter === 'All'));
    document.querySelectorAll('#tagListContainer .tag-item').forEach(t => t.classList.remove('active'));
    filterCards();
  });

  // Favorite Star Toggle
  document.getElementById('cardsGrid').addEventListener('click', (e) => {
    const starBtn = e.target.closest('.star-btn');
    if (starBtn) {
      const card = starBtn.closest('.memory-card');
      const isStarred = card.getAttribute('data-starred') === 'true';
      const newState = !isStarred;

      card.setAttribute('data-starred', newState ? 'true' : 'false');
      starBtn.classList.toggle('starred', newState);

      syncCardsFromHTML();
      showToast(newState ? 'Added to favorites!' : 'Removed from favorites.');
    }

    const tagChip = e.target.closest('.tag-chip');
    if (tagChip) {
      const tag = tagChip.innerText.trim();
      STATE.currentTagFilter = STATE.currentTagFilter === tag ? null : tag;
      
      document.querySelectorAll('#tagListContainer .tag-item').forEach(item => {
        const itemText = item.querySelector('.tag-label').innerText.replace('#', '').trim();
        item.classList.toggle('active', itemText === STATE.currentTagFilter);
      });

      filterCards();
    }
  });

  // Calendar Controls
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      STATE.calendarCurrentDate.setMonth(STATE.calendarCurrentDate.getMonth() - 1);
      renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
      STATE.calendarCurrentDate.setMonth(STATE.calendarCurrentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    STATE.isDarkMode = !STATE.isDarkMode;
    document.body.classList.toggle('light-theme', !STATE.isDarkMode);
    const icon = document.getElementById('themeIcon');
    icon.setAttribute('data-lucide', STATE.isDarkMode ? 'sun' : 'moon');
    refreshIcons();
    showToast(`Switched to ${STATE.isDarkMode ? 'Dark' : 'Light'} theme.`);
  });

  // Notifications
  document.getElementById('notifBtn').addEventListener('click', () => {
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.style.display = 'none';
      showToast('All notifications marked as read.');
    }
  });

  // Share Vault Link
  document.getElementById('syncBtn').addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Vault link copied to clipboard!');
  });
}

/* =======================================================
   DRAWER CONTROLS & HELPERS
   ======================================================= */

function openLeftSidebar() {
  closeDrawers();
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('active');
}

function openRightPanel() {
  closeDrawers();
  document.getElementById('rightPanel').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('active');
}

function closeDrawers() {
  const sidebar = document.getElementById('sidebar');
  const rightPanel = document.getElementById('rightPanel');
  const backdrop = document.getElementById('drawerBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (rightPanel) rightPanel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i data-lucide="info" style="width: 14px; height: 14px; color: #60a5fa;"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}