import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const STORAGE_KEY = 'campus_care_reports';
let currentStudent = null;
let currentFilter = 'all';
let allIncidents = [];
let viewMode = 'all';
let refreshInterval = null;
let realtimeSubscription = null;
let isLoading = false;
let notificationSubscription = null;
let processedReportIds = new Set();
let updateTimeout = null;
let realtimeIncidentSubscription = null;

const SENSITIVE_CATEGORIES = ['weapon', 'violence', 'threat', 'danger', 'security', 'harassment', 'bullying', 'gun', 'firearm', 'knife', 'assault'];
const SECURITY_KEYWORDS = ['gun', 'firearm', 'weapon', 'knife', 'blade', 'shooting', 'threat', 'danger', 'violence'];

const FIRE_KEYWORDS = [
    'fire', 'smoke', 'burning', 'flame', 'blaze', 'combustion',
    'ignite', 'burn', 'smoldering', 'fire alarm', 'fire suppression',
    'extinguisher', 'fire drill', 'evacuation', 'emergency fire',
    'wildfire', 'electrical fire', 'kitchen fire', 'gas fire'
];

function isFireRelated(report) {
    if (!report) return false;
    const titleLower = (report.title || report.name || '').toLowerCase();
    const descriptionLower = (report.description || '').toLowerCase();
    const categoryLower = (report.category || '').toLowerCase();
    const hasFireKeyword = FIRE_KEYWORDS.some(keyword =>
        titleLower.includes(keyword) || descriptionLower.includes(keyword)
    );
    const isSecurityCategory = categoryLower === 'security';
    const isHighPriority = report.priority === 'high';
    return hasFireKeyword || (isSecurityCategory && isHighPriority && hasFireKeyword);
}

function isSecuritySensitive(incident) {
    if (!incident) return false;
    if (incident.category && SENSITIVE_CATEGORIES.includes(incident.category.toLowerCase())) return true;
    if (incident.name) {
        const titleLower = incident.name.toLowerCase();
        if (SECURITY_KEYWORDS.some(keyword => titleLower.includes(keyword))) return true;
    }
    if (incident.description) {
        const descLower = incident.description.toLowerCase();
        if (SECURITY_KEYWORDS.some(keyword => descLower.includes(keyword))) return true;
    }
    return false;
}

function getSafeReporterName(incident, isYourReport) {
    if (isYourReport) {
        if (incident.is_anonymous === 'true') return 'Anonymous Reporter';
        return incident.reporter || 'You';
    }
    if (isSecuritySensitive(incident)) return '🔒 Confidential Reporter';
    if (incident.is_anonymous === 'true') return 'Anonymous Reporter';
    return incident.reporter || 'Another Student';
}

function getSafeDescription(incident, isYourReport, canSeeDetails) {
    if (isYourReport || canSeeDetails) return incident.description || 'No description provided';
    if (isSecuritySensitive(incident)) return '🔒 This report contains sensitive security information and has been restricted.';
    return incident.description || 'No description provided';
}

// ========== TRANSLATIONS ==========
const translations = {
    en: {
        'dashboard': 'Dashboard', 'report': 'New Report', 'settings': 'Settings',
        'home': 'Home', 'logout': 'Logout', 'your reports': 'Your Reports',
        'in progress': 'In Progress', 'resolved': 'Resolved',
        'total campus reports': 'Total Campus Reports', 'all reports': 'All Reports',
        'security': 'Security', 'maintenance': 'Maintenance',
        'janitorial': 'Janitorial', 'facilities': 'Facilities',
        'view my reports': 'My Reports', 'your report': 'Your Report',
        'by': 'By', 'sensitive report': '🔒 Sensitive report - details restricted to security personnel',
        'reported by you': 'Reported by you', 'reported by': 'Reported by',
        'restricted': '🔒 Restricted', 'confidential reporter': '🔒 Confidential Reporter',
        'incident details': 'Incident Details', 'title': 'Title',
        'location': 'Location', 'category': 'Category', 'priority': 'Priority',
        'status': 'Status', 'description': 'Description', 'date': 'Date',
        'close': 'Close', 'security restriction': '⚠️ Security Restriction',
        'security message': 'This report contains sensitive safety information. Campus security has been notified and is handling the situation.',
        'confidential': '🔒 Confidential - Reporter Identity Protected',
        'you': 'You', 'another student': 'Another Student',
        'pending': 'Pending', 'high': 'High', 'medium': 'Medium', 'low': 'Low',
        'security cat': 'Security', 'maintenance cat': 'Maintenance',
        'janitorial cat': 'Janitorial', 'facilities cat': 'Facilities',
        'no reports yet': 'No reports yet',
        'click new report': 'Click the "New Report" button to submit your first incident report',
        'no incidents reported': 'No incidents reported yet',
        'be first to report': 'Be the first to report an incident!',
        'new report update': 'New Report Update',
        'new reports added': 'new report has been added to your reports',
        'new reports added plural': 'new reports have been added to your reports',
        'report status update': 'Report Status Update',
        'being processed': 'Your report is now being processed',
        'has been resolved': 'Your report has been resolved!',
        'pending review': 'Your report is pending review',
        'welcome back': 'Welcome back', 'logged out': 'Logged out successfully',
        'profile updated': 'Profile picture updated successfully!',
        'invalid image': 'Please select a valid image file (JPEG, PNG)',
        'confirm logout': 'Are you sure you want to logout?',
        'no notifications': 'No notifications yet', 'clear all': 'Clear all',
        'notifications cleared': 'All notifications cleared',
        'dark mode enabled': 'Dark mode enabled 🌙',
        'light mode enabled': 'Light mode enabled ☀️',
        'notifications': 'Notifications',
        'reporter': 'Reporter',
        'anonymous': 'Anonymous', 'image': 'Attached Image',
        'no image': 'No image attached', 'submitted by': 'Submitted by',
        'report id': 'Report ID', 'in progress stat': 'In Progress'
    },
    tl: {
        'dashboard': 'Dashboard', 'report': 'Bagong Ulat', 'settings': 'Mga Setting',
        'home': 'Bahay', 'logout': 'Mag-logout', 'your reports': 'Iyong mga Ulat',
        'in progress': 'Isinasagawa', 'resolved': 'Naresolba',
        'total campus reports': 'Kabuuang Ulat sa Campus', 'all reports': 'Lahat ng Ulat',
        'security': 'Seguridad', 'maintenance': 'Pagpapanatili',
        'janitorial': 'Paglilinis', 'facilities': 'Pasilidad',
        'view my reports': 'Tingnan ang Aking mga Ulat', 'your report': 'Iyong Ulat',
        'by': 'Ni', 'sensitive report': '🔒 Sensitibong ulat - ang mga detalye ay para lamang sa seguridad',
        'reported by you': 'Ulat mo', 'reported by': 'Ulat ni',
        'restricted': '🔒 Limitado', 'confidential reporter': '🔒 Kumpidensyal na Reporter',
        'incident details': 'Detalye ng Insidente', 'title': 'Pamagat',
        'location': 'Lokasyon', 'category': 'Kategorya', 'priority': 'Priyoridad',
        'status': 'Status', 'description': 'Paglalarawan', 'date': 'Petsa',
        'close': 'Isara', 'security restriction': '⚠️ Restriksyon sa Seguridad',
        'security message': 'Ang ulat na ito ay naglalaman ng sensitibong impormasyon.',
        'confidential': '🔒 Kumpidensyal - Protektado ang Pagkakakilanlan',
        'you': 'Ikaw', 'another student': 'Ibang Mag-aaral',
        'pending': 'Nakabinbin', 'high': 'Mataas', 'medium': 'Katamtaman', 'low': 'Mababa',
        'security cat': 'Seguridad', 'maintenance cat': 'Pagpapanatili',
        'janitorial cat': 'Paglilinis', 'facilities cat': 'Pasilidad',
        'no reports yet': 'Wala pang ulat',
        'click new report': 'I-click ang "Bagong Ulat" para magsumite ng iyong unang ulat',
        'no incidents reported': 'Wala pang naiulat na insidente',
        'be first to report': 'Maging una upang mag-ulat ng insidente!',
        'new report update': 'Bagong Update sa Ulat',
        'new reports added': 'bagong ulat ay naidagdag sa iyong mga ulat',
        'new reports added plural': 'bagong mga ulat ay naidagdag sa iyong mga ulat',
        'report status update': 'Update sa Status ng Ulat',
        'being processed': 'Ang iyong ulat ay kasalukuyang pinoproseso',
        'has been resolved': 'Ang iyong ulat ay naresolba na!',
        'pending review': 'Ang iyong ulat ay naghihintay ng pagsusuri',
        'welcome back': 'Maligayang pagbabalik', 'logged out': 'Matagumpay na naka-logout',
        'profile updated': 'Matagumpay na na-update ang larawan ng profile!',
        'invalid image': 'Mangyaring pumili ng wastong larawan (JPEG, PNG)',
        'confirm logout': 'Sigurado ka bang gusto mong mag-logout?',
        'no notifications': 'Wala pang abiso', 'clear all': 'Linisin lahat',
        'notifications cleared': 'Linisin lahat ng abiso',
        'dark mode enabled': 'Pinagana ang madilim na mode 🌙',
        'light mode enabled': 'Pinagana ang maliwanag na mode ☀️',
        'notifications': 'Mga Abiso',
        'reporter': 'Reporter',
        'anonymous': 'Anonymous', 'image': 'Nakalakip na Larawan',
        'no image': 'Walang nakalakip na larawan', 'submitted by': 'Isinumite ni',
        'report id': 'ID ng Ulat', 'in progress stat': 'Isinasagawa'
    }
};

let currentLanguage = 'en';
function t(key) { return translations[currentLanguage][key] || translations['en'][key] || key; }

function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            if (placeholderKey) el.placeholder = t(placeholderKey);
        } else { el.textContent = t(key); }
    });
    const statLabels = document.querySelectorAll('.stat-label');
    const statKeys = ['your reports', 'in progress', 'resolved', 'total campus reports'];
    statLabels.forEach((label, index) => { if (statKeys[index]) label.textContent = t(statKeys[index]); });
    const filterChips = document.querySelectorAll('.filter-chip');
    const filterKeys = ['all reports', 'security', 'maintenance', 'janitorial', 'facilities'];
    filterChips.forEach((chip, index) => { if (filterKeys[index] && !chip.id) chip.textContent = t(filterKeys[index]); });
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) viewToggle.innerHTML = viewMode === 'my' ? '🌐 ' + t('all reports') : '📋 ' + t('view my reports');
    const drawerSpans = document.querySelectorAll('.drawer-item span');
    const drawerKeys = ['dashboard', 'report', 'settings'];
    drawerSpans.forEach((span, index) => { if (drawerKeys[index]) span.textContent = t(drawerKeys[index]); });
    const logoutSpan = document.querySelector('.drawer-logout span');
    if (logoutSpan) logoutSpan.textContent = t('logout');
    const bottomSpans = document.querySelectorAll('.bottom-nav-item span');
    const bottomKeys = ['home', 'report', 'settings'];
    bottomSpans.forEach((span, index) => { if (bottomKeys[index]) span.textContent = t(bottomKeys[index]); });
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('student_language', lang);
    document.documentElement.lang = lang === 'tl' ? 'tl' : 'en';
    updateUIText();
    loadAndDisplayReports();
}

function loadLanguage() {
    const saved = localStorage.getItem('student_language');
    setLanguage(saved === 'tl' ? 'tl' : 'en');
}

// ========== DATABASE NOTIFICATION SYSTEM ==========
async function sendNotificationToDatabase(userId, title, message, type, reportData = null) {
    try {
        const isFireAlert = type === 'fire_alert';
        const { data, error } = await supabase
            .from('student_notifications')
            .insert([{
                user_id: userId, title, message, type,
                report_id: reportData?.id ? String(reportData.id) : null,
                report_title: reportData?.title || null,
                is_read: false, is_fire_alert: isFireAlert,
                created_at: new Date().toISOString()
            }]).select();
        if (error) { console.error('Failed to save notification:', error); return null; }
        showNotificationToast({ id: data[0]?.id, title, message, type, report_id: reportData?.id, timestamp: new Date().toISOString(), is_fire_alert: isFireAlert });
        return data[0];
    } catch (error) { console.error('Error saving notification:', error); return null; }
}

async function fetchNotificationsFromDB(userId) {
    try {
        const { data, error } = await supabase.from('student_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        if (error) { console.error('Error fetching notifications:', error); return []; }
        return data || [];
    } catch (error) { return []; }
}

async function markNotificationReadInDB(notificationId) {
    try {
        const { error } = await supabase.from('student_notifications').update({ is_read: true }).eq('id', notificationId);
        return !error;
    } catch { return false; }
}

async function markAllNotificationsReadInDB(userId) {
    try {
        const { error } = await supabase.from('student_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
        return !error;
    } catch { return false; }
}

async function clearAllNotificationsInDB(userId) {
    try {
        const { error } = await supabase.from('student_notifications').delete().eq('user_id', userId);
        return !error;
    } catch { return false; }
}

let cachedNotifications = [];

async function loadUserNotifications() {
    if (!currentStudent) return [];
    cachedNotifications = await fetchNotificationsFromDB(currentStudent.id);
    updateNotificationBell();
    renderNotificationPanel();
    return cachedNotifications;
}

function showNotificationToast(notification) {
    const isFireAlert = notification.type === 'fire_alert' || notification.is_fire_alert;
    const toastColor = isFireAlert ? '#DC2626' : '#1D9E75';
    const icon = isFireAlert ? '🔥🚨' : (notification.type === 'report_resolved' ? '✅' : '📢');
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:80px;right:20px;background:var(--surface);border-left:4px solid ${toastColor};border-radius:12px;padding:14px 18px;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:10000;animation:slideIn 0.3s ease;max-width:350px;color:var(--text);border:1px solid var(--border);cursor:pointer;`;
    toast.innerHTML = `<div style="display:flex;align-items:start;gap:12px;"><div style="font-size:24px;">${icon}</div><div style="flex:1;"><div style="font-weight:600;margin-bottom:4px;${isFireAlert ? 'color:#DC2626;' : ''}">${escapeHtml(notification.title)}</div><div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(notification.message)}</div><div style="font-size:11px;color:var(--muted);margin-top:6px;">${getTimeAgo(new Date(notification.timestamp))}</div></div></div>`;
    if (notification.report_id) {
        toast.addEventListener('click', () => {
            const report = allIncidents.find(r => String(r.id) === String(notification.report_id));
            if (report) viewIncident(notification.report_id);
            toast.remove();
        });
    }
    document.body.appendChild(toast);
    if (isFireAlert) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode); gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 880; gainNode.gain.value = 0.3;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
            oscillator.stop(audioContext.currentTime + 1);
        } catch(e) {}
    }
    const duration = isFireAlert ? 10000 : 6000;
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
}

function updateNotificationBell() {
    if (!currentStudent) return;
    const unreadCount = cachedNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    }
}

async function renderNotificationPanel() {
    if (!currentStudent) return;
    const list = document.getElementById('notificationList');
    if (!list) return;
    const notifications = await fetchNotificationsFromDB(currentStudent.id);
    cachedNotifications = notifications;
    if (notifications.length === 0) {
        list.innerHTML = `<div class="notification-empty"><div>🔔</div><p>No notifications yet</p><small>You'll receive notifications when new reports are submitted</small></div>`;
        return;
    }
    list.innerHTML = notifications.map(notif => {
        const isFireAlert = notif.is_fire_alert || notif.type === 'fire_alert';
        const alertIcon = isFireAlert ? '🔥' : (notif.type === 'report_resolved' ? '✅' : '📋');
        return `<div class="notification-item ${!notif.is_read ? 'unread' : ''}" data-id="${notif.id}" data-report-id="${notif.report_id || ''}">
            <div style="display:flex;gap:12px;"><div style="font-size:20px;">${alertIcon}</div>
            <div style="flex:1;"><div style="font-weight:600;margin-bottom:4px;${isFireAlert ? 'color:#DC2626;' : ''}">${escapeHtml(notif.title)}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">${escapeHtml(notif.message)}</div>
            <div style="font-size:11px;color:var(--muted);">${getTimeAgo(new Date(notif.created_at))}</div></div></div></div>`;
    }).join('');
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const notifId = item.dataset.id;
            const reportId = item.dataset.reportId;
            await markNotificationReadInDB(notifId);
            const notifInCache = cachedNotifications.find(n => n.id === notifId);
            if (notifInCache) notifInCache.is_read = true;
            item.classList.remove('unread');
            updateNotificationBell();
            if (reportId) {
                const report = allIncidents.find(r => String(r.id) === String(reportId));
                if (report) viewIncident(report.id);
            }
        });
    });
}

function createNotificationPanel() {
    if (document.getElementById('notificationPanel')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="notificationPanel" class="notification-panel">
            <div class="notification-header">
                <h4>🔔 Notifications</h4>
                <div style="display:flex;gap:8px;">
                    <button class="notification-mark-read" id="markAllReadBtn">Mark all read</button>
                    <button class="notification-clear" id="clearAllNotifsBtn">Clear all</button>
                </div>
            </div>
            <div id="notificationList" class="notification-list"></div>
        </div>
    `);
    document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
        if (currentStudent) { await markAllNotificationsReadInDB(currentStudent.id); await loadUserNotifications(); showNotification('All notifications marked as read', 'info'); }
    });
    document.getElementById('clearAllNotifsBtn')?.addEventListener('click', async () => {
        if (currentStudent && confirm('Clear all notifications?')) {
            await clearAllNotificationsInDB(currentStudent.id);
            cachedNotifications = []; await renderNotificationPanel(); updateNotificationBell();
            showNotification('All notifications cleared', 'info');
        }
    });
}

function setupNotificationButton() {
    const notificationBtn = document.getElementById('notificationBtn');
    if (!notificationBtn) return;
    const newBtn = notificationBtn.cloneNode(true);
    notificationBtn.parentNode.replaceChild(newBtn, notificationBtn);
    const panel = document.getElementById('notificationPanel');
    newBtn.addEventListener('click', async (e) => { e.stopPropagation(); await renderNotificationPanel(); panel.classList.toggle('active'); });
    document.addEventListener('click', (e) => { if (panel && !panel.contains(e.target) && !newBtn.contains(e.target)) panel.classList.remove('active'); });
}

function setupNotificationSubscription() {
    if (!currentStudent || notificationSubscription) return;
    notificationSubscription = supabase.channel(`notifications_${currentStudent.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_notifications', filter: `user_id=eq.${currentStudent.id}` }, (payload) => {
            const newNotif = payload.new;
            cachedNotifications = [newNotif, ...cachedNotifications];
            showNotificationToast({ id: newNotif.id, title: newNotif.title, message: newNotif.message, type: newNotif.type, report_id: newNotif.report_id, timestamp: newNotif.created_at, is_fire_alert: newNotif.is_fire_alert });
            updateNotificationBell(); renderNotificationPanel();
        }).subscribe();
}

async function processReportForNotifications(newReport, isUpdate = false, oldStatus = null) {
    if (!currentStudent) return;
    const reportId = String(newReport.id);
    const isOwnReport = String(newReport.student_id) === String(currentStudent.studentId);
    const isFire = isFireRelated(newReport);
    let notificationType = null, title = '', message = '';
    if (isFire && !isOwnReport) {
        notificationType = 'fire_alert'; title = '🔥🚨 FIRE ALERT! 🚨🔥';
        message = `FIRE reported at ${newReport.location}. Emergency responders have been notified.`;
    } else if (!isUpdate && !processedReportIds.has(reportId) && !isOwnReport) {
        notificationType = 'new_report'; title = '📋 New Report Submitted';
        message = `A new ${newReport.category} report has been submitted at ${newReport.location}`;
    } else if (isUpdate && oldStatus !== newReport.status && !isOwnReport) {
        if (newReport.status === 'resolved') { notificationType = 'report_resolved'; title = '✅ Report Resolved'; message = `The ${newReport.category} report at ${newReport.location} has been resolved.`; }
        else { notificationType = 'report_updated'; title = '📝 Report Updated'; message = `The report at ${newReport.location} status changed to ${newReport.status}.`; }
    }
    if (notificationType) await sendNotificationToDatabase(currentStudent.id, title, message, notificationType, newReport);
    if (!isUpdate) processedReportIds.add(reportId);
}

// ========== DARK MODE ==========
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedMode === 'enabled' || (!savedMode && prefersDark)) enableDarkMode();
    else disableDarkMode();
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        const newBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
        newBtn.addEventListener('click', (e) => { e.preventDefault(); toggleDarkMode(); });
    }
}

function toggleDarkMode() { document.body.classList.contains('dark-mode') ? disableDarkMode() : enableDarkMode(); }
function enableDarkMode() { document.body.classList.add('dark-mode'); localStorage.setItem('darkMode', 'enabled'); updateDarkModeIcons(true); showNotification('Dark mode enabled 🌙'); }
function disableDarkMode() { document.body.classList.remove('dark-mode'); localStorage.setItem('darkMode', 'disabled'); updateDarkModeIcons(false); showNotification('Light mode enabled ☀️'); }
function updateDarkModeIcons(isDark) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) { sunIcon.style.display = isDark ? 'none' : 'block'; moonIcon.style.display = isDark ? 'block' : 'none'; }
}

// ========== SKELETON LOADING ==========
function showSkeletonLoading() {
    const container = document.getElementById('incidentsContainer');
    if (!container) return;
    container.innerHTML = `<div class="skeleton-container">${Array(3).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-header"><div class="skeleton-title"></div><div class="skeleton-badges"><div class="skeleton-badge"></div><div class="skeleton-badge"></div><div class="skeleton-badge"></div></div></div>
            <div class="skeleton-location"></div>
            <div class="skeleton-footer"><div class="skeleton-reporter"></div><div class="skeleton-time"></div></div>
        </div>`).join('')}</div>`;
}

function addSkeletonStyles() {
    if (document.getElementById('skeleton-styles')) return;
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = `
        .skeleton-card { background:var(--surface); border-radius:16px; padding:20px; margin-bottom:16px; border:1px solid var(--border); animation:skeleton-pulse 1.5s ease-in-out infinite; }
        .skeleton-header { display:flex; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:10px; }
        .skeleton-title { width:60%; height:20px; background:var(--skeleton-bg); border-radius:8px; }
        .skeleton-badges { display:flex; gap:8px; }
        .skeleton-badge { width:70px; height:24px; background:var(--skeleton-bg); border-radius:20px; }
        .skeleton-location { width:50%; height:16px; background:var(--skeleton-bg); border-radius:6px; margin-bottom:12px; }
        .skeleton-footer { display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }
        .skeleton-reporter { width:40%; height:14px; background:var(--skeleton-bg); border-radius:6px; }
        .skeleton-time { width:80px; height:12px; background:var(--skeleton-bg); border-radius:6px; }
        @keyframes skeleton-pulse { 0%{opacity:1} 50%{opacity:0.6} 100%{opacity:1} }
        :root { --skeleton-bg: #e2e8f0; }
        body.dark-mode { --skeleton-bg: #2a2a2a; }
    `;
    document.head.appendChild(style);
}

function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification-panel { position:fixed; top:70px; right:20px; width:380px; max-height:500px; background:var(--surface); border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2); z-index:15000; display:none; flex-direction:column; overflow:hidden; border:1px solid var(--border); }
        .notification-panel.active { display:flex; animation:slideIn 0.3s ease; }
        .notification-header { padding:16px 20px; background:var(--bg); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
        .notification-header h4 { font-size:16px; font-weight:600; color:var(--text); }
        .notification-mark-read, .notification-clear { background:none; border:none; color:#1D9E75; cursor:pointer; font-size:12px; padding:4px 8px; border-radius:6px; }
        .notification-list { flex:1; overflow-y:auto; max-height:400px; }
        .notification-item { padding:16px 20px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.2s; }
        .notification-item:hover { background:var(--hover-bg); }
        .notification-item.unread { background:rgba(220,38,38,0.05); border-left:3px solid #DC2626; }
        .notification-empty { padding:40px; text-align:center; color:var(--muted); }
        .notification-empty div { font-size:48px; margin-bottom:12px; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    `;
    document.head.appendChild(style);
}

// ========== MODAL STYLES ==========
function addModalStyles() {
    if (document.getElementById('modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
        .modal-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.6); z-index: 20000;
            align-items: center; justify-content: center;
            padding: 16px; backdrop-filter: blur(4px);
        }
        .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease; }
        .modal-container {
            background: var(--surface); border-radius: 24px;
            width: 100%; max-width: 560px; max-height: 90vh;
            overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.3);
            animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
            position: sticky; top: 0; background: var(--surface); z-index: 1;
            border-radius: 24px 24px 0 0;
        }
        .modal-header h3 { font-size: 17px; font-weight: 700; color: var(--text); }
        .modal-close {
            width: 32px; height: 32px; border-radius: 50%; border: none;
            background: var(--border); color: var(--text); cursor: pointer;
            font-size: 18px; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s;
        }
        .modal-close:hover { background: #DC2626; color: white; }
        .modal-body { padding: 0 24px 8px; }
        .modal-image-section {
            margin: 16px 0; border-radius: 16px; overflow: hidden;
            border: 1px solid var(--border); background: var(--bg);
        }
        .modal-image-section img {
            width: 100%; max-height: 260px; object-fit: cover;
            display: block; cursor: zoom-in; transition: opacity 0.2s;
        }
        .modal-image-section img:hover { opacity: 0.92; }
        .modal-no-image {
            padding: 24px; text-align: center; color: var(--muted); font-size: 13px;
        }
        .modal-section { margin: 16px 0; }
        .modal-section-title {
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.8px; color: var(--muted); margin-bottom: 10px;
        }
        .modal-row {
            display: flex; gap: 12px; padding: 10px 0;
            border-bottom: 1px solid var(--border);
        }
        .modal-row:last-child { border-bottom: none; }
        .modal-label {
            font-size: 13px; color: var(--muted); min-width: 110px;
            font-weight: 500; padding-top: 2px;
        }
        .modal-value { font-size: 14px; color: var(--text); flex: 1; line-height: 1.5; }
        .modal-description-box {
            background: var(--bg); border-radius: 12px; padding: 14px 16px;
            font-size: 14px; color: var(--text); line-height: 1.6;
            border: 1px solid var(--border); white-space: pre-wrap;
        }
        .modal-restricted-box {
            background: #FEF2F2; border-left: 4px solid #DC2626;
            border-radius: 12px; padding: 14px 16px;
        }
        .modal-footer {
            padding: 16px 24px 20px; display: flex; gap: 12px; justify-content: flex-end;
            border-top: 1px solid var(--border);
            position: sticky; bottom: 0; background: var(--surface);
            border-radius: 0 0 24px 24px;
        }
        .modal-btn-close {
            padding: 10px 28px; border-radius: 40px; border: 1.5px solid var(--border);
            background: transparent; color: var(--text); cursor: pointer;
            font-size: 14px; font-weight: 500; transition: all 0.2s;
        }
        .modal-btn-close:hover { background: var(--border); }
        .modal-report-id {
            font-size: 11px; color: var(--muted); padding: 4px 10px;
            background: var(--bg); border-radius: 20px; border: 1px solid var(--border);
            font-family: monospace;
        }

        /* badge styles used in modal */
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .badge.security  { background:#FEF2F2; color:#DC2626; }
        .badge.maintenance { background:#EFF6FF; color:#2563EB; }
        .badge.janitorial  { background:#E1F5EE; color:#085041; }
        .badge.facilities  { background:#FFFBEB; color:#D97706; }
        .badge.high    { background:#FEF2F2; color:#DC2626; }
        .badge.medium  { background:#FFFBEB; color:#D97706; }
        .badge.low     { background:#F0FDF4; color:#16A34A; }
        .badge.pending  { background:#FFF7ED; color:#EA580C; }
        .badge.progress { background:#EFF6FF; color:#2563EB; }
        .badge.resolved { background:#F0FDF4; color:#16A34A; }
        .badge.your    { background:#E1F5EE; color:#085041; }
        .badge.other   { background:#E2E8F0; color:#475569; }
        .badge.safety  { background:#FEF2F2; color:#DC2626; font-weight:500; }
        .badge.security-alert { background:#DC2626; color:white; font-weight:600; animation:pulse 2s infinite; }
        @keyframes pulse { 0%{opacity:1} 50%{opacity:0.7} 100%{opacity:1} }

        /* image zoom overlay */
        .img-zoom-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.9);
            z-index: 30000; display: flex; align-items: center;
            justify-content: center; cursor: zoom-out; padding: 20px;
        }
        .img-zoom-overlay img { max-width: 100%; max-height: 90vh; border-radius: 12px; object-fit: contain; }
        .img-zoom-close {
            position: absolute; top: 20px; right: 24px; background: rgba(255,255,255,0.15);
            color: white; border: none; border-radius: 50%; width: 40px; height: 40px;
            font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
    `;
    document.head.appendChild(style);
}

// ========== AUTH ==========
async function checkAuth() {
    const stored = localStorage.getItem('currentStudent');
    if (!stored) { window.location.href = '/Assets/Landing_page/land.html'; return false; }
    try {
        const localStudent = JSON.parse(stored);
        const { data: studentData, error } = await supabase.from('student').select('*').eq('student_id', localStudent.studentId).single();
        if (error) {
            currentStudent = { id: localStudent.studentId, studentId: localStudent.studentId, name: localStudent.name || localStudent.full_name || 'Student', email: localStudent.email || '', role: 'student' };
        } else {
            currentStudent = { id: studentData.id, studentId: studentData.student_id, name: studentData.full_name, email: studentData.email, role: 'student' };
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        }
        return true;
    } catch(e) {
        currentStudent = { id: 'guest', studentId: 'guest', name: 'Student', email: '', role: 'student' };
        return true;
    }
}

function canStudentSeeDescription(incident) {
    if (!currentStudent) return false;
    if (String(incident.student_id) === String(currentStudent?.studentId)) return true;
    if (isSecuritySensitive(incident)) return false;
    if (incident.category && SENSITIVE_CATEGORIES.includes(incident.category.toLowerCase())) return false;
    return true;
}

function getSafeLocation(incident) {
    if (!currentStudent) return incident.location || 'Location not specified';
    if (String(incident.student_id) === String(currentStudent?.studentId)) return incident.location || 'Location not specified';
    if (isSecuritySensitive(incident)) return '<span class="location-restricted">🔒 LOCATION RESTRICTED - Security Purposes</span>';
    if (incident.category === 'security') return '<span class="location-restricted">🔒 LOCATION RESTRICTED 🔒</span>';
    return incident.location || 'Location not specified';
}

function getSafeTitle(incident) {
    if (!currentStudent) return incident.name || 'Incident Report';
    if (canStudentSeeDescription(incident)) return incident.name;
    if (isSecuritySensitive(incident)) return '⚠️ SECURITY ALERT - Details Restricted ⚠️';
    if (incident.category === 'security') return '⚠️ Security Alert - Admin Notified';
    return '⚠️ Safety Alert - Details Restricted';
}

// ========== LOAD INCIDENTS ==========
async function loadIncidents() {
    if (isLoading) return;
    isLoading = true;
    const isFirstLoad = allIncidents.length === 0;
    if (isFirstLoad) showSkeletonLoading();
    try {
        const { data: incidents, error } = await supabase.from('incident').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allIncidents = (incidents || []).map(r => ({
            id: r.id,
            name: r.title,
            title: r.title,
            location: r.location,
            category: r.category || 'maintenance',
            priority: r.priority || 'medium',
            status: r.status || 'pending',
            reporter: r.student_name,
            student_id: r.student_id_number,
            student_name: r.student_name,
            description: r.description || 'No description provided',
            timestamp: new Date(r.created_at),
            image_url: r.image_url || null,
            is_anonymous: r.is_anonymous,
            resolved_at: r.resolved_at || null,
            updated_at: r.updated_at || null
        }));
        loadAndDisplayReports();
        updateStats();
    } catch (error) {
        console.error('Error loading incidents:', error);
        loadFromLocalStorage();
    } finally { isLoading = false; }
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== '[]') {
        const reports = JSON.parse(stored);
        allIncidents = reports.map(r => ({
            id: r.id, name: r.title, title: r.title,
            location: r.location, category: r.category || 'maintenance',
            priority: r.priority || 'medium', status: r.status || 'pending',
            reporter: r.student_name || r.studentName,
            student_id: r.student_id_number || r.studentId,
            student_name: r.student_name, description: r.description || 'No description provided',
            timestamp: new Date(r.created_at || r.timestamp),
            image_url: r.image_url || r.imageUrl || null,
            is_anonymous: r.is_anonymous,
            resolved_at: r.resolved_at || null, updated_at: r.updated_at || null
        }));
    } else { allIncidents = []; }
    loadAndDisplayReports(); updateStats();
}

function setupRealtimeSubscription() {
    if (realtimeIncidentSubscription) return;
    realtimeIncidentSubscription = supabase.channel('incident-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incident' }, async (payload) => {
            const nr = payload.new;
            const formattedReport = { id: nr.id, title: nr.title, location: nr.location, category: nr.category || 'maintenance', priority: nr.priority || 'medium', status: nr.status || 'pending', description: nr.description, student_id: nr.student_id_number, reporter: nr.student_name, timestamp: new Date(nr.created_at) };
            await processReportForNotifications(formattedReport, false);
            if (updateTimeout) clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => loadIncidents(), 500);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incident' }, async (payload) => {
            const ur = payload.new, or = payload.old;
            if (or.status !== ur.status) {
                const formattedReport = { id: ur.id, title: ur.title, location: ur.location, category: ur.category || 'maintenance', priority: ur.priority || 'medium', status: ur.status || 'pending', description: ur.description, student_id: ur.student_id_number, reporter: ur.student_name, timestamp: new Date(ur.created_at) };
                await processReportForNotifications(formattedReport, true, or.status);
            }
            if (updateTimeout) clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => loadIncidents(), 500);
        }).subscribe();
}

function getReportsToDisplay() {
    if (!currentStudent) return [];
    if (viewMode === 'my') return allIncidents.filter(inc => String(inc.student_id) === String(currentStudent?.studentId));
    return allIncidents;
}

function getFilteredReports() {
    let reports = getReportsToDisplay();
    if (currentFilter !== 'all') reports = reports.filter(r => r.category === currentFilter);
    return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function loadAndDisplayReports() { displayIncidents(getFilteredReports()); updateStats(); }

function displayIncidents(reports) {
    const container = document.getElementById('incidentsContainer');
    if (!container) return;
    const incidentsCount = document.getElementById('incidentsCount');
    if (incidentsCount) incidentsCount.textContent = `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`;
    if (reports.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">${t('no reports yet')}</div><div class="empty-sub">${t('click new report')}</div></div>`;
        return;
    }
    container.innerHTML = reports.map(report => createIncidentCard(report)).join('');
}

function createIncidentCard(report) {
    const categoryColors = {
        security:    { label: t('security cat') },
        maintenance: { label: t('maintenance cat') },
        janitorial:  { label: t('janitorial cat') },
        facilities:  { label: t('facilities cat') }
    };
    const priorityLabels = { high: t('high'), medium: t('medium'), low: t('low') };
    const statusMap = { pending: { cls: 'pending', label: t('pending') }, 'in-progress': { cls: 'progress', label: t('in progress') }, resolved: { cls: 'resolved', label: t('resolved') } };
    const cat = categoryColors[report.category] || categoryColors.maintenance;
    const priLabel = priorityLabels[report.priority] || t('medium');
    const stat = statusMap[report.status] || statusMap.pending;
    const timeAgo = getTimeAgo(new Date(report.timestamp));
    const isYourReport = currentStudent ? String(report.student_id) === String(currentStudent?.studentId) : false;
    const canSeeDetails = canStudentSeeDescription(report);
    const safeTitle = getSafeTitle(report);
    const safeLocation = getSafeLocation(report);
    const safeReporterName = getSafeReporterName(report, isYourReport);
    const isSecurity = isSecuritySensitive(report);
    const safetyBadge = (!canSeeDetails && !isYourReport) ? `<span class="badge safety">🔒 ${t('restricted')}</span>` : '';
    const securityBadge = isSecurity && !isYourReport ? `<span class="badge security-alert">⚠️ SECURITY CONCERN</span>` : '';
    
    // REMOVED: image thumbnail from card - no image outside modal

    return `<div class="incident-card" onclick="viewIncident(${report.id})" style="cursor:pointer;">
        <div class="card-header" style="display:flex;gap:12px;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
                <div class="incident-title" style="font-weight:600;margin-bottom:6px;">${escapeHtml(safeTitle)}</div>
                <div class="incident-badges" style="display:flex;flex-wrap:wrap;gap:6px;">
                    <span class="badge ${report.category}">${cat.label}</span>
                    <span class="badge ${report.priority}">${priLabel}</span>
                    <span class="badge ${stat.cls}">${stat.label}</span>
                    ${isYourReport ? `<span class="badge your">${t('your report')}</span>` : `<span class="badge other">${t('by')}: ${escapeHtml(safeReporterName)}</span>`}
                    ${safetyBadge}${securityBadge}
                </div>
            </div>
        </div>
        <div class="incident-location" style="margin-top:10px;">${safeLocation}</div>
        <div class="card-footer" style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
            <div class="reporter-info" style="font-size:13px;color:var(--muted);">
                ${!canSeeDetails && !isYourReport ? (isSecurity ? '🔒 SECURITY REPORT - Identity Protected' : t('sensitive report')) : `👤 ${isYourReport ? t('reported by you') : `${t('reported by')}: ${escapeHtml(safeReporterName)}`}`}
            </div>
            <div class="timestamp" style="font-size:12px;color:var(--muted);">${timeAgo}</div>
        </div>
    </div>`;
}

function updateStats() {
    if (!currentStudent) return;
    const myReports = allIncidents.filter(inc => String(inc.student_id) === String(currentStudent.studentId));
    animateCounter('yourReportsCount', myReports.length);
    animateCounter('inProgressCount', myReports.filter(r => r.status === 'in-progress').length);
    animateCounter('resolvedCount', myReports.filter(r => r.status === 'resolved').length);
    animateCounter('totalReportsCount', allIncidents.length);
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const startValue = parseInt(element.textContent) || 0;
    if (startValue === targetValue) return;
    const duration = 500, startTime = performance.now();
    function update(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        element.textContent = Math.floor(startValue + (targetValue - startValue) * progress);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function getTimeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    const mins = Math.floor(diff / 60), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px 24px;background:${type === 'error' ? '#DC2626' : type === 'warning' ? '#F59E0B' : type === 'info' ? '#3B82F6' : '#10B981'};color:white;border-radius:8px;z-index:10000;animation:slideIn 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:350px;`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = 'slideOut 0.3s ease'; setTimeout(() => n.remove(), 300); }, 3000);
}

function toggleViewMode() {
    viewMode = viewMode === 'all' ? 'my' : 'all';
    const toggleBtn = document.getElementById('viewModeToggle');
    if (toggleBtn) toggleBtn.innerHTML = viewMode === 'my' ? '🌐 ' + t('all reports') : '📋 ' + t('view my reports');
    loadAndDisplayReports();
}

// ========== VIEW INCIDENT MODAL (FULL DETAIL - NO AI CONFIDENCE) ==========
window.viewIncident = function(id) {
    const inc = allIncidents.find(i => String(i.id) === String(id));
    if (!inc) return;

    const existing = document.getElementById('incidentModal');
    if (existing) existing.remove();

    const isYourReport = currentStudent ? String(inc.student_id) === String(currentStudent?.studentId) : false;
    const canSeeDetails = canStudentSeeDescription(inc);
    const isSecurity = isSecuritySensitive(inc);
    const safeTitle = getSafeTitle(inc);
    const safeLocation = getSafeLocation(inc);
    const safeReporterName = getSafeReporterName(inc, isYourReport);
    const safeDescription = getSafeDescription(inc, isYourReport, canSeeDetails);

    const categoryLabels = { security: t('security cat'), maintenance: t('maintenance cat'), janitorial: t('janitorial cat'), facilities: t('facilities cat') };
    const priorityLabels = { high: t('high'), medium: t('medium'), low: t('low') };
    const statusMap = { pending: { cls: 'pending', label: t('pending') }, 'in-progress': { cls: 'progress', label: t('in progress') }, resolved: { cls: 'resolved', label: t('resolved') } };
    const stat = statusMap[inc.status] || statusMap.pending;

    // Image section - only inside modal
    let imageSection = '';
    if (inc.image_url) {
        imageSection = `
            <div class="modal-image-section">
                <img src="${escapeHtml(inc.image_url)}" alt="Incident image"
                     onclick="openImageZoom('${escapeHtml(inc.image_url)}')"
                     title="Click to enlarge" />
                <div style="padding:8px 12px;font-size:11px;color:var(--muted);border-top:1px solid var(--border);">
                    📎 Attached image — click to enlarge
                </div>
            </div>`;
    } else {
        imageSection = `<div class="modal-image-section"><div class="modal-no-image">📷 ${t('no image')}</div></div>`;
    }

    // Description section
    let descriptionSection = '';
    if (isYourReport || canSeeDetails) {
        descriptionSection = `<div class="modal-description-box">${escapeHtml(safeDescription)}</div>`;
    } else {
        descriptionSection = `
            <div class="modal-restricted-box">
                <strong style="color:#DC2626;">⚠️ Security Restriction</strong><br>
                <span style="color:#475569;font-size:13px;">This report contains sensitive safety information. Campus security has been notified and is handling the situation.</span>
            </div>`;
    }

    // Reporter display
    let reporterDisplay = '';
    if (!canSeeDetails && !isYourReport) {
        reporterDisplay = `<span class="badge safety">🔒 ${t('confidential')}</span>`;
    } else if (inc.is_anonymous === 'true') {
        reporterDisplay = `<span class="badge other">🙈 Anonymous Reporter</span>`;
    } else {
        reporterDisplay = `<span class="badge other">👤 ${isYourReport ? t('you') : escapeHtml(safeReporterName)}</span>`;
    }

    // REMOVED: AI confidence badge - completely removed from modal

    // Resolved date
    const resolvedRow = inc.resolved_at
        ? `<div class="modal-row"><div class="modal-label">✅ Resolved</div><div class="modal-value">${new Date(inc.resolved_at).toLocaleString()}</div></div>`
        : '';

    const modal = document.createElement('div');
    modal.id = 'incidentModal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-container" role="dialog" aria-modal="true" aria-label="Incident Details">
            <div class="modal-header">
                <h3>📋 ${t('incident details')}</h3>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="modal-report-id">#${inc.id}</span>
                    <button class="modal-close" onclick="closeModal()" aria-label="Close">&times;</button>
                </div>
            </div>

            <div class="modal-body">
                ${imageSection}

                <div class="modal-section">
                    <div class="modal-section-title">📌 Report Info</div>

                    <div class="modal-row">
                        <div class="modal-label">${t('title')}</div>
                        <div class="modal-value" style="font-weight:600;">${escapeHtml(safeTitle)}</div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('location')}</div>
                        <div class="modal-value">📍 ${safeLocation}</div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('category')}</div>
                        <div class="modal-value">
                            <span class="badge ${inc.category}">${categoryLabels[inc.category] || inc.category}</span>
                        </div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('priority')}</div>
                        <div class="modal-value">
                            <span class="badge ${inc.priority}">${priorityLabels[inc.priority] || inc.priority}</span>
                        </div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('status')}</div>
                        <div class="modal-value">
                            <span class="badge ${stat.cls}">${stat.label}</span>
                        </div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('reporter')}</div>
                        <div class="modal-value">${reporterDisplay}</div>
                    </div>

                    <div class="modal-row">
                        <div class="modal-label">${t('date')}</div>
                        <div class="modal-value">🕐 ${new Date(inc.timestamp).toLocaleString()}</div>
                    </div>

                    ${resolvedRow}
                </div>

                <div class="modal-section">
                    <div class="modal-section-title">📝 ${t('description')}</div>
                    ${descriptionSection}
                </div>
            </div>

            <div class="modal-footer">
                <button class="modal-btn-close" onclick="closeModal()">${t('close')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
};

window.closeModal = function() {
    const modal = document.getElementById('incidentModal');
    if (modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); }
    document.body.style.overflow = '';
};

// Image zoom
window.openImageZoom = function(src) {
    const existing = document.getElementById('imgZoomOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'imgZoomOverlay';
    overlay.className = 'img-zoom-overlay';
    overlay.innerHTML = `<button class="img-zoom-close" onclick="document.getElementById('imgZoomOverlay').remove()">&times;</button><img src="${escapeHtml(src)}" alt="Zoomed image" />`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
};

// ========== UI SETUP ==========
function getReports() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveReports() { console.warn('saveReports() suppressed.'); }

function loadStudentFromLogin() {
    if (!currentStudent) { const stored = localStorage.getItem('currentStudent'); if (stored) currentStudent = JSON.parse(stored); return; }
    document.querySelectorAll('#studentName, .drawer-name').forEach(el => { if (el) el.textContent = currentStudent.name || 'Student'; });
    const studentNumberEl = document.getElementById('studentNumber');
    if (studentNumberEl && currentStudent.studentId) studentNumberEl.textContent = `ID: ${currentStudent.studentId}`;
    const welcomeHeader = document.getElementById('welcomeMessage');
    if (welcomeHeader) { const firstName = currentStudent.name ? currentStudent.name.split(' ')[0] : 'Student'; welcomeHeader.innerHTML = `${t('welcome back')}, ${firstName}! 👋`; }
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function loadProfileImage() {
    if (!currentStudent) return;
    const savedImage = localStorage.getItem(`avatar_${currentStudent.studentId}`);
    const avatarContainer = document.querySelector('.drawer-avatar');
    if (avatarContainer && savedImage) avatarContainer.innerHTML = `<img src="${savedImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
}

function setupAvatarUpload() {
    const avatarContainer = document.querySelector('.drawer-avatar');
    if (!avatarContainer) return;
    let fileInput = document.getElementById('avatarUploadInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.id = 'avatarUploadInput'; fileInput.accept = 'image/jpeg,image/png,image/jpg'; fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && ['image/jpeg','image/png','image/jpg'].includes(file.type)) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const imageData = ev.target.result;
                    localStorage.setItem(`avatar_${currentStudent.studentId}`, imageData);
                    avatarContainer.innerHTML = `<img src="${imageData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                    showNotification(t('profile updated'));
                };
                reader.readAsDataURL(file);
            } else { showNotification(t('invalid image'), 'error'); }
            fileInput.value = '';
        });
    }
    avatarContainer.style.cursor = 'pointer';
    avatarContainer.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
}

function setupFilters() {
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadAndDisplayReports();
        });
    });
}

function addViewModeToggle() {
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar && !document.getElementById('viewModeToggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'viewModeToggle'; toggleBtn.className = 'filter-chip';
        toggleBtn.style.background = '#2563EB'; toggleBtn.style.color = 'white';
        toggleBtn.innerHTML = '📋 ' + t('view my reports');
        toggleBtn.onclick = () => toggleViewMode();
        filterBar.appendChild(toggleBtn);
    }
}

function initializeDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const hamburger = document.getElementById('hamburger');
    window.openDrawer = () => { drawer.classList.add('open'); if (overlay) overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
    window.closeDrawer = () => { drawer.classList.remove('open'); if (overlay) overlay.classList.remove('open'); document.body.style.overflow = ''; };
    if (hamburger) hamburger.addEventListener('click', window.openDrawer);
    if (overlay) overlay.addEventListener('click', window.closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.closeDrawer(); });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm(t('confirm logout'))) { localStorage.removeItem('currentStudent'); showNotification(t('logged out')); setTimeout(() => window.location.href = '/land.html', 1000); }
        });
    }
}

function addDrawerStyles() {
    if (document.getElementById('drawer-styles')) return;
    const style = document.createElement('style');
    style.id = 'drawer-styles';
    style.textContent = `
        .drawer { transition: transform 0.3s ease; }
        .drawer.open { transform: translateX(0); }
        @media (max-width: 768px) { .drawer { transform: translateX(-100%); } }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        .filter-chip.active { background: #2563EB; color: white; }
        .incident-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .incident-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .location-restricted { color: var(--muted); font-weight: 500; }
    `;
    document.head.appendChild(style);
}

function setupUI() {
    initializeDrawer(); addDrawerStyles(); addModalStyles();
    setupAvatarUpload(); setupFilters(); addViewModeToggle(); loadProfileImage();
}

function setupBottomNav() {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'dashboard') window.location.href = '/Assets/Student_dashboard/SDB.html';
            else if (page === 'report') window.location.href = '/Assets/Student_reporting/report.html';
            else if (page === 'settings') window.location.href = '/Assets/Student_dashboard/setting/setting.html';
        });
    });
}

function initBeautifulAnimations() {
    if (document.getElementById('pageLoader')) return;
    const loader = document.createElement('div');
    loader.id = 'pageLoader'; loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
    setTimeout(() => { const l = document.getElementById('pageLoader'); if (l) l.classList.remove('show'); }, 50);
}

function setupCrossTabSync() {
    window.addEventListener('storage', (e) => { if (e.key === 'student_data_updated') refreshStudentData(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStudentData(); });
}

async function refreshStudentData() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        const parsedStudent = JSON.parse(stored);
        if (currentStudent && parsedStudent.name !== currentStudent.name) { currentStudent = parsedStudent; await loadIncidents(); updateStats(); }
    }
}

// ========== TEST FUNCTIONS ==========
window.testNotification = async function() {
    if (!currentStudent) { console.log('No student logged in'); return; }
    await sendNotificationToDatabase(currentStudent.id, '🧪 Test Notification', 'This is a test notification!', 'test', { id: 'test_123', title: 'Test Report' });
};
window.testFireAlert = async function() {
    if (!currentStudent) { console.log('No student logged in'); return; }
    await sendNotificationToDatabase(currentStudent.id, '🔥🚨 TEST FIRE ALERT!', 'This is a TEST fire alert. Please evacuate!', 'fire_alert', { id: 'fire_test', title: 'FIRE TEST' });
};

// ========== MAIN INIT ==========
async function init() {
    console.log('Initializing dashboard...');
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedMode === 'enabled' || (!savedMode && prefersDark)) document.body.classList.add('dark-mode');

    showSkeletonLoading(); addSkeletonStyles(); addNotificationStyles();

    await checkAuth();
    await loadIncidents();
    loadLanguage();
    loadStudentFromLogin();
    setupUI();
    setupRealtimeSubscription();
    createNotificationPanel();
    setupNotificationButton();
    initDarkMode();
    setupBottomNav();
    setupCrossTabSync();
    await loadUserNotifications();
    setupNotificationSubscription();

    console.log('✅ Dashboard ready!');
}

document.addEventListener('DOMContentLoaded', initBeautifulAnimations);
window.addEventListener('load', () => { const l = document.getElementById('pageLoader'); if (l) l.classList.remove('show'); });

window.getReports = getReports;
window.saveReports = saveReports;
window.viewIncident = viewIncident;
window.closeModal = closeModal;

init();