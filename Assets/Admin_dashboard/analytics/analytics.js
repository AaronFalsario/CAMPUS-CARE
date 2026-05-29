import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Global variables
let allIncidents = [];
let filteredIncidents = [];
let currentFilter = 'all';
let currentPage = 1;
let rowsPerPage = 10;
let searchTerm = '';
let trendChart, categoryChart, priorityChart, statusChart;
let realtimeSubscription = null;
let activeToasts = [];

// ========== IMPROVED TOAST NOTIFICATION ==========
function showToast(message, type = 'success') {
    // Remove existing toasts
    activeToasts.forEach(toast => {
        if (toast && toast.parentNode) {
            if (toast.dataset.timeoutId) clearTimeout(parseInt(toast.dataset.timeoutId));
            toast.remove();
        }
    });
    activeToasts = [];
    
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 768;
    
    let icon = '';
    let bgColor = '';
    let borderColor = '';
    
    switch (type) {
        case 'success': icon = '✓'; bgColor = '#10B981'; borderColor = '#059669'; break;
        case 'error': icon = '✗'; bgColor = '#DC2626'; borderColor = '#991B1B'; break;
        case 'warning': icon = '⚠️'; bgColor = '#F59E0B'; borderColor = '#D97706'; break;
        case 'info': icon = 'ℹ️'; bgColor = '#3B82F6'; borderColor = '#2563EB'; break;
        case 'delete': icon = '🗑️'; bgColor = '#EF4444'; borderColor = '#B91C1C'; break;
        default: icon = '✓'; bgColor = '#10B981'; borderColor = '#059669';
    }
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 70px; left: 16px; right: 16px;' : 'bottom: 24px; right: 24px;'}
        background: ${bgColor};
        color: white;
        padding: ${isMobile ? '12px 16px' : '14px 20px'};
        border-radius: ${isMobile ? '12px' : '16px'};
        z-index: 10000;
        animation: toastSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        font-family: 'DM Sans', sans-serif;
        font-weight: 500;
        font-size: ${isMobile ? '13px' : '14px'};
        max-width: ${isMobile ? 'none' : '380px'};
        width: ${isMobile ? 'auto' : 'auto'};
        border-left: 4px solid ${borderColor};
        display: flex;
        align-items: center;
        gap: ${isMobile ? '10px' : '12px'};
        cursor: pointer;
        transition: transform 0.2s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: ${isMobile ? '28px' : '32px'}; height: ${isMobile ? '28px' : '32px'}; background: rgba(255,255,255,0.2); border-radius: 50%; font-size: ${isMobile ? '14px' : '18px'}; font-weight: bold; flex-shrink: 0;">
            ${icon}
        </div>
        <div style="flex: 1; line-height: 1.4; word-break: break-word;">
            ${message}
        </div>
        <button class="toast-close" style="background: none; border: none; color: white; cursor: pointer; font-size: ${isMobile ? '20px' : '18px'}; padding: ${isMobile ? '8px' : '4px'}; opacity: 0.7; flex-shrink: 0; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;">&times;</button>
    `;
    
    if (!isMobile) {
        toast.onmouseenter = () => { toast.style.transform = 'translateX(-6px)'; };
        toast.onmouseleave = () => { toast.style.transform = 'translateX(0)'; };
    }
    
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            toast.remove();
            const index = activeToasts.indexOf(toast);
            if (index > -1) activeToasts.splice(index, 1);
        };
    }
    
    toast.onclick = (e) => {
        if (e.target !== closeBtn) {
            toast.remove();
            const index = activeToasts.indexOf(toast);
            if (index > -1) activeToasts.splice(index, 1);
        }
    };
    
    document.body.appendChild(toast);
    activeToasts.push(toast);
    
    let duration = isMobile ? 3500 : 3000;
    if (type === 'delete') duration = isMobile ? 4500 : 4000;
    if (type === 'error') duration = isMobile ? 4500 : 4000;
    
    const timeoutId = setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
            const index = activeToasts.indexOf(toast);
            if (index > -1) activeToasts.splice(index, 1);
        }
    }, duration);
    
    toast.dataset.timeoutId = timeoutId;
}

// Add CSS animations for toast
if (!document.querySelector('#toast-animations')) {
    const toastStyle = document.createElement('style');
    toastStyle.id = 'toast-animations';
    toastStyle.textContent = `
        @keyframes toastSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(toastStyle);
}

// ========== LOAD INCIDENTS FROM SUPABASE ==========
async function loadIncidents() {
    try {
        const { data, error } = await supabase
            .from('incident')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allIncidents = (data || []).map(inc => ({
            id: inc.id,
            title: inc.title,
            name: inc.title,
            location: inc.location,
            category: inc.category || 'maintenance',
            priority: inc.priority || 'medium',
            status: inc.status || 'pending',
            reporter: inc.student_name || 'Student',
            student_id: inc.student_id_number,
            studentId: inc.student_id_number,
            description: inc.description,
            timestamp: inc.created_at,
            image_url: inc.image_url,
            is_anonymous: inc.is_anonymous,
            resolved_at: inc.resolved_at,
            updated_at: inc.updated_at
        }));
        
        console.log(`Loaded ${allIncidents.length} incidents from Supabase`);
        
        applyFilters();
        updateStats();
        updateCharts();
        renderTable();
        
    } catch (error) {
        console.error('Error loading incidents from Supabase:', error);
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('campus_care_reports');
    if (stored && stored !== '[]') {
        allIncidents = JSON.parse(stored);
        console.log(`Loaded ${allIncidents.length} incidents from localStorage (fallback)`);
    } else {
        allIncidents = [];
    }
    applyFilters();
    updateStats();
    updateCharts();
    renderTable();
}

// ========== REAL-TIME SUBSCRIPTION ==========
function setupRealtimeSubscription() {
    if (realtimeSubscription) return;
    
    console.log('Setting up real-time subscription for analytics...');
    
    realtimeSubscription = supabase
        .channel('analytics-realtime-channel')
        .on('postgres_changes', 
            { 
                event: '*',
                schema: 'public', 
                table: 'incident' 
            }, 
            async (payload) => {
                console.log('Analytics: Real-time change detected!', payload.eventType, payload.new?.id);
                await loadIncidents();
                
                if (payload.eventType === 'UPDATE') {
                    const oldStatus = payload.old?.status;
                    const newStatus = payload.new?.status;
                    if (oldStatus !== newStatus) {
                        showToast(`🔄 Status updated: ${oldStatus} → ${newStatus}`, 'info');
                    }
                } else if (payload.eventType === 'INSERT') {
                    showToast(`📝 New incident reported: ${payload.new?.title}`, 'success');
                } else if (payload.eventType === 'DELETE') {
                    showToast(`🗑️ Incident deleted`, 'info');
                }
            }
        )
        .subscribe((status) => {
            console.log('Analytics realtime subscription status:', status);
        });
    
    window.addEventListener('storage', (event) => {
        if (event.key === 'campus_care_reports') {
            console.log('localStorage change detected, reloading...');
            loadIncidents();
        }
    });
}

// ========== DARK MODE - COMPLETELY FIXED ==========
function initDarkMode() {
    const saved = localStorage.getItem('admin_dark_mode');
    const toggle = document.getElementById('darkModeToggle');
    
    // Apply dark mode based on saved preference or system preference
    if (saved === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeUI(true, toggle);
        updateChartColorsForDarkMode(true);
    } else if (saved === 'disabled') {
        document.body.classList.remove('dark-mode');
        updateDarkModeUI(false, toggle);
        updateChartColorsForDarkMode(false);
    } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-mode');
            updateDarkModeUI(true, toggle);
            localStorage.setItem('admin_dark_mode', 'enabled');
            updateChartColorsForDarkMode(true);
        } else {
            updateDarkModeUI(false, toggle);
        }
    }
    
    // Add click event to toggle button
    if (toggle) {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.body.classList.contains('dark-mode')) {
                // Switch to light mode
                document.body.classList.remove('dark-mode');
                localStorage.setItem('admin_dark_mode', 'disabled');
                updateDarkModeUI(false, newToggle);
                updateChartColorsForDarkMode(false);
                updateCharts();
                showToast('Light mode activated', 'success');
            } else {
                // Switch to dark mode
                document.body.classList.add('dark-mode');
                localStorage.setItem('admin_dark_mode', 'enabled');
                updateDarkModeUI(true, newToggle);
                updateChartColorsForDarkMode(true);
                updateCharts();
                showToast('Dark mode activated', 'success');
            }
        });
    }
    
    // Listen for storage changes (if dark mode changed in another tab)
    window.addEventListener('storage', (e) => {
        if (e.key === 'admin_dark_mode') {
            const isDark = e.newValue === 'enabled';
            if (isDark) {
                document.body.classList.add('dark-mode');
                updateChartColorsForDarkMode(true);
            } else {
                document.body.classList.remove('dark-mode');
                updateChartColorsForDarkMode(false);
            }
            updateCharts();
        }
    });
}

// Helper function to update dark mode UI elements
function updateDarkModeUI(isDark, toggleBtn) {
    if (!toggleBtn) return;
    
    const sunIcon = toggleBtn.querySelector('.sun-icon');
    const moonIcon = toggleBtn.querySelector('.moon-icon');
    
    if (sunIcon && moonIcon) {
        if (isDark) {
            // Dark mode active - show moon, hide sun
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            // Light mode active - show sun, hide moon
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}

// Update chart colors for dark mode
function updateChartColorsForDarkMode(isDark) {
    const textColor = isDark ? '#F1F5F9' : '#161513';
    const mutedColor = isDark ? '#94A3B8' : '#7A776F';
    const gridColor = isDark ? '#334155' : '#E4E1DB';
    
    // Update trend chart
    if (trendChart) {
        if (trendChart.options.plugins?.legend?.labels) {
            trendChart.options.plugins.legend.labels.color = textColor;
        }
        if (trendChart.options.scales?.y?.ticks) {
            trendChart.options.scales.y.ticks.color = mutedColor;
        }
        if (trendChart.options.scales?.x?.ticks) {
            trendChart.options.scales.x.ticks.color = mutedColor;
        }
        if (trendChart.options.scales?.y?.grid) {
            trendChart.options.scales.y.grid.color = gridColor;
        }
        if (trendChart.options.scales?.x?.grid) {
            trendChart.options.scales.x.grid.color = gridColor;
        }
        trendChart.update();
    }
    
    // Update category chart (doughnut)
    if (categoryChart) {
        if (categoryChart.options.plugins?.legend?.labels) {
            categoryChart.options.plugins.legend.labels.color = textColor;
        }
        categoryChart.update();
    }
    
    // Update resolution time chart (bar)
    if (priorityChart) {
        if (priorityChart.options.scales?.y?.ticks) {
            priorityChart.options.scales.y.ticks.color = mutedColor;
        }
        if (priorityChart.options.scales?.x?.ticks) {
            priorityChart.options.scales.x.ticks.color = textColor;
        }
        if (priorityChart.options.scales?.y?.grid) {
            priorityChart.options.scales.y.grid.color = gridColor;
        }
        if (priorityChart.options.scales?.y?.title) {
            priorityChart.options.scales.y.title.color = mutedColor;
        }
        priorityChart.update();
    }
    
    // Update status chart (pie)
    if (statusChart) {
        if (statusChart.options.plugins?.legend?.labels) {
            statusChart.options.plugins.legend.labels.color = textColor;
        }
        statusChart.update();
    }
}

function applyFilters() {
    let filtered = [...allIncidents];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(inc => inc.status === currentFilter);
    }
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(inc => 
            (inc.title || inc.name || '').toLowerCase().includes(term) ||
            (inc.reporter || '').toLowerCase().includes(term) ||
            (inc.studentId || inc.student_id || '').toString().includes(term)
        );
    }
    
    filteredIncidents = filtered;
    currentPage = 1;
}

function updateStats() {
    const total = allIncidents.length;
    const pending = allIncidents.filter(i => i.status === 'pending').length;
    const inProgress = allIncidents.filter(i => i.status === 'in-progress').length;
    const resolved = allIncidents.filter(i => i.status === 'resolved').length;
    
    const totalEl = document.getElementById('totalIncidents');
    const pendingEl = document.getElementById('pendingIncidents');
    const inProgressEl = document.getElementById('inProgressIncidents');
    const resolvedEl = document.getElementById('resolvedIncidents');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (resolvedEl) resolvedEl.textContent = resolved;
}

function updateCharts() {
    const categories = { security: 0, maintenance: 0, janitorial: 0, facilities: 0 };
    const statuses = { pending: 0, 'in-progress': 0, resolved: 0 };
    
    allIncidents.forEach(inc => {
        const cat = inc.category || 'maintenance';
        if (categories[cat] !== undefined) categories[cat]++;
        
        const stat = inc.status || 'pending';
        if (statuses[stat] !== undefined) statuses[stat]++;
    });
    
    const months = [];
    const trendData = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = month.toLocaleString('default', { month: 'short' });
        months.push(monthName);
        const count = allIncidents.filter(inc => {
            const incDate = new Date(inc.timestamp);
            return incDate.getMonth() === month.getMonth() && incDate.getFullYear() === month.getFullYear();
        }).length;
        trendData.push(count);
    }
    
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#F1F5F9' : '#161513';
    const mutedColor = isDark ? '#94A3B8' : '#7A776F';
    const gridColor = isDark ? '#334155' : '#E4E1DB';
    
    // Destroy existing charts
    if (trendChart) trendChart.destroy();
    if (categoryChart) categoryChart.destroy();
    if (priorityChart) priorityChart.destroy();
    if (statusChart) statusChart.destroy();
    
    // Create trend chart
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        trendChart = new Chart(ctxTrend.getContext('2d'), {
            type: 'line',
            data: { 
                labels: months, 
                datasets: [{ 
                    label: 'Incidents', 
                    data: trendData, 
                    borderColor: '#1D9E75', 
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(29,158,117,0.1)', 
                    tension: 0.3, 
                    fill: true,
                    pointBackgroundColor: '#1D9E75',
                    pointBorderColor: isDark ? '#1E293B' : '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        position: 'top',
                        labels: { color: textColor, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: mutedColor,
                        borderColor: gridColor,
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        ticks: { color: mutedColor, stepSize: 1 },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: mutedColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
    
    // Create category chart (doughnut)
    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory) {
        categoryChart = new Chart(ctxCategory.getContext('2d'), {
            type: 'doughnut',
            data: { 
                labels: ['Security', 'Maintenance', 'Janitorial', 'Facilities'], 
                datasets: [{ 
                    data: [categories.security, categories.maintenance, categories.janitorial, categories.facilities], 
                    backgroundColor: ['#DC2626', '#2563EB', '#1D9E75', '#D97706'],
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderWidth: 2
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { color: textColor, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: mutedColor
                    }
                }
            }
        });
    }

    // ========== RESOLUTION TIME CHART (replaces Priority Distribution) ==========
    // Calculate average days to resolve per category
    const resolutionByCategory = { security: [], maintenance: [], janitorial: [], facilities: [] };
    allIncidents.forEach(inc => {
        if (inc.status === 'resolved' && inc.resolved_at && inc.timestamp) {
            const cat = inc.category || 'maintenance';
            if (resolutionByCategory[cat] !== undefined) {
                const diffMs = new Date(inc.resolved_at) - new Date(inc.timestamp);
                const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
                resolutionByCategory[cat].push(diffDays);
            }
        }
    });
    const avgResolution = ['security', 'maintenance', 'janitorial', 'facilities'].map(cat => {
        const times = resolutionByCategory[cat];
        return times.length
            ? parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1))
            : 0;
    });

    const ctxPriority = document.getElementById('priorityChart');
    if (ctxPriority) {
        priorityChart = new Chart(ctxPriority.getContext('2d'), {
            type: 'bar',
            data: { 
                labels: ['Security', 'Maintenance', 'Janitorial', 'Facilities'], 
                datasets: [{ 
                    label: 'Avg Days to Resolve', 
                    data: avgResolution, 
                    backgroundColor: ['#DC2626', '#2563EB', '#1D9E75', '#D97706'], 
                    borderRadius: 8,
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: mutedColor,
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y} days avg`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: mutedColor },
                        grid: { color: gridColor },
                        title: {
                            display: true,
                            text: 'Days',
                            color: mutedColor,
                            font: { size: 11 }
                        }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    // Create status chart (pie)
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
        statusChart = new Chart(ctxStatus.getContext('2d'), {
            type: 'pie',
            data: { 
                labels: ['Pending', 'In Progress', 'Resolved'], 
                datasets: [{ 
                    data: [statuses.pending, statuses['in-progress'], statuses.resolved], 
                    backgroundColor: ['#F59E0B', '#2563EB', '#1D9E75'],
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderWidth: 2
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { color: textColor, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: mutedColor
                    }
                }
            }
        });
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredIncidents.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '</table><td colspan="7" style="text-align: center;">No incidents found</td></tr>';
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map(inc => `
        <tr>
            <td><strong>${escapeHtml(inc.title || inc.name)}</strong><br><span style="font-size: 11px; color: var(--muted);">${escapeHtml(inc.location || 'No location')}</span></td>
            <td><span class="badge b-${inc.category || 'maintenance'}">${inc.category || 'maintenance'}</span></td>
            <td><span class="badge b-${inc.status === 'in-progress' ? 'progress' : inc.status}">${inc.status || 'pending'}</span></td>
            <td>${escapeHtml(inc.reporter || 'Anonymous')}</td>
            <td>${inc.studentId || inc.student_id || 'N/A'}</td>
            <td>${getTimeAgo(inc.timestamp)}</td>
            <td><button class="view-btn" onclick="viewIncident(${inc.id})"><i class="fas fa-eye"></i> View</button></td>
        </tr>
    `).join('');
    
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredIncidents.length / rowsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
}

function handleSearch() {
    searchTerm = document.getElementById('searchInput').value;
    applyFilters();
    renderTable();
}

function setFilter(filter) {
    currentFilter = filter;
    const statusSelect = document.getElementById('statusFilter');
    if (statusSelect) {
        statusSelect.value = filter;
    }
    document.querySelectorAll('.filter-chip, .filter-option').forEach(btn => {
        btn.classList.remove('active');
    });
    applyFilters();
    renderTable();
}

function viewIncident(id) {
    const inc = allIncidents.find(i => i.id === id);
    if (!inc) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const modalLocation = document.getElementById('modalLocation');
    const modalCategory = document.getElementById('modalCategory');
    const modalPriority = document.getElementById('modalPriority');
    const modalStatus = document.getElementById('modalStatus');
    const modalReporter = document.getElementById('modalReporter');
    const modalStudentId = document.getElementById('modalStudentId');
    const modalDate = document.getElementById('modalDate');
    const modalDescription = document.getElementById('modalDescription');
    
    if (modalTitle) modalTitle.innerText = inc.title || inc.name;
    if (modalLocation) modalLocation.innerText = inc.location || 'Not specified';
    if (modalCategory) modalCategory.innerHTML = `<span class="badge b-${inc.category}">${inc.category}</span>`;
    if (modalPriority) modalPriority.innerHTML = `<span class="badge b-${inc.priority}">${inc.priority}</span>`;
    if (modalStatus) modalStatus.innerHTML = `<span class="badge b-${inc.status === 'in-progress' ? 'progress' : inc.status}">${inc.status}</span>`;
    if (modalReporter) modalReporter.innerText = inc.reporter || 'Anonymous';
    if (modalStudentId) modalStudentId.innerText = inc.studentId || inc.student_id || 'N/A';
    if (modalDate) modalDate.innerText = new Date(inc.timestamp).toLocaleString();
    if (modalDescription) modalDescription.innerText = inc.description || 'No description provided';
    
    const modal = document.getElementById('incidentModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function exportToCSV() {
    const headers = ['Title', 'Location', 'Category', 'Status', 'Reporter', 'Student ID', 'Date'];
    const rows = filteredIncidents.map(inc => [
        inc.title || inc.name,
        inc.location || '',
        inc.category || '',
        inc.status || '',
        inc.reporter || '',
        inc.studentId || inc.student_id || '',
        new Date(inc.timestamp).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campuscare_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
}

function getTimeAgo(date) {
    if (!date) return 'Unknown';
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'Just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function loadAdminProfile() {
    const stored = localStorage.getItem('currentAdmin');
    if (stored) {
        try {
            const admin = JSON.parse(stored);
            const adminName = admin.name || 'Administrator';
            
            const initials = adminName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .slice(0, 2);
            
            const drawerAvatar = document.querySelector('.drawer-avatar');
            if (drawerAvatar) {
                drawerAvatar.innerHTML = `<span style="font-size: 16px; font-weight: 600; color: white;">${initials}</span>`;
            }
            
            const drawerName = document.getElementById('drawerAdminName');
            if (drawerName) drawerName.textContent = adminName;
            
            const adminPill = document.getElementById('adminPill');
            if (adminPill) adminPill.textContent = adminName.split(' ')[0] || 'Admin';
            
            return admin;
        } catch(e) {
            console.error('Error loading admin:', e);
        }
    }
    
    const drawerAvatar = document.querySelector('.drawer-avatar');
    if (drawerAvatar) {
        drawerAvatar.innerHTML = `<span style="font-size: 16px; font-weight: 600; color: white;">AD</span>`;
    }
    return null;
}

function updateDrawerActiveState() {
    const currentPath = window.location.pathname;
    const drawerItems = document.querySelectorAll('.drawer-item');
    
    drawerItems.forEach(item => {
        const page = item.getAttribute('data-page');
        item.classList.remove('active');
        
        if (page === 'dashboard' && currentPath.includes('Admin.html')) {
            item.classList.add('active');
        } else if (page === 'incidents' && currentPath.includes('incident')) {
            item.classList.add('active');
        } else if (page === 'analytics' && currentPath.includes('analytics')) {
            item.classList.add('active');
        } else if (page === 'users' && currentPath.includes('user_page')) {
            item.classList.add('active');
        } else if (page === 'settings' && currentPath.includes('setting')) {
            item.classList.add('active');
        }
    });
}

function setupNavigation() {
    const dashboardBtn = document.querySelector('.drawer-item[data-page="dashboard"]');
    const incidentsBtn = document.querySelector('.drawer-item[data-page="incidents"]');
    const usersBtn = document.querySelector('.drawer-item[data-page="users"]');
    const analyticsBtn = document.querySelector('.drawer-item[data-page="analytics"]');
    const settingsBtn = document.querySelector('.drawer-item[data-page="settings"]');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (dashboardBtn) {
        const newBtn = dashboardBtn.cloneNode(true);
        dashboardBtn.parentNode.replaceChild(newBtn, dashboardBtn);
        newBtn.addEventListener('click', () => {
            window.location.href = '/Assets/Admin_dashboard/Admin.html';
        });
    }
    
    if (incidentsBtn) {
        const newBtn = incidentsBtn.cloneNode(true);
        incidentsBtn.parentNode.replaceChild(newBtn, incidentsBtn);
        newBtn.addEventListener('click', () => {
            window.location.href = '/Assets/Admin_dashboard/incident/incident.html';
        });
    }
    
    if (usersBtn) {
        const newBtn = usersBtn.cloneNode(true);
        usersBtn.parentNode.replaceChild(newBtn, usersBtn);
        newBtn.addEventListener('click', () => {
            window.location.href = '/Assets/Admin_dashboard/user_page/user.html';
        });
    }
    
    if (analyticsBtn) {
        const newBtn = analyticsBtn.cloneNode(true);
        analyticsBtn.parentNode.replaceChild(newBtn, analyticsBtn);
        newBtn.addEventListener('click', () => {
            window.location.href = '/Assets/Admin_dashboard/analytics/analytics.html';
        });
    }
    
    if (settingsBtn) {
        const newBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newBtn, settingsBtn);
        newBtn.addEventListener('click', () => {
            window.location.href = '/Assets/Admin_dashboard/settings/setting.html';
        });
    }
    
    // IMPROVED LOGOUT BUTTON
    if (logoutBtn) {
        const newLogout = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogout, logoutBtn);
        newLogout.addEventListener('click', async () => {
            const isMobile = window.innerWidth <= 768;
            
            const confirmModal = document.createElement('div');
            confirmModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(8px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeInModal 0.2s ease;
                padding: ${isMobile ? '16px' : '0'};
            `;
            
            confirmModal.innerHTML = `
                <div style="background: var(--surface); border-radius: ${isMobile ? '24px' : '28px'}; max-width: 400px; width: ${isMobile ? '100%' : '90%'}; padding: ${isMobile ? '24px' : '28px'}; text-align: center; border: 1px solid var(--border); animation: slideUpModal 0.3s ease;">
                    <div style="width: ${isMobile ? '56px' : '64px'}; height: ${isMobile ? '56px' : '64px'}; background: rgba(245, 158, 11, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto ${isMobile ? '16px' : '20px'};">
                        <svg width="${isMobile ? '28' : '32'}" height="${isMobile ? '28' : '32'}" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                    </div>
                    <h3 style="font-size: ${isMobile ? '20px' : '22px'}; font-weight: 700; color: var(--text); margin-bottom: ${isMobile ? '8px' : '12px'};">Logout?</h3>
                    <p style="font-size: ${isMobile ? '13px' : '14px'}; color: var(--muted); margin-bottom: ${isMobile ? '24px' : '28px'};">Are you sure you want to logout? You will need to login again to access your account.</p>
                    <div style="display: flex; gap: 12px; flex-direction: ${isMobile ? 'column' : 'row'};">
                        <button id="logoutCancelBtn" style="flex: 1; padding: ${isMobile ? '14px' : '12px'}; background: var(--bg); border: 1px solid var(--border); border-radius: 40px; font-size: ${isMobile ? '15px' : '14px'}; font-weight: 600; color: var(--text); cursor: pointer; min-height: 48px;">Cancel</button>
                        <button id="logoutConfirmBtn" style="flex: 1; padding: ${isMobile ? '14px' : '12px'}; background: #DC2626; border: none; border-radius: 40px; font-size: ${isMobile ? '15px' : '14px'}; font-weight: 600; color: white; cursor: pointer; min-height: 48px;">Logout</button>
                    </div>
                </div>
            `;
            
            // Add animations if not present
            if (!document.querySelector('#modal-animations')) {
                const style = document.createElement('style');
                style.id = 'modal-animations';
                style.textContent = `
                    @keyframes fadeInModal {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUpModal {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(confirmModal);
            document.body.style.overflow = 'hidden';
            
            const cleanup = () => {
                confirmModal.remove();
                document.body.style.overflow = '';
            };
            
            document.getElementById('logoutCancelBtn').onclick = () => {
                cleanup();
                showToast('Logout cancelled', 'info');
            };
            
            document.getElementById('logoutConfirmBtn').onclick = () => {
                cleanup();
                showToast('Logging out...', 'info');
                
                setTimeout(() => {
                    localStorage.removeItem('currentAdmin');
                    localStorage.removeItem('isAdminLoggedIn');
                    showToast('✓ Logged out successfully', 'success');
                    setTimeout(() => {
                        window.location.href = '/land.html';
                    }, 500);
                }, 500);
            };
        });
    }
    
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', () => {
            const page = newItem.getAttribute('data-page');
            if (page === 'dashboard') {
                window.location.href = '/Assets/Admin_dashboard/Admin.html';
            } else if (page === 'incidents') {
                window.location.href = '/Assets/Admin_dashboard/incident/incident.html';
            } else if (page === 'users') {
                window.location.href = '/Assets/Admin_dashboard/user_page/user.html';
            } else if (page === 'analytics') {
                window.location.href = '/Assets/Admin_dashboard/analytics/analytics.html';
            } else if (page === 'settings') {
                window.location.href = '/Assets/Admin_dashboard/settings/setting.html';
            }
        });
    });
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const currentAdmin = localStorage.getItem('currentAdmin');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !currentAdmin) {
        window.location.href = '/Assets/login/admin/admin.html';
        return false;
    }
    return true;
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    // Initialize dark mode first
    initDarkMode();
    
    await loadIncidents();
    setupRealtimeSubscription();
    setupNavigation();
    loadAdminProfile();
    updateDrawerActiveState();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    
    const exportTableBtn = document.getElementById('exportTableBtn');
    if (exportTableBtn) exportTableBtn.addEventListener('click', exportToCSV);
    
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportToCSV);
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
});

// Expose functions globally
window.goToPage = goToPage;
window.viewIncident = viewIncident;
window.closeModal = closeModal;