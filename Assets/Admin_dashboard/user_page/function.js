import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let students = [];
let currentAdmin = null;
let realtimeSubscription = null;
let activeToasts = [];

// ========== NOTIFICATION SYSTEM ==========
let notifications = [];
let notificationIdCounter = 0;
let isNotificationDropdownOpen = false;

// ========== LOAD ADMIN TO DRAWER ==========
function loadAdminToDrawer() {
    try {
        const storedAdmin = localStorage.getItem('currentAdmin');
        const isLoggedIn = localStorage.getItem('isAdminLoggedIn');

        if (!storedAdmin || isLoggedIn !== 'true') {
            window.location.href = '/Assets/login/admin/admin.html';
            return false;
        }

        currentAdmin = JSON.parse(storedAdmin);
        const adminName = currentAdmin.name || currentAdmin.email;
        const adminInitials = adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        const drawerName = document.querySelector('.drawer-name');
        const drawerRole = document.querySelector('.drawer-role');
        const drawerAvatar = document.querySelector('.drawer-avatar');
        const adminPill = document.getElementById('adminPill');

        if (drawerName) drawerName.textContent = adminName;
        if (drawerRole) drawerRole.textContent = currentAdmin.role || 'Campus Care Admin';
        if (adminPill) adminPill.textContent = adminName.split(' ')[0] || 'Admin';
        if (drawerAvatar) {
            drawerAvatar.innerHTML = `<span style="font-size: 16px; font-weight: 600; color: white;">${adminInitials}</span>`;
        }

        return true;
    } catch (error) {
        console.error('Error loading admin:', error);
        return false;
    }
}

// ========== DARK MODE ==========
function initDarkMode() {
    const savedMode = localStorage.getItem('admin_dark_mode');
    const toggle = document.getElementById('darkModeToggle');

    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (toggle) {
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        }
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('admin_dark_mode', isDark ? 'enabled' : 'disabled');
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon && moonIcon) {
                if (isDark) {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                } else {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                }
            }
        });
    }
}

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
    
    let icon = '';
    let bgColor = '';
    let borderColor = '';
    
    switch (type) {
        case 'success': 
            icon = '✓'; 
            bgColor = '#10B981'; 
            borderColor = '#059669'; 
            break;
        case 'error': 
            icon = '✗'; 
            bgColor = '#DC2626'; 
            borderColor = '#991B1B'; 
            break;
        case 'warning': 
            icon = '⚠️'; 
            bgColor = '#F59E0B'; 
            borderColor = '#D97706'; 
            break;
        case 'info': 
            icon = 'ℹ️'; 
            bgColor = '#3B82F6'; 
            borderColor = '#2563EB'; 
            break;
        case 'delete': 
            icon = '🗑️'; 
            bgColor = '#EF4444'; 
            borderColor = '#B91C1C'; 
            break;
        default: 
            icon = '✓'; 
            bgColor = '#10B981'; 
            borderColor = '#059669';
    }
    
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${bgColor};
        color: white;
        padding: 14px 20px;
        border-radius: 16px;
        z-index: 10000;
        animation: toastSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        font-family: 'DM Sans', sans-serif;
        font-weight: 500;
        font-size: 14px;
        max-width: 380px;
        min-width: 280px;
        border-left: 4px solid ${borderColor};
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: transform 0.2s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; font-size: 18px; font-weight: bold; flex-shrink: 0;">
            ${icon}
        </div>
        <div style="flex: 1; line-height: 1.4; word-break: break-word;">
            ${message}
        </div>
        <button class="toast-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 4px; opacity: 0.7; flex-shrink: 0;">&times;</button>
    `;
    
    // Hover effect
    toast.onmouseenter = () => {
        toast.style.transform = 'translateX(-6px)';
    };
    toast.onmouseleave = () => {
        toast.style.transform = 'translateX(0)';
    };
    
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            toast.remove();
            const index = activeToasts.indexOf(toast);
            if (index > -1) activeToasts.splice(index, 1);
        };
    }
    
    // Click anywhere to close
    toast.onclick = (e) => {
        if (e.target !== closeBtn) {
            toast.remove();
            const index = activeToasts.indexOf(toast);
            if (index > -1) activeToasts.splice(index, 1);
        }
    };
    
    document.body.appendChild(toast);
    activeToasts.push(toast);
    
    // Auto-remove after duration
    let duration = 3000;
    if (type === 'delete') duration = 4000;
    if (type === 'error') duration = 4000;
    
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
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
`;
if (!document.querySelector('#toast-animations')) {
    toastStyle.id = 'toast-animations';
    document.head.appendChild(toastStyle);
}

// ========== NOTIFICATION FUNCTIONS ==========
function loadNotifications() {
    const stored = localStorage.getItem('admin_notifications');
    if (stored) {
        try {
            notifications = JSON.parse(stored);
            notificationIdCounter = notifications.length > 0
                ? Math.max(...notifications.map(n => n.id)) + 1
                : 0;
        } catch (e) {
            notifications = [];
            notificationIdCounter = 0;
        }
    } else {
        notifications = [];
    }
    updateNotificationBadge();
    createNotificationDropdown();
    updateNotificationDropdown();
}

function saveNotifications() {
    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
}

function addInternalNotification(title, message, isUrgent = false) {
    const notification = {
        id: notificationIdCounter++,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        isUrgent
    };
    notifications.unshift(notification);
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    saveNotifications();
    updateNotificationDropdown();
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const urgentCount = notifications.filter(n => !n.read && n.isUrgent).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = urgentCount > 0 ? `🔥${unreadCount}` : (unreadCount > 9 ? '9+' : unreadCount);
            badge.style.display = 'flex';
            badge.style.background = urgentCount > 0 ? '#DC2626' : 'var(--red)';
            badge.style.animation = urgentCount > 0 ? 'pulse 0.5s ease infinite' : 'none';
        } else {
            badge.style.display = 'none';
        }
    }
}

function createNotificationDropdown() {
    let dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.remove();
    dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'notification-dropdown';
    document.body.appendChild(dropdown);
    return dropdown;
}

function updateNotificationDropdown() {
    let dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) dropdown = createNotificationDropdown();

    if (!notifications || notifications.length === 0) {
        dropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <span>🔔 Notifications</span>
                <button class="clear-all-dropdown" onclick="clearAllNotifications()">Clear all</button>
            </div>
            <div class="notification-dropdown-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No notifications yet</p>
                <p style="font-size: 11px; margin-top: 4px;">Student updates will appear here</p>
            </div>
        `;
        return;
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    dropdown.innerHTML = `
        <div class="notification-dropdown-header">
            <span>🔔 Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}</span>
            <button class="clear-all-dropdown" onclick="clearAllNotifications()">Clear all</button>
        </div>
        <div class="notification-dropdown-list">
            ${notifications.slice(0, 15).map(notif => `
                <div class="notification-dropdown-item ${!notif.read ? 'unread' : ''} ${notif.isUrgent ? 'urgent' : ''}"
                     onclick="markNotificationRead(${notif.id})">
                    <div class="notification-dropdown-title">${notif.isUrgent ? '🚨 ' : '📋 '}${escapeHtml(notif.title)}</div>
                    <div class="notification-dropdown-message">${escapeHtml(notif.message)}</div>
                    <div class="notification-dropdown-time">${getTimeAgo(notif.timestamp)}</div>
                </div>
            `).join('')}
        </div>
        ${notifications.length > 15
            ? `<div class="notification-dropdown-footer">${notifications.length - 15} more notifications</div>`
            : ''}
    `;
}

function toggleNotificationDropdown() {
    let dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) {
        dropdown = createNotificationDropdown();
        updateNotificationDropdown();
    }

    if (isNotificationDropdownOpen) {
        dropdown.classList.remove('show');
        isNotificationDropdownOpen = false;
        document.removeEventListener('click', closeNotificationDropdownOutside);
    } else {
        dropdown.classList.add('show');
        isNotificationDropdownOpen = true;
        setTimeout(() => {
            document.addEventListener('click', closeNotificationDropdownOutside);
        }, 100);
    }
}

function closeNotificationDropdownOutside(e) {
    const dropdown = document.getElementById('notificationDropdown');
    const bell = document.getElementById('notificationBell');
    if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
        dropdown.classList.remove('show');
        isNotificationDropdownOpen = false;
        document.removeEventListener('click', closeNotificationDropdownOutside);
    }
}

window.markNotificationRead = function (id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveNotifications();
        updateNotificationDropdown();
    }
};

window.clearAllNotifications = function () {
    notifications = [];
    saveNotifications();
    updateNotificationDropdown();
    showToast('All notifications cleared', 'success');
};

function getTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const h = Math.floor((Date.now() - date) / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ========== GET STUDENT REPORT COUNT ==========
async function getStudentReportCount(studentIdNumber) {
    try {
        const { count, error } = await supabase
            .from('incident')
            .select('*', { count: 'exact', head: true })
            .eq('student_id_number', studentIdNumber);

        if (error) return 0;
        return count || 0;
    } catch {
        return 0;
    }
}

// ========== LOAD STUDENTS FROM SUPABASE ==========
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('student')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            showToast('Failed to load students', 'error');
            return;
        }

        if (data && data.length > 0) {
            const studentsWithReports = await Promise.all(data.map(async (s) => {
                const reportCount = await getStudentReportCount(s.student_id);
                return {
                    id: s.id,
                    name: s.full_name || 'Unknown',
                    idNumber: s.student_id || 'N/A',
                    email: s.email || 'N/A',
                    reports: reportCount
                };
            }));
            students = studentsWithReports;
        } else {
            students = [];
        }

        renderStudents();
        updateStats();
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    }
}

// ========== UPDATE REPORT COUNTS ==========
async function updateAllReportCounts() {
    let hasChanges = false;
    for (const student of students) {
        const newCount = await getStudentReportCount(student.idNumber);
        if (student.reports !== newCount) {
            student.reports = newCount;
            hasChanges = true;
        }
    }
    if (hasChanges) {
        renderStudents();
        updateStats();
    }
}

// ========== REAL-TIME SUBSCRIPTION ==========
function setupRealtimeSubscription() {
    if (realtimeSubscription) return;

    realtimeSubscription = supabase
        .channel('student-management-changes')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'student' },
            async (payload) => {
                console.log('New student registered:', payload.new);
                addInternalNotification(
                    'New Student Registered',
                    `${payload.new.full_name} has created an account`,
                    false
                );
                showToast('📢 New student registered!', 'info');
                await loadStudents();
            }
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'incident' },
            () => updateAllReportCounts()
        )
        .subscribe();
}

// ========== RENDER STUDENTS TABLE ==========
function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:60px;">👨‍🎓 No students found</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr data-id="${student.id}">
            <td>
                <div class="student-info">
                    <div class="student-avatar">${getInitials(student.name)}</div>
                    <div>
                        <div class="student-name">${escapeHtml(student.name)}</div>
                        <div class="student-detail">${escapeHtml(student.email)}</div>
                    </div>
                </div>
            </td>
            <td><strong>${escapeHtml(student.idNumber)}</strong></td>
            <td><span class="badge-active">${student.reports || 0} reports</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn del delete-student" data-id="${student.id}" title="Delete Student">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.delete-student').forEach(btn => {
        btn.onclick = () => deleteStudent(btn.dataset.id);
    });
}

// ========== IMPROVED DELETE STUDENT ==========
async function deleteStudent(id) {
    const student = students.find(s => s.id == id);
    if (!student) return;
    
    // Create confirmation modal
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
    `;
    
    confirmModal.innerHTML = `
        <div style="background: var(--surface); border-radius: 28px; max-width: 400px; width: 90%; padding: 28px; text-align: center; border: 1px solid var(--border); animation: slideUpModal 0.3s ease;">
            <div style="width: 64px; height: 64px; background: rgba(220, 38, 38, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </div>
            <h3 style="font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px;">Delete Student?</h3>
            <p style="font-size: 14px; color: var(--muted); margin-bottom: 28px;">"<strong style="color: var(--text);">${escapeHtml(student.name)}</strong>" will be permanently deleted. This action cannot be undone.</p>
            <div style="display: flex; gap: 12px;">
                <button id="confirmCancelBtn" style="flex: 1; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 40px; font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer;">Cancel</button>
                <button id="confirmDeleteBtn" style="flex: 1; padding: 12px; background: #DC2626; border: none; border-radius: 40px; font-size: 14px; font-weight: 600; color: white; cursor: pointer;">Delete</button>
            </div>
        </div>
    `;
    
    // Add modal animations
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        @keyframes fadeInModal {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUpModal {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.querySelector('#modal-animations')) {
        modalStyle.id = 'modal-animations';
        document.head.appendChild(modalStyle);
    }
    
    document.body.appendChild(confirmModal);
    document.body.style.overflow = 'hidden';
    
    const cleanup = () => {
        confirmModal.remove();
        document.body.style.overflow = '';
    };
    
    document.getElementById('confirmCancelBtn').onclick = () => {
        cleanup();
        showToast('Deletion cancelled', 'info');
    };
    
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        cleanup();
        showToast(`Deleting "${student.name}"...`, 'info');
        
        try {
            const { error } = await supabase.from('student').delete().eq('id', id);
            if (error) throw error;
            
            showToast(`✓ "${student.name}" has been deleted`, 'delete');
            addInternalNotification('Student Deleted', `${student.name} has been removed`, false);
            
            students = students.filter(s => s.id != id);
            renderStudents();
            updateStats();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete student', 'error');
        }
    };
}

// ========== HELPER FUNCTIONS ==========
function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function updateStats() {
    const total = students.length;
    const totalReports = students.reduce((sum, s) => sum + (s.reports || 0), 0);
    const avgReports = total > 0 ? (totalReports / total).toFixed(1) : 0;

    const el = (id) => document.getElementById(id);
    if (el('totalStudents')) el('totalStudents').textContent = total;
    if (el('totalReports')) el('totalReports').textContent = totalReports;
    if (el('avgReports')) el('avgReports').textContent = avgReports;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== NAVIGATION SETUP ==========
function setupNavigation() {
    document.querySelectorAll('.drawer-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        newItem.addEventListener('click', function () {
            const page = this.dataset.page;
            document.getElementById('drawer')?.classList.remove('open');
            document.getElementById('overlay')?.classList.remove('open');
            navigateTo(page);
        });
    });
}

function setupBottomNav() {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        newItem.addEventListener('click', () => navigateTo(newItem.dataset.page));
    });
}

function navigateTo(page) {
    const routes = {
        dashboard: '/Assets/Admin_dashboard/Admin.html',
        incidents: '/Assets/Admin_dashboard/incident/incident.html',
        users:     '/Assets/Admin_dashboard/user_page/user.html',
        analytics: '/Assets/Admin_dashboard/analytics/analytics.html',
        settings:  '/Assets/Admin_dashboard/settings/setting.html'
    };
    if (routes[page]) window.location.href = routes[page];
}

function highlightActiveBottomNav() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const page = item.dataset.page;
        item.classList.remove('active');
        if (
            (page === 'dashboard' && (currentPath.includes('Admin.html') || currentPath === '/')) ||
            (page === 'incidents' && currentPath.includes('incident')) ||
            (page === 'users' && currentPath.includes('user_page')) ||
            (page === 'analytics' && currentPath.includes('analytics')) ||
            (page === 'settings' && currentPath.includes('setting'))
        ) {
            item.classList.add('active');
        }
    });
}

// ========== UI SETUP ==========
function setupUI() { 
    const drawer  = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const adminPill = document.getElementById('adminPill');
    const notificationBell = document.getElementById('notificationBell');

    if (overlay) overlay.onclick = () => { drawer?.classList.remove('open'); overlay.classList.remove('open'); };
    if (adminPill) adminPill.onclick = () => { drawer?.classList.toggle('open'); overlay?.classList.toggle('open'); };
    if (notificationBell) notificationBell.onclick = (e) => { e.stopPropagation(); toggleNotificationDropdown(); };

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener('click', () => {

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
        `;
        
        confirmModal.innerHTML = `
            <div style="background: var(--surface); border-radius: 28px; max-width: 400px; width: 90%; padding: 28px; text-align: center; border: 1px solid var(--border); animation: slideUpModal 0.3s ease;">
                <div style="width: 64px; height: 64px; background: rgba(220, 38, 38, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </div>
                <h3 style="font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px;">Logout?</h3>
                <p style="font-size: 14px; color: var(--muted); margin-bottom: 28px;">Are you sure you want to logout? You will need to login again to access your account.</p>
                <div style="display: flex; gap: 12px;">
                    <button id="logoutCancelBtn" style="flex: 1; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 40px; font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer;">Cancel</button>
                    <button id="logoutConfirmBtn" style="flex: 1; padding: 12px; background: #DC2626; border: none; border-radius: 40px; font-size: 14px; font-weight: 600; color: white; cursor: pointer;">Logout</button>
                </div>
            </div>
        `;
        
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
                localStorage.removeItem('currentStudent');
                localStorage.removeItem('currentAdmin');
                localStorage.removeItem('isAdminLoggedIn');
                showToast('✓ Logged out successfully', 'success');
                setTimeout(() => window.location.href = '/land.html', 500);
            }, 500);
        };
    });
}
}   

// ========== AUTO REFRESH EVERY 30 SECONDS ==========
setInterval(() => {
    updateAllReportCounts();
}, 30000);

// ========== INITIALIZATION ==========
async function init() {
    console.log('Initializing Student Management...');
    loadAdminToDrawer();
    loadNotifications();
    initDarkMode();
    await loadStudents();
    setupRealtimeSubscription();
    setupNavigation();
    setupBottomNav();
    setupUI();
    highlightActiveBottomNav();
}

init();