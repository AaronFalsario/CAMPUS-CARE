import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// ========== TRANSLATIONS ==========
const translations = {
    en: {
        'settings': 'Settings',
        'dashboard': 'Dashboard',
        'report': 'New Report',
        'home': 'Home',
        'logout': 'Logout',
        'save_changes': 'Save Changes',
        'cancel': 'Cancel',
        'send': 'Send',
        'edit_profile': 'Edit Profile',
        'full_name': 'Full Name',
        'student_id': 'Student ID',
        'email_address': 'Email Address',
        'change_photo': 'Change Photo',
        'notifications': 'Notifications',
        'email_notifications': 'Email Notifications',
        'push_notifications': 'Push Notifications',
        'dark_mode': 'Dark Mode',
        'language': 'Language',
        'rate_us': 'Rate us',
        'feedback': 'Feedback',
        'log_out': 'Log out',
        'your_account': 'Your account',
        'account': 'ACCOUNT',
        'notifications_section': 'NOTIFICATIONS',
        'about_us': 'ABOUT US',
        'danger_zone': 'DANGER ZONE',
        'select_language': 'Select Language',
        'send_feedback': 'Send Feedback',
        'your_feedback': 'Your Feedback',
        'rating_optional': 'Rating (Optional)',
        'category': 'Category',
        'general_feedback': 'General Feedback',
        'bug_report': 'Bug Report',
        'feature_request': 'Feature Request',
        'improvement_suggestion': 'Improvement Suggestion',
        'complaint': 'Complaint',
        'excellent': 'Excellent',
        'good': 'Good',
        'average': 'Average',
        'poor': 'Poor',
        'very_poor': 'Very Poor',
        'select_rating': 'Select rating',
        'profile_updated': 'Profile updated successfully!',
        'settings_saved': 'Settings saved!',
        'feedback_thanks': 'Thank you for your feedback! 🎉',
        'logout_success': 'Logged out successfully',
        'language_changed': 'Language changed to',
        'dark_mode_enabled': 'Dark mode enabled 🌙',
        'light_mode_enabled': 'Light mode enabled ☀️',
        'image_updated': 'Profile picture updated!',
        'invalid_image': 'Please select a valid image (JPEG/PNG)',
        'enter_name': 'Please enter your name',
        'enter_feedback': 'Please enter your feedback',
        'login_required': 'Please login to submit feedback',
        'confirm_logout': 'Are you sure you want to logout?',
        'allowed': 'Allowed',
        'disabled': 'Disabled',
        'pending': 'pending',
        '1st_year': '1st Year',
        '2nd_year': '2nd Year',
        '3rd_year': '3rd Year',
        '4th_year': '4th Year',
        'clear_all': 'Clear all',
        'no_notifications': 'No notifications yet',
        'student_role': 'Student',
        'profile_information': 'Profile Information',
        'update_personal_details': 'Update your personal details',
        'receive_updates_via_email': 'Receive updates via email',
        'incident_updates': 'Incident Updates',
        'get_notified_about_reports': 'Get notified about report status changes',
        'campus_announcements': 'Campus Announcements',
        'receive_important_news': 'Receive important campus news',
        'save_preferences': 'Save Preferences',
        'switch_light_dark': 'Switch between light and dark theme',
        'write_about_us': 'Write about us in your store',
        'write_your_opinion': 'Write your opinion for us',
        'sign_out_account': 'Sign out of your account',
        'edit_profile_title': 'Edit Profile',
        'notification_settings': 'Notification Settings',
        'write_opinion': 'Write your opinion about CampusCare...',
        'language_settings': 'Language Settings',
        'select_preferred_language': 'Choose your preferred language',
        'send_feedback_desktop': 'Send Feedback',
        'share_your_thoughts': 'Share your thoughts, suggestions, or report issues',
        'feedback_history': 'Feedback History',
        'your_previous_feedback': 'View your previous feedback and their status',
        'date': 'Date',
        'rating': 'Rating',
        'status': 'Status',
        'no_feedback_yet': 'No feedback submitted yet',
        'submit_feedback_to_see': 'Submit your first feedback using the form above',
        'total_feedback': 'total feedback entries',
        'sending': 'Sending...'
    },
    tl: {
        'settings': 'Mga Setting',
        'dashboard': 'Dashboard',
        'report': 'Bagong Ulat',
        'home': 'Bahay',
        'logout': 'Mag-logout',
        'save_changes': 'I-save',
        'cancel': 'Kanselahin',
        'send': 'Ipadala',
        'edit_profile': 'I-edit ang Profile',
        'full_name': 'Buong Pangalan',
        'student_id': 'ID ng Mag-aaral',
        'email_address': 'Email',
        'change_photo': 'Palitan ang Larawan',
        'notifications': 'Mga Abiso',
        'email_notifications': 'Mga Abiso sa Email',
        'push_notifications': 'Push Abiso',
        'dark_mode': 'Madilim na Mode',
        'language': 'Wika',
        'rate_us': 'I-rate kami',
        'feedback': 'Feedback',
        'log_out': 'Mag-logout',
        'your_account': 'Iyong account',
        'account': 'ACCOUNT',
        'notifications_section': 'MGA ABISO',
        'about_us': 'TUNGKOL SA AMIN',
        'danger_zone': 'DELIKADONG SONA',
        'select_language': 'Pumili ng Wika',
        'send_feedback': 'Magpadala ng Feedback',
        'your_feedback': 'Iyong Feedback',
        'rating_optional': 'Rating (Opsyonal)',
        'category': 'Kategorya',
        'general_feedback': 'Pangkalahatan',
        'bug_report': 'Ulat ng Bug',
        'feature_request': 'Kahilingan ng Tampok',
        'improvement_suggestion': 'Mungkahi ng Pagpapabuti',
        'complaint': 'Reklamo',
        'excellent': 'Napakahusay',
        'good': 'Mabuti',
        'average': 'Katamtaman',
        'poor': 'Mahina',
        'very_poor': 'Napakahina',
        'select_rating': 'Pumili ng rating',
        'profile_updated': 'Na-update ang profile!',
        'settings_saved': 'Na-save ang mga setting!',
        'feedback_thanks': 'Salamat sa iyong feedback! 🎉',
        'logout_success': 'Matagumpay na naka-logout',
        'language_changed': 'Ang wika ay pinalitan sa',
        'dark_mode_enabled': 'Pinagana ang madilim na mode 🌙',
        'light_mode_enabled': 'Pinagana ang maliwanag na mode ☀️',
        'image_updated': 'Na-update ang larawan!',
        'invalid_image': 'Pumili ng wastong larawan (JPEG/PNG)',
        'enter_name': 'Pakilagay ang iyong pangalan',
        'enter_feedback': 'Pakilagay ang iyong feedback',
        'login_required': 'Mag-login para mag-feedback',
        'confirm_logout': 'Sigurado ka bang gusto mong mag-logout?',
        'allowed': 'Pinapayagan',
        'disabled': 'Hindi Pinapayagan',
        'pending': 'nakabinbin',
        '1st_year': 'Unang Taon',
        '2nd_year': 'Ikalawang Taon',
        '3rd_year': 'Ikatlong Taon',
        '4th_year': 'Ikaapat na Taon',
        'clear_all': 'Linisin lahat',
        'no_notifications': 'Wala pang abiso',
        'student_role': 'Mag-aaral',
        'profile_information': 'Impormasyon ng Profile',
        'update_personal_details': 'I-update ang iyong impormasyon',
        'receive_updates_via_email': 'Tumanggap ng mga update sa email',
        'incident_updates': 'Mga Update sa Insidente',
        'get_notified_about_reports': 'Makatanggap ng abiso sa status ng ulat',
        'campus_announcements': 'Mga Anunsyo sa Campus',
        'receive_important_news': 'Tumanggap ng mahahalagang balita',
        'save_preferences': 'I-save ang mga Kagustuhan',
        'switch_light_dark': 'Lumipat sa maliwanag o madilim na tema',
        'write_about_us': 'Sumulat tungkol sa amin',
        'write_your_opinion': 'Isulat ang iyong opinyon',
        'sign_out_account': 'Mag-sign out sa iyong account',
        'edit_profile_title': 'I-edit ang Profile',
        'notification_settings': 'Mga Setting ng Abiso',
        'write_opinion': 'Isulat ang iyong opinyon tungkol sa CampusCare...',
        'language_settings': 'Mga Setting ng Wika',
        'select_preferred_language': 'Piliin ang iyong gustong wika',
        'send_feedback_desktop': 'Magpadala ng Feedback',
        'share_your_thoughts': 'Ibahagi ang iyong mga saloobin, mungkahi, o iulat ang mga isyu',
        'feedback_history': 'Kasaysayan ng Feedback',
        'your_previous_feedback': 'Tingnan ang iyong mga nakaraang feedback at ang kanilang katayuan',
        'date': 'Petsa',
        'rating': 'Rating',
        'status': 'Katayuan',
        'no_feedback_yet': 'Wala pang naisumiteng feedback',
        'submit_feedback_to_see': 'I-submit ang iyong unang feedback gamit ang form sa itaas',
        'total_feedback': 'kabuuang feedback entries',
        'sending': 'Ipinapadala...'
    }
};

let currentLanguage = 'en';

function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            if (placeholderKey) el.placeholder = t(placeholderKey);
        } else {
            el.textContent = t(key);
        }
    });
    
    const yearSelect = document.getElementById('yearLevelDesktop');
    if (yearSelect) {
        const options = yearSelect.options;
        for (let i = 0; i < options.length; i++) {
            const yearKey = `${i+1}st_year`;
            options[i].textContent = t(yearKey);
        }
    }
    
    const mobileNotifStatus = document.getElementById('mobileNotifStatus');
    if (mobileNotifStatus) {
        const saved = localStorage.getItem('student_notification_prefs');
        const prefs = saved ? JSON.parse(saved) : { email: true, push: true };
        mobileNotifStatus.textContent = (prefs.email || prefs.push) ? t('allowed') : t('disabled');
    }
    
    const checkEnglish = document.getElementById('checkEnglishDesktop');
    const checkTagalog = document.getElementById('checkTagalogDesktop');
    if (checkEnglish) checkEnglish.style.display = currentLanguage === 'en' ? 'inline-block' : 'none';
    if (checkTagalog) checkTagalog.style.display = currentLanguage === 'tl' ? 'inline-block' : 'none';
    
    const checkEnglishMobile = document.getElementById('checkEnglishMobile');
    const checkFilipinoMobile = document.getElementById('checkFilipinoMobile');
    if (checkEnglishMobile) checkEnglishMobile.style.display = currentLanguage === 'en' ? 'block' : 'none';
    if (checkFilipinoMobile) checkFilipinoMobile.style.display = currentLanguage === 'tl' ? 'block' : 'none';
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('student_language', lang);
    updateUIText();
    
    const mobileLanguage = document.getElementById('mobileLanguage');
    if (mobileLanguage) mobileLanguage.textContent = lang === 'en' ? 'English' : 'Tagalog';
}

// ========== LOCK EMAIL FIELD (MAKE UNCHANGEABLE) ==========
function lockEmailFields() {
    const emailDesktop = document.getElementById('emailDesktop');
    if (emailDesktop) {
        emailDesktop.readOnly = true;
        emailDesktop.disabled = true;
        emailDesktop.style.backgroundColor = 'var(--bg)';
        emailDesktop.style.cursor = 'not-allowed';
        emailDesktop.style.opacity = '0.7';
    }
    
    const emailMobile = document.getElementById('mobileEmailInput');
    if (emailMobile) {
        emailMobile.readOnly = true;
        emailMobile.disabled = true;
        emailMobile.style.backgroundColor = 'var(--bg)';
        emailMobile.style.cursor = 'not-allowed';
        emailMobile.style.opacity = '0.7';
    }
}

// ========== DATABASE UPDATE FUNCTIONS ==========
async function updateStudentInDatabase(studentData) {
    try {
        const { data, error } = await supabase
            .from('student')
            .update({
                full_name: studentData.full_name
            })
            .eq('student_id', studentData.student_id)
            .select();
        
        if (error) {
            console.error('Supabase update error:', error);
            return { success: false, error: error.message };
        }
        
        console.log('Student updated in database:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error updating student:', error);
        return { success: false, error: error.message };
    }
}

function broadcastStudentUpdate(studentData) {
    localStorage.setItem('student_data_updated', JSON.stringify({
        timestamp: Date.now(),
        student: studentData
    }));
    
    if (window.opener && !window.opener.closed) {
        try {
            window.opener.postMessage({
                type: 'STUDENT_UPDATE',
                student: studentData
            }, '*');
        } catch(e) { console.log('Cannot send to opener'); }
    }
    
    setTimeout(() => localStorage.removeItem('student_data_updated'), 500);
}

// ========== STUDENT DATA ==========
let currentStudent = null;

function loadStudentData() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        try {
            currentStudent = JSON.parse(stored);
            
            // Desktop
            const drawerStudentName = document.getElementById('drawerStudentName');
            if (drawerStudentName) drawerStudentName.textContent = currentStudent.name || 'Student';
            
            const fullNameDesktop = document.getElementById('fullNameDesktop');
            if (fullNameDesktop) fullNameDesktop.value = currentStudent.name || '';
            
            const studentIdDesktop = document.getElementById('studentIdDesktop');
            if (studentIdDesktop) studentIdDesktop.value = currentStudent.studentId || 'N/A';
            
            const emailDesktop = document.getElementById('emailDesktop');
            if (emailDesktop) {
                emailDesktop.value = currentStudent.email || '';
                emailDesktop.readOnly = true;
                emailDesktop.disabled = true;
                emailDesktop.style.backgroundColor = 'var(--bg)';
                emailDesktop.style.cursor = 'not-allowed';
                emailDesktop.style.opacity = '0.7';
            }
            
            // Mobile
            const mobileName = document.getElementById('mobileName');
            if (mobileName) mobileName.textContent = currentStudent.name || 'Student';
            
            const mobileEmail = document.getElementById('mobileEmail');
            if (mobileEmail) mobileEmail.textContent = currentStudent.email || 'student@campus.edu';
            
            const mobileFullNameInput = document.getElementById('mobileFullNameInput');
            if (mobileFullNameInput) mobileFullNameInput.value = currentStudent.name || '';
            
            const mobileStudentIdInput = document.getElementById('mobileStudentIdInput');
            if (mobileStudentIdInput) mobileStudentIdInput.value = currentStudent.studentId || 'N/A';
            
            const mobileEmailInput = document.getElementById('mobileEmailInput');
            if (mobileEmailInput) {
                mobileEmailInput.value = currentStudent.email || '';
                mobileEmailInput.readOnly = true;
                mobileEmailInput.disabled = true;
                mobileEmailInput.style.backgroundColor = 'var(--bg)';
                mobileEmailInput.style.cursor = 'not-allowed';
                mobileEmailInput.style.opacity = '0.7';
            }
            
            const initial = (currentStudent.name || 'S').charAt(0).toUpperCase();
            const mobileAvatar = document.getElementById('mobileAvatar');
            if (mobileAvatar) mobileAvatar.textContent = initial;
            
            loadProfileImage();
        } catch(e) { console.error(e); }
    }
    
    lockEmailFields();
}

// ========== PROFILE SAVE FUNCTIONS (NAME ONLY) ==========
async function saveProfileDesktop() {
    const newName = document.getElementById('fullNameDesktop')?.value;
    if (!newName) {
        showToast(t('enter_name'), 'error');
        return;
    }
    
    if (!currentStudent) {
        showToast('Session expired. Please login again.', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtnDesktop');
    const originalText = saveBtn?.textContent;
    
    if (saveBtn) {
        saveBtn.textContent = t('sending') || 'Saving...';
        saveBtn.disabled = true;
    }
    
    try {
        const result = await updateStudentInDatabase({
            student_id: currentStudent.studentId,
            full_name: newName
        });
        
        if (result.success) {
            currentStudent.name = newName;
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
            loadStudentData();
            broadcastStudentUpdate(currentStudent);
            showToast(t('profile_updated'), 'success');
        } else {
            showToast('Failed to update: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
}

async function saveProfileMobile() {
    const newName = document.getElementById('mobileFullNameInput').value;
    if (!newName) { 
        showToast(t('enter_name'), 'error'); 
        return; 
    }
    
    if (!currentStudent) {
        showToast('Session expired. Please login again.', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('#profileModalMobile .btn-save');
    const originalText = saveBtn?.textContent;
    
    if (saveBtn) {
        saveBtn.textContent = t('sending') || 'Saving...';
        saveBtn.disabled = true;
    }
    
    try {
        const result = await updateStudentInDatabase({
            student_id: currentStudent.studentId,
            full_name: newName
        });
        
        if (result.success) {
            currentStudent.name = newName;
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
            loadStudentData();
            broadcastStudentUpdate(currentStudent);
            showToast(t('profile_updated'), 'success');
            closeProfileModalMobile();
        } else {
            showToast('Failed to update: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
}

// Profile Image
function loadProfileImage() {
    if (!currentStudent) return;
    const saved = localStorage.getItem(`avatar_${currentStudent.studentId}`);
    if (saved) {
        const previewDesktop = document.getElementById('avatarPreviewDesktop');
        const drawerAvatar = document.getElementById('drawerAvatar');
        const mobileAvatar = document.getElementById('mobileAvatar');
        if (previewDesktop) previewDesktop.innerHTML = `<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        if (drawerAvatar) drawerAvatar.innerHTML = `<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        if (mobileAvatar) mobileAvatar.innerHTML = `<img src="${saved}" style="width:70px;height:70px;object-fit:cover;border-radius:50%">`;
    }
}

function setupAvatarUpload() {
    const uploadBtn = document.getElementById('uploadBtnDesktop');
    const avatarInput = document.getElementById('avatarInputDesktop');
    if (uploadBtn && avatarInput) {
        uploadBtn.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const imageData = ev.target.result;
                    localStorage.setItem(`avatar_${currentStudent.studentId}`, imageData);
                    loadProfileImage();
                    showToast(t('image_updated'), 'success');
                };
                reader.readAsDataURL(file);
            } else {
                showToast(t('invalid_image'), 'error');
            }
        });
    }
}

// ========== NOTIFICATION SETTINGS ==========
function loadNotificationSettings() {
    const saved = localStorage.getItem('student_notification_prefs');
    const prefs = saved ? JSON.parse(saved) : { email: true, push: true };
    
    const emailNotifDesktop = document.getElementById('emailNotifDesktop');
    if (emailNotifDesktop) emailNotifDesktop.checked = prefs.email;
    
    const incidentNotifDesktop = document.getElementById('incidentNotifDesktop');
    if (incidentNotifDesktop) incidentNotifDesktop.checked = prefs.incident !== undefined ? prefs.incident : true;
    
    const announcementNotifDesktop = document.getElementById('announcementNotifDesktop');
    if (announcementNotifDesktop) announcementNotifDesktop.checked = prefs.announcement !== undefined ? prefs.announcement : true;
    
    const mobileEmailNotif = document.getElementById('mobileEmailNotif');
    if (mobileEmailNotif) mobileEmailNotif.checked = prefs.email;
    
    const mobilePushNotif = document.getElementById('mobilePushNotif');
    if (mobilePushNotif) mobilePushNotif.checked = prefs.push;
    
    const mobileNotifStatus = document.getElementById('mobileNotifStatus');
    if (mobileNotifStatus) mobileNotifStatus.textContent = (prefs.email || prefs.push) ? t('allowed') : t('disabled');
}

function saveNotificationSettingsMobile() {
    const prefs = {
        email: document.getElementById('mobileEmailNotif')?.checked || false,
        push: document.getElementById('mobilePushNotif')?.checked || false,
        incident: document.getElementById('incidentNotifDesktop')?.checked || true,
        announcement: document.getElementById('announcementNotifDesktop')?.checked || true
    };
    localStorage.setItem('student_notification_prefs', JSON.stringify(prefs));
    const mobileNotifStatus = document.getElementById('mobileNotifStatus');
    if (mobileNotifStatus) mobileNotifStatus.textContent = (prefs.email || prefs.push) ? t('allowed') : t('disabled');
    showToast(t('settings_saved'), 'success');
    closeNotificationsModalMobile();
}

function saveNotificationSettingsDesktop() {
    const prefs = {
        email: document.getElementById('emailNotifDesktop')?.checked || false,
        incident: document.getElementById('incidentNotifDesktop')?.checked || true,
        announcement: document.getElementById('announcementNotifDesktop')?.checked || true,
        push: document.getElementById('mobilePushNotif')?.checked || true
    };
    localStorage.setItem('student_notification_prefs', JSON.stringify(prefs));
    showToast(t('settings_saved'), 'success');
}

// ========== LANGUAGE ==========
function loadLanguage() {
    const saved = localStorage.getItem('student_language');
    if (saved === 'tl') {
        setLanguage('tl');
    } else {
        setLanguage('en');
    }
}

function selectLanguageMobile(lang) {
    const newLang = lang === 'English' ? 'en' : 'tl';
    setLanguage(newLang);
    closeLanguageModalMobile();
    showToast(`${t('language_changed')} ${lang}`, 'success');
}

function selectLanguageDesktop(lang) {
    const newLang = lang === 'English' ? 'en' : 'tl';
    setLanguage(newLang);
    showToast(`${t('language_changed')} ${lang}`, 'success');
}

// ========== FEEDBACK WITH SUPABASE ==========
async function saveFeedbackToSupabase(feedbackData) {
    try {
        const { data, error } = await supabase
            .from('feedback')
            .insert([{
                student_id: feedbackData.student_id,
                student_name: feedbackData.student_name,
                feedback_text: feedbackData.feedback_text,
                rating: feedbackData.rating || null,
                category: feedbackData.category || 'general',
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return { success: false, error: error.message };
        }

        console.log('Feedback saved to Supabase:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving feedback:', error);
        return { success: false, error: error.message };
    }
}

function saveFeedbackToLocalStorage(feedbackData) {
    const feedbacks = JSON.parse(localStorage.getItem('student_feedback') || '[]');
    feedbacks.unshift({
        id: Date.now(),
        ...feedbackData,
        date: new Date().toISOString()
    });
    localStorage.setItem('student_feedback', JSON.stringify(feedbacks));
}

async function sendFeedbackMobile() {
    const feedbackTextMobile = document.getElementById('feedbackTextMobile');
    const feedback = feedbackTextMobile?.value?.trim();
    
    if (!feedback) {
        showToast(t('enter_feedback'), 'error');
        return;
    }
    
    if (!currentStudent) {
        showToast(t('login_required'), 'error');
        return;
    }
    
    const sendBtn = document.querySelector('#feedbackModalMobile .btn-save');
    const originalText = sendBtn?.textContent;
    if (sendBtn) {
        sendBtn.textContent = t('sending');
        sendBtn.disabled = true;
    }
    
    const ratingElement = document.getElementById('feedbackRating');
    const rating = ratingElement ? parseInt(ratingElement.value) : null;
    
    const categoryElement = document.getElementById('feedbackCategory');
    const category = categoryElement ? categoryElement.value : 'general';
    
    const feedbackData = {
        student_id: currentStudent.studentId,
        student_name: currentStudent.name,
        feedback_text: feedback,
        rating: rating,
        category: category,
        timestamp: new Date().toISOString()
    };
    
    const result = await saveFeedbackToSupabase(feedbackData);
    
    if (result.success) {
        saveFeedbackToLocalStorage(feedbackData);
        showToast(t('feedback_thanks'), 'success');
        if (feedbackTextMobile) feedbackTextMobile.value = '';
        if (ratingElement) ratingElement.value = '';
        if (categoryElement) categoryElement.value = 'general';
        closeFeedbackModalMobile();
        displayFeedbackHistoryDesktop();
    } else {
        saveFeedbackToLocalStorage(feedbackData);
        showToast('Feedback saved locally. Will sync when online.', 'warning');
        if (feedbackTextMobile) feedbackTextMobile.value = '';
        closeFeedbackModalMobile();
    }
    
    if (sendBtn) {
        sendBtn.textContent = originalText;
        sendBtn.disabled = false;
    }
}

async function sendFeedbackDesktop() {
    const feedbackText = document.getElementById('feedbackTextDesktop')?.value?.trim();
    
    if (!feedbackText) {
        showToast(t('enter_feedback'), 'error');
        return;
    }
    
    if (!currentStudent) {
        showToast(t('login_required'), 'error');
        return;
    }
    
    const sendBtn = document.getElementById('sendFeedbackBtnDesktop');
    const originalText = sendBtn?.textContent;
    if (sendBtn) {
        sendBtn.textContent = t('sending');
        sendBtn.disabled = true;
    }
    
    const ratingElement = document.getElementById('feedbackRatingDesktop');
    const rating = ratingElement ? parseInt(ratingElement.value) : null;
    
    const categoryElement = document.getElementById('feedbackCategoryDesktop');
    const category = categoryElement ? categoryElement.value : 'general';
    
    const feedbackData = {
        student_id: currentStudent.studentId,
        student_name: currentStudent.name,
        feedback_text: feedbackText,
        rating: rating,
        category: category,
        timestamp: new Date().toISOString()
    };
    
    const result = await saveFeedbackToSupabase(feedbackData);
    
    if (result.success) {
        saveFeedbackToLocalStorage(feedbackData);
        showToast(t('feedback_thanks'), 'success');
        document.getElementById('feedbackTextDesktop').value = '';
        if (ratingElement) ratingElement.value = '';
        if (categoryElement) categoryElement.value = 'general';
        displayFeedbackHistoryDesktop();
    } else {
        saveFeedbackToLocalStorage(feedbackData);
        showToast('Feedback saved locally. Will sync when online.', 'warning');
        document.getElementById('feedbackTextDesktop').value = '';
    }
    
    if (sendBtn) {
        sendBtn.textContent = originalText;
        sendBtn.disabled = false;
    }
}

async function displayFeedbackHistoryDesktop() {
    const historyContainer = document.getElementById('feedbackHistoryDesktop');
    if (!historyContainer) return;
    
    if (!currentStudent) {
        historyContainer.innerHTML = `<div class="feedback-empty-state" style="text-align: center; padding: 40px; color: var(--muted);">
            <i class="fas fa-comment"></i>
            <p>${t('login_to_view_feedback') || 'Login to view your feedback history'}</p>
        </div>`;
        return;
    }
    
    try {
        let feedbacks = [];
        
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('student_id', currentStudent.studentId)
            .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
            feedbacks = data;
        } else {
            const localFeedbacks = JSON.parse(localStorage.getItem('student_feedback') || '[]');
            feedbacks = localFeedbacks.filter(f => f.student_id === currentStudent.studentId);
        }
        
        if (feedbacks.length === 0) {
            historyContainer.innerHTML = `<div class="feedback-empty-state" style="text-align: center; padding: 40px; color: var(--muted);">
                <i class="fas fa-comment" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>${t('no_feedback_yet') || 'No feedback submitted yet'}</p>
                <p style="font-size: 12px; margin-top: 8px;">${t('submit_feedback_to_see') || 'Submit your first feedback using the form above'}</p>
            </div>`;
            return;
        }
        
        historyContainer.innerHTML = `
            <div class="feedback-table-wrapper" style="overflow-x: auto;">
                <table class="feedback-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--primary-light);">
                            <th style="padding: 12px; text-align: left; border-radius: 12px 0 0 0;">${t('date') || 'Date'}</th>
                            <th style="padding: 12px; text-align: left;">${t('feedback') || 'Feedback'}</th>
                            <th style="padding: 12px; text-align: left;">${t('category') || 'Category'}</th>
                            <th style="padding: 12px; text-align: left;">${t('rating') || 'Rating'}</th>
                            <th style="padding: 12px; text-align: left; border-radius: 0 12px 0 0;">${t('status') || 'Status'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${feedbacks.map(f => `
                            <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 12px; font-size: 13px; color: var(--muted);">${new Date(f.created_at || f.date).toLocaleDateString()}</td>
                                <td style="padding: 12px; font-size: 13px; color: var(--text);">${escapeHtml(f.feedback_text.substring(0, 100))}${f.feedback_text.length > 100 ? '...' : ''}</td>
                                <td style="padding: 12px;"><span class="badge feedback-cat-${f.category}" style="background: var(--primary-light); color: var(--primary); padding: 4px 10px; border-radius: 20px; font-size: 11px;">${t(f.category + '_feedback') || f.category}</span></td>
                                <td style="padding: 12px;">${f.rating ? '⭐'.repeat(f.rating) : '—'}</td>
                                <td style="padding: 12px;"><span class="feedback-status ${f.status || 'pending'}">${t(f.status || 'pending')}</span></td>
                             </tr>
                        `).join('')}
                    </tbody>
                 </table>
            </div>
            <div class="feedback-footer" style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 12px; text-align: center;">
                <small style="color: var(--muted);">${feedbacks.length} ${t('total_feedback') || 'total feedback entries'}</small>
            </div>
        `;
    } catch (error) {
        console.error('Error loading feedback history:', error);
        historyContainer.innerHTML = `<div class="feedback-error" style="text-align: center; padding: 40px; color: var(--danger);">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${t('error_loading_feedback') || 'Error loading feedback history'}</p>
        </div>`;
    }
}

function rateUsMobile() {
    window.open('https://github.com', '_blank');
    showToast('Thanks for rating us!', 'success');
}

// ========== DARK MODE ==========
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'enabled' || (!saved && prefersDark)) enableDarkMode();
    else disableDarkMode();
    
    const desktopToggle = document.getElementById('darkModeToggleDesktop');
    const mobileToggle = document.getElementById('darkModeToggleMobile');
    if (desktopToggle) desktopToggle.addEventListener('click', toggleDarkMode);
    if (mobileToggle) mobileToggle.addEventListener('change', toggleDarkMode);
}

function toggleDarkMode() {
    if (document.body.classList.contains('dark-mode')) disableDarkMode();
    else enableDarkMode();
}

function enableDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    updateDarkModeIcons(true);
    const mobileToggle = document.getElementById('darkModeToggleMobile');
    if (mobileToggle) mobileToggle.checked = true;
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    updateDarkModeIcons(false);
    const mobileToggle = document.getElementById('darkModeToggleMobile');
    if (mobileToggle) mobileToggle.checked = false;
}

function updateDarkModeIcons(isDark) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
        sunIcon.style.display = isDark ? 'none' : 'block';
        moonIcon.style.display = isDark ? 'block' : 'none';
    }
}

// ========== NAVIGATION ==========
function goBack() {
    window.location.href = '/Assets/Student_dashboard/SDB.html' + Date.now();
}

function confirmLogoutDesktop() {
    if (confirm(t('confirm_logout'))) {
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('isAdminLoggedIn');
        showToast(t('logout_success'), 'success');
        setTimeout(() => window.location.href = '/land.html', 1000);
    }
}

function confirmLogoutMobile() {
    if (confirm(t('confirm_logout'))) {
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('isAdminLoggedIn');
        showToast(t('logout_success'), 'success');
        setTimeout(() => window.location.href = '/land.html', 1000);
    }
}

function setupNavigation() {
    const dashboardNav = document.getElementById('dashboardNav');
    if (dashboardNav) dashboardNav.addEventListener('click', () => window.location.href = '/Assets/Student_dashboard/SDB.html');
    
    const reportNav = document.getElementById('reportNav');
    if (reportNav) reportNav.addEventListener('click', () => window.location.href = '/Assets/Student_reporting/report.html');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', confirmLogoutDesktop);
    
    const saveProfileBtnDesktop = document.getElementById('saveProfileBtnDesktop');
    if (saveProfileBtnDesktop) {
        const newSaveBtn = saveProfileBtnDesktop.cloneNode(true);
        saveProfileBtnDesktop.parentNode.replaceChild(newSaveBtn, saveProfileBtnDesktop);
        newSaveBtn.addEventListener('click', saveProfileDesktop);
    }
    
    const saveNotifBtnDesktop = document.getElementById('saveNotifBtnDesktop');
    if (saveNotifBtnDesktop) saveNotifBtnDesktop.addEventListener('click', saveNotificationSettingsDesktop);
}

function setupBottomNav() {
    const items = document.querySelectorAll('.bottom-nav-item');
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            if (page === 'dashboard') {
                window.location.href = '/Assets/Student_dashboard/SDB.html';
            } else if (page === 'report') {
                window.location.href = '/Assets/Student_reporting/report.html';
            }
        });
    });
}

// ========== MODAL FUNCTIONS ==========
function openProfileModalMobile() {
    const modal = document.getElementById('profileModalMobile');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeProfileModalMobile() {
    const modal = document.getElementById('profileModalMobile');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openNotificationsModalMobile() {
    loadNotificationSettings();
    const modal = document.getElementById('notificationsModalMobile');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeNotificationsModalMobile() {
    const modal = document.getElementById('notificationsModalMobile');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openLanguageModalMobile() {
    const modal = document.getElementById('languageModalMobile');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLanguageModalMobile() {
    const modal = document.getElementById('languageModalMobile');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openFeedbackModalMobile() {
    const modal = document.getElementById('feedbackModalMobile');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeFeedbackModalMobile() {
    const modal = document.getElementById('feedbackModalMobile');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupCrossTabSync() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'student_data_updated' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                console.log('Received cross-tab update:', data);
                if (data.student && currentStudent && data.student.studentId === currentStudent.studentId) {
                    currentStudent = data.student;
                    localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
                    loadStudentData();
                    showToast('Profile updated from another tab', 'success');
                }
            } catch (err) {
                console.error('Error parsing storage event:', err);
            }
        }
    });
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const stored = localStorage.getItem('currentStudent');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (currentStudent && parsed.name !== currentStudent.name) {
                        currentStudent = parsed;
                        loadStudentData();
                        showToast('Profile updated', 'success');
                    }
                } catch(e) {}
            }
        }
    });
}

// Attach functions to window
window.openProfileModalMobile = openProfileModalMobile;
window.closeProfileModalMobile = closeProfileModalMobile;
window.saveProfileMobile = saveProfileMobile;
window.openNotificationsModalMobile = openNotificationsModalMobile;
window.closeNotificationsModalMobile = closeNotificationsModalMobile;
window.saveNotificationSettingsMobile = saveNotificationSettingsMobile;
window.openLanguageModalMobile = openLanguageModalMobile;
window.closeLanguageModalMobile = closeLanguageModalMobile;
window.selectLanguageMobile = selectLanguageMobile;
window.selectLanguageDesktop = selectLanguageDesktop;
window.openFeedbackModalMobile = openFeedbackModalMobile;
window.closeFeedbackModalMobile = closeFeedbackModalMobile;
window.sendFeedbackMobile = sendFeedbackMobile;
window.rateUsMobile = rateUsMobile;
window.confirmLogoutMobile = confirmLogoutMobile;
window.confirmLogoutDesktop = confirmLogoutDesktop;
window.goBack = goBack;

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: ${type === 'error' ? '#DC2626' : type === 'warning' ? '#F59E0B' : '#10B981'};
        color: white;
        padding: 12px 20px;
        border-radius: 40px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        animation: slideInToast 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutToast 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== NOTIFICATION BELL ==========
let notifications = [];
let unreadCount = 0;

function loadNotificationsList() {
    const saved = localStorage.getItem('student_notifications');
    if (saved) {
        notifications = JSON.parse(saved);
        updateBadge();
    }
}

function updateBadge() {
    unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadgeDesktop');
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

function setupNotificationBell() {
    const bell = document.getElementById('notificationBtnDesktop');
    const panel = document.getElementById('notificationPanelDesktop');
    if (bell && panel) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('active');
            renderNotificationsDesktop();
        });
    }
    document.addEventListener('click', (e) => {
        if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
            panel.classList.remove('active');
        }
    });
    const clearBtn = document.getElementById('clearNotificationsBtnDesktop');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm(t('clear_all') || 'Clear all notifications?')) {
                notifications = [];
                localStorage.setItem('student_notifications', JSON.stringify(notifications));
                updateBadge();
                renderNotificationsDesktop();
                showToast(t('clear_all') || 'All notifications cleared', 'success');
            }
        });
    }
}

function renderNotificationsDesktop() {
    const list = document.getElementById('notificationListDesktop');
    if (!list) return;
    if (notifications.length === 0) {
        list.innerHTML = `<div class="notification-empty"><div>🔔</div><p>${t('no_notifications')}</p></div>`;
        return;
    }
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${!n.read ? 'unread' : ''}" data-id="${n.id}">
            <div class="notification-title">${escapeHtml(n.title)}</div>
            <div class="notification-message">${escapeHtml(n.message)}</div>
            <div class="notification-time">${getTimeAgo(new Date(n.timestamp))}</div>
        </div>
    `).join('');
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const notif = notifications.find(n => n.id === id);
            if (notif && !notif.read) {
                notif.read = true;
                localStorage.setItem('student_notifications', JSON.stringify(notifications));
                updateBadge();
                renderNotificationsDesktop();
            }
        });
    });
}

function getTimeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60) return 'Just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings page loaded');
    loadStudentData();
    loadNotificationSettings();
    loadLanguage();
    loadNotificationsList();
    setupAvatarUpload();
    setupNavigation();
    setupBottomNav();
    setupNotificationBell();
    initDarkMode();
    setupCrossTabSync();
    lockEmailFields();
    
    const sendFeedbackBtn = document.getElementById('sendFeedbackBtnDesktop');
    if (sendFeedbackBtn) {
        sendFeedbackBtn.addEventListener('click', sendFeedbackDesktop);
    }
    
    const englishBtn = document.getElementById('englishLangBtn');
    const tagalogBtn = document.getElementById('tagalogLangBtn');
    if (englishBtn) {
        englishBtn.addEventListener('click', () => selectLanguageDesktop('English'));
    }
    if (tagalogBtn) {
        tagalogBtn.addEventListener('click', () => selectLanguageDesktop('Filipino'));
    }
    
    displayFeedbackHistoryDesktop();
});