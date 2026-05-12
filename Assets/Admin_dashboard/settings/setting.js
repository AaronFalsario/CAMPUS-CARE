// Debug: Check if env vars are loading
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentAdminData = null;

// ========== NOTIFICATION SYSTEM ==========
let notifications = [];
let notificationIdCounter = 0;
let isNotificationDropdownOpen = false;

function loadNotifications() {
    const stored = localStorage.getItem('admin_notifications');
    if (stored) {
        try {
            notifications = JSON.parse(stored);
            notificationIdCounter = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 0;
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
    const importantTitles = ['Profile Updated', 'Password Changed', 'Preferences Saved', 'Notification Settings', 'Data Settings Saved', 'Data Exported', 'Data Cleared', 'Settings Reset', 'Settings Imported', 'Feedback Received'];
    if (!importantTitles.includes(title) && !isUrgent) return;
    
    const notification = {
        id: notificationIdCounter++,
        title: title,
        message: message,
        timestamp: new Date().toISOString(),
        read: false,
        isUrgent: isUrgent
    };
    notifications.unshift(notification);
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    saveNotifications();
    updateNotificationDropdown();
    updateNotificationBadge();
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
                <button class="clear-all-dropdown" onclick="window.clearAllNotifications()">Clear all</button>
            </div>
            <div class="notification-dropdown-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No notifications yet</p>
                <p style="font-size: 11px; margin-top: 4px;">Important updates will appear here</p>
            </div>
        `;
        return;
    }
    
    const unreadCount = notifications.filter(n => !n.read).length;
    dropdown.innerHTML = `
        <div class="notification-dropdown-header">
            <span>🔔 Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}</span>
            <button class="clear-all-dropdown" onclick="window.clearAllNotifications()">Clear all</button>
        </div>
        <div class="notification-dropdown-list">
            ${notifications.slice(0, 15).map(notif => `
                <div class="notification-dropdown-item ${!notif.read ? 'unread' : ''} ${notif.isUrgent ? 'urgent' : ''}" onclick="window.markNotificationRead(${notif.id})">
                    <div class="notification-dropdown-title">${notif.isUrgent ? '🚨 ' : '📋 '}${escapeHtml(notif.title)}</div>
                    <div class="notification-dropdown-message">${escapeHtml(notif.message)}</div>
                    <div class="notification-dropdown-time">${getTimeAgo(new Date(notif.timestamp))}</div>
                </div>
            `).join('')}
        </div>
        ${notifications.length > 15 ? `<div class="notification-dropdown-footer">${notifications.length - 15} more notifications</div>` : ''}
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
        const bell = document.getElementById('notificationBell');
        if (bell) {
            const rect = bell.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + 8}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
        }
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

window.markNotificationRead = function(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveNotifications();
        updateNotificationDropdown();
        updateNotificationBadge();
    }
};

window.clearAllNotifications = function() {
    notifications = [];
    saveNotifications();
    updateNotificationDropdown();
    updateNotificationBadge();
    showToastMessage('All notifications cleared', 'success');
};

function getTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const h = Math.floor((Date.now() - date) / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ========== IMPROVED TOAST MESSAGE ==========
function showToastMessage(message, type = 'success') {
    const existing = document.querySelectorAll('.settings-toast');
    existing.forEach(toast => toast.remove());
    
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
        default: icon = '✓'; bgColor = '#10B981'; borderColor = '#059669';
    }
    
    toast.className = 'settings-toast';
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 70px; left: 16px; right: 16px;' : 'bottom: 24px; right: 24px;'}
        background: ${bgColor};
        color: white;
        padding: ${isMobile ? '12px 16px' : '12px 20px'};
        border-radius: ${isMobile ? '12px' : '40px'};
        font-size: ${isMobile ? '13px' : '14px'};
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        border-left: 4px solid ${borderColor};
        max-width: ${isMobile ? 'none' : '380px'};
        width: ${isMobile ? 'auto' : 'auto'};
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: ${isMobile ? '28px' : '32px'}; height: ${isMobile ? '28px' : '32px'}; background: rgba(255,255,255,0.2); border-radius: 50%; font-size: ${isMobile ? '14px' : '16px'};">
            ${icon}
        </div>
        <div style="flex: 1;">${message}</div>
        <button class="toast-close" style="background: none; border: none; color: white; cursor: pointer; font-size: ${isMobile ? '20px' : '18px'}; padding: ${isMobile ? '8px' : '4px'}; opacity: 0.7; min-width: 44px; min-height: 44px;">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.onclick = () => toast.remove();
    }
    
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 3000);
}

// ========== IMPROVED LOGOUT FUNCTION WITH CONFIRMATION MODAL ==========
function confirmLogout() {
    const isMobile = window.innerWidth <= 768;
    
    // Create custom confirmation modal
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
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
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
        showToastMessage('Logout cancelled', 'info');
    };
    
    document.getElementById('logoutConfirmBtn').onclick = () => {
        cleanup();
        showToastMessage('Logging out...', 'info');
        
        setTimeout(() => {
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('isAdminLoggedIn');
            localStorage.removeItem('admin_notifications');
            localStorage.removeItem('campus_care_admin_settings');
            localStorage.removeItem('admin_dark_mode');
            
            showToastMessage('✓ Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = '/land.html';
            }, 800);
        }, 500);
    };
}

// ========== DARK MODE SYSTEM ==========
function initDarkMode() {
    const savedMode = localStorage.getItem('admin_dark_mode');
    const toggle = document.getElementById('darkModeToggle');
    const mobileDarkToggle = document.getElementById('mobileDarkModeToggle');
    const darkModeCheckbox = document.getElementById('darkMode');
    
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (toggle) {
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        }
        if (mobileDarkToggle) mobileDarkToggle.checked = true;
        if (darkModeCheckbox) darkModeCheckbox.checked = true;
        if (window.persistentSettings) window.persistentSettings.settings.darkMode = true;
    } else if (savedMode === 'disabled') {
        document.body.classList.remove('dark-mode');
        if (toggle) {
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        }
        if (mobileDarkToggle) mobileDarkToggle.checked = false;
        if (darkModeCheckbox) darkModeCheckbox.checked = false;
        if (window.persistentSettings) window.persistentSettings.settings.darkMode = false;
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('admin_dark_mode', 'enabled');
            if (toggle) {
                const sunIcon = toggle.querySelector('.sun-icon');
                const moonIcon = toggle.querySelector('.moon-icon');
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            }
            if (mobileDarkToggle) mobileDarkToggle.checked = true;
            if (darkModeCheckbox) darkModeCheckbox.checked = true;
        }
    }
    
    function syncDarkMode(enabled) {
        document.body.classList.toggle('dark-mode', enabled);
        localStorage.setItem('admin_dark_mode', enabled ? 'enabled' : 'disabled');
        
        if (toggle) {
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon && moonIcon) {
                if (enabled) {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                } else {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                }
            }
        }
        if (mobileDarkToggle) mobileDarkToggle.checked = enabled;
        if (darkModeCheckbox) darkModeCheckbox.checked = enabled;
        if (window.persistentSettings) window.persistentSettings.set('darkMode', enabled);
        
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'admin_dark_mode',
            newValue: enabled ? 'enabled' : 'disabled'
        }));
    }
    
    if (toggle) {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        newToggle.addEventListener('click', () => syncDarkMode(!document.body.classList.contains('dark-mode')));
    }
    
    if (mobileDarkToggle) {
        mobileDarkToggle.addEventListener('change', (e) => syncDarkMode(e.target.checked));
    }
    
    if (darkModeCheckbox) {
        darkModeCheckbox.addEventListener('change', (e) => syncDarkMode(e.target.checked));
    }
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'admin_dark_mode') {
            const enabled = e.newValue === 'enabled';
            document.body.classList.toggle('dark-mode', enabled);
            if (toggle) {
                const sunIcon = toggle.querySelector('.sun-icon');
                const moonIcon = toggle.querySelector('.moon-icon');
                if (sunIcon && moonIcon) {
                    if (enabled) {
                        sunIcon.style.display = 'none';
                        moonIcon.style.display = 'block';
                    } else {
                        sunIcon.style.display = 'block';
                        moonIcon.style.display = 'none';
                    }
                }
            }
            if (mobileDarkToggle) mobileDarkToggle.checked = enabled;
            if (darkModeCheckbox) darkModeCheckbox.checked = enabled;
        }
    });
}

// ========== SETTINGS MANAGER ==========
class PersistentSettings {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const stored = localStorage.getItem('campus_care_admin_settings');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            adminName: '',
            emailNotifications: true,
            pushNotifications: false,
            defaultView: 'overview',
            darkMode: false,
            compactMode: false,
            autoRefresh: true,
            refreshInterval: 30,
            autoDeleteResolved: true,
            resolvedRetentionHours: 24,
            sessionTimeout: 60,
            lastUpdated: new Date().toISOString()
        };
    }

    saveSettings() {
        this.settings.lastUpdated = new Date().toISOString();
        localStorage.setItem('campus_care_admin_settings', JSON.stringify(this.settings));
        this.syncToSupabase();
        this.applySettingsToPage();
        return this.settings;
    }

    async syncToSupabase() {
        if (!currentAdminData || !currentAdminData.email) return;
        try {
            const { error } = await supabase
                .from('admin')
                .update({ settings: this.settings, updated_at: new Date().toISOString() })
                .eq('email', currentAdminData.email);
            if (error) console.error('Error syncing settings:', error);
        } catch (err) {
            console.error('Sync error:', err);
        }
    }

    async loadFromSupabase() {
        if (!currentAdminData || !currentAdminData.email) return;
        try {
            const { data, error } = await supabase
                .from('admin')
                .select('settings')
                .eq('email', currentAdminData.email)
                .single();
            if (!error && data && data.settings) {
                this.settings = { ...this.settings, ...data.settings };
                localStorage.setItem('campus_care_admin_settings', JSON.stringify(this.settings));
                this.applySettingsToPage();
                this.updateAllUI();
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.updateUIElement(key, value);
        return this;
    }

    update(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
        this.updateAllUI();
        return this;
    }

    applySettingsToPage() {
        this.applyDarkMode(this.settings.darkMode);
        this.applyCompactMode(this.settings.compactMode);
        this.setupAutoRefresh(this.settings.autoRefresh);
        this.applyNotificationSettings();
        this.updateAllUI();
    }

    applyDarkMode(enabled) {
        const toggle = document.getElementById('darkModeToggle');
        const mobileToggle = document.getElementById('mobileDarkModeToggle');
        const darkModeCheckbox = document.getElementById('darkMode');
        
        if (enabled) {
            document.body.classList.add('dark-mode');
            if (toggle) {
                const sunIcon = toggle.querySelector('.sun-icon');
                const moonIcon = toggle.querySelector('.moon-icon');
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            }
            if (mobileToggle) mobileToggle.checked = true;
            if (darkModeCheckbox) darkModeCheckbox.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (toggle) {
                const sunIcon = toggle.querySelector('.sun-icon');
                const moonIcon = toggle.querySelector('.moon-icon');
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
            }
            if (mobileToggle) mobileToggle.checked = false;
            if (darkModeCheckbox) darkModeCheckbox.checked = false;
        }
    }

    applyCompactMode(enabled) {
        if (enabled) {
            document.body.classList.add('compact-mode');
            let style = document.getElementById('compact-mode-styles');
            if (!style) {
                style = document.createElement('style');
                style.id = 'compact-mode-styles';
                style.textContent = `
                    .compact-mode main { padding: 16px 20px !important; }
                    .compact-mode .stat-card { padding: 10px 14px !important; }
                    .compact-mode .page-header { padding: 12px 16px !important; margin-bottom: 16px !important; }
                    .compact-mode .settings-panel { padding: 16px 20px !important; }
                    .compact-mode .form-group input { padding: 6px 10px !important; }
                `;
                document.head.appendChild(style);
            }
        } else {
            document.body.classList.remove('compact-mode');
            const style = document.getElementById('compact-mode-styles');
            if (style) style.remove();
        }
    }

    setupAutoRefresh(enabled) {
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
            window.autoRefreshInterval = null;
        }
        if (enabled && this.settings.refreshInterval) {
            window.autoRefreshInterval = setInterval(() => {
                if (typeof loadStats === 'function') loadStats();
                if (window.location.pathname.includes('setting.html')) {
                    console.log('Auto-refreshing stats...');
                }
            }, this.settings.refreshInterval * 1000);
        }
    }

    applyNotificationSettings() {
        if (this.settings.pushNotifications && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    updateUIElement(key, value) {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.type === 'range') {
                element.value = value;
                const displayId = key === 'refreshInterval' ? 'refreshValue' : 'retentionValue';
                const display = document.getElementById(displayId);
                if (display) display.textContent = `${value}${key === 'refreshInterval' ? 's' : 'h'}`;
            } else {
                element.value = value;
            }
        }
    }

    updateAllUI() {
        const elements = ['emailNotifications', 'pushNotifications', 'defaultView', 'darkMode', 'compactMode', 'autoRefresh', 'refreshInterval', 'autoDeleteResolved', 'resolvedRetentionHours', 'sessionTimeout'];
        for (const key of elements) {
            this.updateUIElement(key, this.settings[key]);
        }
    }

    resetToDefault() {
        if (confirm('⚠️ Reset all settings to default? This will clear your preferences.')) {
            this.settings = this.getDefaultSettings();
            this.saveSettings();
            this.updateAllUI();
            this.applySettingsToPage();
            showToastMessage('Settings reset to default!', 'success');
            addInternalNotification('Settings Reset', 'All settings have been reset to default', false);
        }
    }

    exportSettings() {
        const data = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campus_care_settings_${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToastMessage('Settings exported!', 'success');
        addInternalNotification('Settings Exported', 'Your settings have been exported', false);
    }

    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.settings = { ...this.settings, ...imported };
                this.saveSettings();
                this.updateAllUI();
                this.applySettingsToPage();
                showToastMessage('Settings imported successfully!', 'success');
                addInternalNotification('Settings Imported', 'Your settings have been imported', false);
            } catch (err) {
                showToastMessage('Invalid settings file', 'error');
            }
        };
        reader.readAsText(file);
    }
}

window.persistentSettings = new PersistentSettings();

// ========== LOAD ADMIN DATA ==========
async function loadAdminData() {
    try {
        const stored = localStorage.getItem('currentAdmin');
        if (!stored) {
            window.location.href = '/Assets/login/admin/admin.html';
            return;
        }
        
        currentAdminData = JSON.parse(stored);
        
        const { data, error } = await supabase
            .from('admin')
            .select('*')
            .eq('email', currentAdminData.email)
            .single();
        
        if (!error && data) {
            currentAdminData = data;
            localStorage.setItem('currentAdmin', JSON.stringify(data));
            if (data.settings) {
                window.persistentSettings.settings = { ...window.persistentSettings.settings, ...data.settings };
                localStorage.setItem('campus_care_admin_settings', JSON.stringify(window.persistentSettings.settings));
            }
        }
        
        await window.persistentSettings.loadFromSupabase();
        
        const adminName = currentAdminData.name || currentAdminData.email;
        const initials = adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        const nameInput = document.getElementById('adminFullName');
        const emailInput = document.getElementById('adminEmail');
        const roleInput = document.getElementById('adminRole');
        const createdInput = document.getElementById('adminCreatedAt');
        const drawerName = document.getElementById('drawerAdminName');
        const topName = document.getElementById('topAdminName');
        const drawerInitials = document.getElementById('drawerInitials');
        const mobileAdminName = document.getElementById('mobileAdminName');
        const mobileFullName = document.getElementById('mobileFullName');
        const mobileEmail = document.getElementById('mobileEmail');
        
        if (nameInput) nameInput.value = adminName;
        if (emailInput) emailInput.value = currentAdminData.email || '';
        if (roleInput) roleInput.value = currentAdminData.role || 'Administrator';
        if (createdInput) createdInput.value = currentAdminData.created_at ? new Date(currentAdminData.created_at).toLocaleDateString() : 'N/A';
        if (drawerName) drawerName.textContent = adminName;
        if (topName) topName.textContent = adminName.split(' ')[0] || 'Admin';
        if (drawerInitials) drawerInitials.textContent = initials;
        if (mobileAdminName) mobileAdminName.textContent = adminName;
        if (mobileFullName) mobileFullName.value = adminName;
        if (mobileEmail) mobileEmail.value = currentAdminData.email || '';
        
        window.persistentSettings.applySettingsToPage();
        window.persistentSettings.updateAllUI();
        
        const notificationStatus = document.getElementById('notificationStatus');
        if (notificationStatus && window.persistentSettings.get('pushNotifications')) {
            notificationStatus.textContent = 'Allowed';
        } else if (notificationStatus) {
            notificationStatus.textContent = 'Disabled';
        }
        
    } catch (err) {
        console.error('Load admin error:', err);
    }
}

// ========== SAVE PROFILE (DESKTOP) ==========
async function saveProfile() {
    const newName = document.getElementById('adminFullName').value.trim();
    if (!newName) {
        showToastMessage('Please enter a name', 'error');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('admin')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('email', currentAdminData.email);
        
        if (error) throw error;
        
        currentAdminData.name = newName;
        localStorage.setItem('currentAdmin', JSON.stringify(currentAdminData));
        
        const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const drawerName = document.getElementById('drawerAdminName');
        const topName = document.getElementById('topAdminName');
        const drawerInitials = document.getElementById('drawerInitials');
        const mobileAdminName = document.getElementById('mobileAdminName');
        
        if (drawerName) drawerName.textContent = newName;
        if (topName) topName.textContent = newName.split(' ')[0];
        if (drawerInitials) drawerInitials.textContent = initials;
        if (mobileAdminName) mobileAdminName.textContent = newName;
        
        showToastMessage('Profile updated!', 'success');
        addInternalNotification('Profile Updated', 'Your profile information has been updated', false);
    } catch (err) {
        showToastMessage('Error: ' + err.message, 'error');
    }
}

// ========== SAVE PROFILE (MOBILE) ==========
async function saveMobileProfile() {
    const newName = document.getElementById('mobileFullName').value.trim();
    if (!newName) {
        showToastMessage('Please enter a name', 'error');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('admin')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('email', currentAdminData.email);
        
        if (error) throw error;
        
        currentAdminData.name = newName;
        localStorage.setItem('currentAdmin', JSON.stringify(currentAdminData));
        
        const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const drawerName = document.getElementById('drawerAdminName');
        const topName = document.getElementById('topAdminName');
        const drawerInitials = document.getElementById('drawerInitials');
        const mobileAdminName = document.getElementById('mobileAdminName');
        
        if (drawerName) drawerName.textContent = newName;
        if (topName) topName.textContent = newName.split(' ')[0];
        if (drawerInitials) drawerInitials.textContent = initials;
        if (mobileAdminName) mobileAdminName.textContent = newName;
        
        showToastMessage('Profile updated!', 'success');
        addInternalNotification('Profile Updated', 'Your profile information has been updated', false);
        closeProfileModal();
    } catch (err) {
        showToastMessage('Error: ' + err.message, 'error');
    }
}

// ========== CHANGE PASSWORD ==========
async function changePassword() {
    const currentPwd = document.getElementById('currentPassword')?.value;
    const newPwd = document.getElementById('newPassword')?.value;
    const confirmPwd = document.getElementById('confirmPassword')?.value;
    
    if (!currentPwd || !newPwd || !confirmPwd) {
        showToastMessage('Please fill all fields', 'error');
        return;
    }
    if (newPwd.length < 6) {
        showToastMessage('Password must be 6+ characters', 'error');
        return;
    }
    if (newPwd !== confirmPwd) {
        showToastMessage('Passwords do not match', 'error');
        return;
    }
    
    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentAdminData.email,
            password: currentPwd
        });
        if (signInError) {
            showToastMessage('Current password is incorrect', 'error');
            return;
        }
        
        const { error } = await supabase.auth.updateUser({ password: newPwd });
        if (error) throw error;
        
        const currentPwdInput = document.getElementById('currentPassword');
        const newPwdInput = document.getElementById('newPassword');
        const confirmPwdInput = document.getElementById('confirmPassword');
        
        if (currentPwdInput) currentPwdInput.value = '';
        if (newPwdInput) newPwdInput.value = '';
        if (confirmPwdInput) confirmPwdInput.value = '';
        
        showToastMessage('Password changed successfully!', 'success');
        addInternalNotification('Password Changed', 'Your password has been updated', false);
    } catch (err) {
        showToastMessage('Error: ' + err.message, 'error');
    }
}

// ========== SAVE ALL PREFERENCES ==========
function saveAllPreferences() {
    const defaultView = document.getElementById('defaultView')?.value || 'overview';
    const darkMode = document.getElementById('darkMode')?.checked || false;
    const compactMode = document.getElementById('compactMode')?.checked || false;
    const autoRefresh = document.getElementById('autoRefresh')?.checked || true;
    const refreshInterval = parseInt(document.getElementById('refreshInterval')?.value || 30);
    
    window.persistentSettings.update({
        defaultView: defaultView,
        darkMode: darkMode,
        compactMode: compactMode,
        autoRefresh: autoRefresh,
        refreshInterval: refreshInterval,
        lastUpdated: new Date().toISOString()
    });
    
    showToastMessage('All preferences saved!', 'success');
    addInternalNotification('Preferences Saved', 'Your preferences have been saved', false);
}

// ========== SAVE NOTIFICATION SETTINGS ==========
function saveNotificationSettings() {
    const emailNotifications = document.getElementById('emailNotifications')?.checked || false;
    const pushNotifications = document.getElementById('pushNotifications')?.checked || false;
    
    window.persistentSettings.update({
        emailNotifications: emailNotifications,
        pushNotifications: pushNotifications
    });
    
    const notificationStatus = document.getElementById('notificationStatus');
    if (notificationStatus) {
        notificationStatus.textContent = pushNotifications ? 'Allowed' : 'Disabled';
    }
    
    const mobileNotificationStatus = document.getElementById('mobileNotificationStatus');
    if (mobileNotificationStatus) {
        mobileNotificationStatus.textContent = pushNotifications ? 'Allowed' : 'Disabled';
    }
    
    showToastMessage('Notification settings saved!', 'success');
    addInternalNotification('Notification Settings', 'Your notification preferences have been updated', false);
}

// ========== SAVE DATA SETTINGS ==========
function saveDataSettings() {
    const autoDeleteResolved = document.getElementById('autoDeleteResolved')?.checked || true;
    const resolvedRetentionHours = parseInt(document.getElementById('resolvedRetentionHours')?.value || 24);
    
    window.persistentSettings.update({
        autoDeleteResolved: autoDeleteResolved,
        resolvedRetentionHours: resolvedRetentionHours
    });
    
    showToastMessage('Data settings saved!', 'success');
    addInternalNotification('Data Settings Saved', 'Your data management settings have been updated', false);
}

// ========== LOAD STATS ==========
async function loadStats() {
    try {
        const { count: incidentsCount } = await supabase.from('incident').select('*', { count: 'exact', head: true });
        const { count: studentsCount } = await supabase.from('student').select('*', { count: 'exact', head: true });
        
        const totalIncidents = document.getElementById('statTotalIncidents');
        const totalStudents = document.getElementById('statTotalStudents');
        const supabaseStatus = document.getElementById('supabaseStatus');
        const localStorageStatus = document.getElementById('localStorageStatus');
        const storageUsed = document.getElementById('storageUsed');
        
        if (totalIncidents) totalIncidents.textContent = incidentsCount || 0;
        if (totalStudents) totalStudents.textContent = studentsCount || 0;
        if (supabaseStatus) supabaseStatus.innerHTML = '<span style="color:#10b981;">✅ Connected</span>';
        if (localStorageStatus) localStorageStatus.innerHTML = '<span style="color:#10b981;">✅ Available</span>';
        
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += (key.length + (value ? value.length : 0)) * 2;
        }
        if (storageUsed) storageUsed.textContent = (totalSize / 1024).toFixed(1) + ' KB';
    } catch (err) {
        const supabaseStatus = document.getElementById('supabaseStatus');
        if (supabaseStatus) supabaseStatus.innerHTML = '<span style="color:#ef4444;">❌ Disconnected</span>';
    }
}

// ========== EXPORT DATA ==========
async function exportIncidents() {
    try {
        const { data } = await supabase.from('incident').select('*');
        if (!data || data.length === 0) {
            showToastMessage('No incidents to export', 'error');
            return;
        }
        let csv = 'ID,Title,Location,Category,Priority,Status,Student Name,Student ID,Date\n';
        data.forEach(item => {
            csv += `"${item.id}","${(item.title || '').replace(/"/g, '""')}","${(item.location || '').replace(/"/g, '""')}","${item.category || ''}","${item.priority || ''}","${item.status || ''}","${(item.student_name || '').replace(/"/g, '""')}","${item.student_id_number || ''}","${item.created_at || ''}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `incidents_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToastMessage(`Exported ${data.length} incidents`, 'success');
        addInternalNotification('Data Exported', `Exported ${data.length} incidents to CSV`, false);
    } catch (err) {
        showToastMessage('Error exporting incidents', 'error');
    }
}

async function exportStudents() {
    try {
        const { data } = await supabase.from('student').select('*');
        if (!data || data.length === 0) {
            showToastMessage('No students to export', 'error');
            return;
        }
        let csv = 'ID,Full Name,Student ID,Email,Status,Created At\n';
        data.forEach(item => {
            csv += `"${item.id}","${(item.full_name || '').replace(/"/g, '""')}","${item.student_id || ''}","${item.email || ''}","${item.status || 'active'}","${item.created_at || ''}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `students_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToastMessage(`Exported ${data.length} students`, 'success');
        addInternalNotification('Data Exported', `Exported ${data.length} students to CSV`, false);
    } catch (err) {
        showToastMessage('Error exporting students', 'error');
    }
}

// ========== CLEAR INCIDENTS ==========
async function clearIncidents() {
    try {
        const { error } = await supabase.from('incident').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        localStorage.setItem('campus_care_reports', '[]');
        showToastMessage('All incidents cleared successfully!', 'success');
        addInternalNotification('Data Cleared', 'All incidents have been cleared from the system', false);
        await loadStats();
    } catch (err) {
        showToastMessage('Error clearing incidents: ' + err.message, 'error');
    }
}

// ========== MODAL ==========
let pendingClear = null;

function showConfirmModal(message, callback) {
    const modal = document.getElementById('confirmationModal');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    
    if (!modal) {
        if (confirm(message)) {
            callback();
        }
        return;
    }
    
    if (modalMessage) modalMessage.textContent = message;
    pendingClear = callback;
    modal.classList.add('active');
    
    const handleConfirm = () => {
        if (pendingClear) pendingClear();
        closeModal();
        cleanup();
    };
    const handleCancel = () => {
        closeModal();
        cleanup();
    };
    const cleanup = () => {
        if (confirmBtn) confirmBtn.removeEventListener('click', handleConfirm);
        if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
    };
    if (confirmBtn) {
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        newConfirm.addEventListener('click', handleConfirm);
    }
    if (cancelBtn) {
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', handleCancel);
    }
}

function closeModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) modal.classList.remove('active');
    pendingClear = null;
}

// ========== TABS (Modified: Security Tab Removed from Sidebar) ==========
function setupTabs() {
    // Remove the Security tab from the sidebar
    const securityTab = document.querySelector('.settings-sidebar-item[data-tab="security"]');
    if (securityTab) {
        securityTab.remove();
    }
    
    const tabs = document.querySelectorAll('.settings-sidebar-item');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            contents.forEach(c => c.style.display = 'none');
            const activeTab = document.getElementById(`tab-${this.dataset.tab}`);
            if (activeTab) activeTab.style.display = 'block';
        });
    });
}

// ========== MOBILE MODAL FUNCTIONS ==========
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('active');
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
}

function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.add('active');
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.remove('active');
}

function openLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) modal.classList.add('active');
}

function closeLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) modal.classList.remove('active');
}

function selectLanguage(lang) {
    const selectedLanguage = document.getElementById('selectedLanguage');
    if (selectedLanguage) selectedLanguage.textContent = lang;
    closeLanguageModal();
    showToastMessage(`Language set to ${lang}`, 'success');
    addInternalNotification('Language Changed', `Language set to ${lang}`, false);
}

function openFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    const feedbackText = document.getElementById('feedbackText');
    if (feedbackText) feedbackText.value = '';
    if (modal) modal.classList.add('active');
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.classList.remove('active');
}

function sendFeedback() {
    const feedback = document.getElementById('feedbackText')?.value.trim();
    if (!feedback) {
        showToastMessage('Please enter your feedback', 'error');
        return;
    }
    showToastMessage('Thank you for your feedback!', 'success');
    addInternalNotification('Feedback Received', 'Thanks for sharing your thoughts!', false);
    closeFeedbackModal();
}

// ========== NAVIGATION ==========
function setupNavigation() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const hamburger = document.getElementById('hamburger');
    const adminPill = document.getElementById('adminPill');
    const notificationBell = document.getElementById('notificationBell');
    
    if (notificationBell) {
        const newBell = notificationBell.cloneNode(true);
        notificationBell.parentNode.replaceChild(newBell, notificationBell);
        newBell.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationDropdown();
        });
    }
    
    if (hamburger) hamburger.onclick = () => { drawer.classList.toggle('open'); if (overlay) overlay.classList.toggle('open'); };
    if (adminPill) adminPill.onclick = () => { drawer.classList.toggle('open'); if (overlay) overlay.classList.toggle('open'); };
    if (overlay) overlay.onclick = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };
    
    document.querySelectorAll('.drawer-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        newItem.addEventListener('click', () => {
            const page = newItem.dataset.page;
            if (page === 'dashboard') window.location.href = '/Assets/Admin_dashboard/Admin.html';
            else if (page === 'incidents') window.location.href = '/Assets/Admin_dashboard/incident/incident.html';
            else if (page === 'users') window.location.href = '/Assets/Admin_dashboard/user_page/user.html';
            else if (page === 'analytics') window.location.href = '/Assets/Admin_dashboard/analytics/analytics.html';
            else if (page === 'settings') window.location.href = '/Assets/Admin_dashboard/settings/setting.html';
            drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
        });
    });
    
    // IMPROVED LOGOUT BUTTON
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            confirmLogout();
        });
    }
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && drawer && hamburger && !drawer.contains(e.target) && !hamburger.contains(e.target)) {
            drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isNotificationDropdownOpen) {
                const dropdown = document.getElementById('notificationDropdown');
                if (dropdown) dropdown.classList.remove('show');
                isNotificationDropdownOpen = false;
            }
            closeProfileModal();
            closeNotificationsModal();
            closeLanguageModal();
            closeFeedbackModal();
            closeModal();
        }
    });
}

// ========== SETUP BUTTONS ==========
function setupButtons() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const savePreferencesBtn = document.getElementById('savePreferencesBtn');
    const saveNotificationsBtn = document.getElementById('saveNotificationsBtn');
    const saveDataSettingsBtn = document.getElementById('saveDataSettingsBtn');
    const exportIncidentsBtn = document.getElementById('exportIncidentsBtn');
    const exportStudentsBtn = document.getElementById('exportStudentsBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    const importSettingsBtn = document.getElementById('importSettingsBtn');
    const importSettingsInput = document.getElementById('importSettingsInput');
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    
    if (saveProfileBtn) saveProfileBtn.onclick = saveProfile;
    if (changePasswordBtn) changePasswordBtn.onclick = changePassword;
    if (savePreferencesBtn) savePreferencesBtn.onclick = saveAllPreferences;
    if (saveNotificationsBtn) saveNotificationsBtn.onclick = saveNotificationSettings;
    if (saveDataSettingsBtn) saveDataSettingsBtn.onclick = saveDataSettings;
    if (exportIncidentsBtn) exportIncidentsBtn.onclick = exportIncidents;
    if (exportStudentsBtn) exportStudentsBtn.onclick = exportStudents;
    if (clearDataBtn) clearDataBtn.onclick = () => showConfirmModal('⚠️ Clear ALL incidents? This cannot be undone.', clearIncidents);
    if (refreshStatsBtn) refreshStatsBtn.onclick = loadStats;
    
    if (resetSettingsBtn) {
        resetSettingsBtn.onclick = () => window.persistentSettings.resetToDefault();
    }
    
    if (exportSettingsBtn) {
        exportSettingsBtn.onclick = () => window.persistentSettings.exportSettings();
    }
    
    if (importSettingsBtn && importSettingsInput) {
        importSettingsBtn.onclick = () => importSettingsInput.click();
        importSettingsInput.onchange = (e) => {
            if (e.target.files.length) {
                window.persistentSettings.importSettings(e.target.files[0]);
                importSettingsInput.value = '';
            }
        };
    }
}

// ========== BOTTOM NAVIGATION ==========
function initBottomNav() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        newItem.addEventListener('click', () => {
            const page = newItem.dataset.page;
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

// ========== INITIALIZE ==========
async function init() {
    console.log('Initializing Settings page...');
    loadNotifications();
    initDarkMode();
    await loadAdminData();
    await loadStats();
    setupTabs();
    setupNavigation();
    setupButtons();
    initBottomNav();
    
    // Set up auto-refresh interval
    if (window.persistentSettings.get('autoRefresh')) {
        window.persistentSettings.setupAutoRefresh(true);
    }
    
    // Expose functions globally for HTML onclick
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.saveMobileProfile = saveMobileProfile;
    window.openNotificationsModal = openNotificationsModal;
    window.closeNotificationsModal = closeNotificationsModal;
    window.openLanguageModal = openLanguageModal;
    window.closeLanguageModal = closeLanguageModal;
    window.selectLanguage = selectLanguage;
    window.openFeedbackModal = openFeedbackModal;
    window.closeFeedbackModal = closeFeedbackModal;
    window.sendFeedback = sendFeedback;
    window.confirmLogout = confirmLogout;
    window.closeModal = closeModal;
    window.saveNotificationSettings = saveNotificationSettings;
    window.saveAllPreferences = saveAllPreferences;
    window.saveDataSettings = saveDataSettings;
    window.exportIncidents = exportIncidents;
    window.exportStudents = exportStudents;
    window.clearIncidents = clearIncidents;
    window.resetSettings = () => window.persistentSettings.resetToDefault();
    window.exportSettings = () => window.persistentSettings.exportSettings();
    window.importSettings = () => document.getElementById('importSettingsInput')?.click();
    window.showToastMessage = showToastMessage;
}

init();