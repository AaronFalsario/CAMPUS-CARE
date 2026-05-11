import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Check if env vars are loaded on Vercel
console.log('=== ENVIRONMENT CHECK ===');
console.log('Supabase URL exists:', !!supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);
console.log('Current URL:', window.location.origin);

const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const studentLoginCard = document.getElementById('studentLoginCard');
const signupForm = document.getElementById('signupForm');
const showSignupBtn = document.getElementById('showSignup');
const showLoginBtn = document.getElementById('showLogin');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loaderOverlay = document.getElementById('loaderOverlay');

// ========== EMAIL VALIDATION ==========
function isValidGordonEmail(email) {
    if (!email) return false;
    const trimmed = email.trim().toLowerCase();
    return (
        trimmed.endsWith('@gordoncollege.edu.ph') &&
        trimmed.length > '@gordoncollege.edu.ph'.length &&
        !trimmed.includes(' ')
    );
}

function showEmailError(inputElement, isValid) {
    if (isValid) {
        inputElement.classList.remove('domain-error');
        inputElement.style.borderColor = '';
    } else {
        inputElement.classList.add('domain-error');
    }
}

// ========== Helper to get email from student ID ==========
async function getEmailFromStudentId(studentId) {
    try {
        console.log('🔍 Searching for student_id:', studentId);
        
        const { data, error } = await supabase
            .from('student')
            .select('email, student_id, full_name')
            .eq('student_id', studentId.toString().trim())
            .maybeSingle();
        
        if (error) {
            console.error('❌ Database error:', error);
            return null;
        }
        
        console.log('📊 Query result:', data);
        
        if (!data) {
            console.log('⚠️ No student found with ID:', studentId);
            return null;
        }
        
        console.log('✅ Found email:', data.email);
        return data.email;
    } catch (error) {
        console.error('❌ Error fetching email by student ID:', error);
        return null;
    }
}

// ========== Setup email input with domain for SIGNUP ==========
function setupEmailInputWithDomain() {
    const signupEmailInput = document.getElementById('signupEmail');
    if (signupEmailInput) {
        const wrapper = signupEmailInput.parentElement;
        wrapper.style.position = 'relative';
        
        const suffix = document.createElement('span');
        suffix.textContent = '@gordoncollege.edu.ph';
        suffix.style.position = 'absolute';
        suffix.style.right = '12px';
        suffix.style.top = '50%';
        suffix.style.transform = 'translateY(-50%)';
        suffix.style.fontSize = '12px';
        suffix.style.color = '#64748b';
        suffix.style.backgroundColor = '#f1f5f9';
        suffix.style.padding = '2px 8px';
        suffix.style.borderRadius = '4px';
        suffix.style.pointerEvents = 'none';
        wrapper.appendChild(suffix);
        
        signupEmailInput.style.paddingRight = '160px';
        
        signupEmailInput.addEventListener('input', function(e) {
            let value = this.value;
            if (value.includes('@gordoncollege.edu.ph')) {
                value = value.replace('@gordoncollege.edu.ph', '');
                this.value = value;
            }
            if (value.includes('@')) {
                value = value.replace('@', '');
                this.value = value;
            }
        });
        
        const hint = document.createElement('div');
        hint.className = 'email-hint';
        hint.style.marginTop = '5px';
        hint.innerHTML = '<i class="fas fa-info-circle"></i> Just type your Student ID';
        signupEmailInput.parentElement.parentElement.appendChild(hint);
    }
}

// ========== Setup LOGIN input with hint ==========
function setupLoginInput() {
    const loginInput = document.getElementById('loginEmail');
    if (loginInput) {
        loginInput.placeholder = "Enter your Student ID Number";
        
        const hint = document.createElement('div');
        hint.className = 'email-hint';
        hint.style.marginTop = '5px';
        hint.innerHTML = '<i class="fas fa-info-circle"></i> Just enter your Student ID number (e.g., 2021-12345)';
        loginInput.parentElement.parentElement.appendChild(hint);
        
        const icon = loginInput.parentElement.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-envelope');
            icon.classList.add('fa-id-card');
        }
    }
}

// ========== LOADER ==========
function showLoader() {
    if (loaderOverlay) loaderOverlay.classList.add('show');
}

function hideLoader() {
    if (loaderOverlay) loaderOverlay.classList.remove('show');
}

// ========== TOAST NOTIFICATION ==========
function showNotification(message, isError = false, duration = 3000) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.innerHTML = isError
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
               <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
               <circle cx="12" cy="16" r="1" fill="currentColor"/>
           </svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
               <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>`;

    const msg = document.createElement('div');
    msg.className = 'toast-message';
    msg.textContent = message;

    const progress = document.createElement('div');
    progress.className = 'toast-progress';

    toast.appendChild(icon);
    toast.appendChild(msg);
    toast.appendChild(progress);
    document.body.appendChild(toast);

    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .custom-toast {
                position: fixed;
                bottom: 24px;
                left: 16px;
                right: 16px;
                max-width: 400px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                padding: 14px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.05);
                z-index: 10000;
                animation: toastSlideUp 0.3s ease-out;
                border-left: 4px solid ${isError ? '#EF4444' : '#10B981'};
                overflow: hidden;
            }
            .custom-toast .toast-icon {
                flex-shrink: 0;
                color: ${isError ? '#EF4444' : '#10B981'};
                display: flex;
                align-items: center;
            }
            .custom-toast .toast-message {
                flex: 1;
                font-size: 13px;
                font-weight: 500;
                color: #1e293b;
                line-height: 1.4;
            }
            .custom-toast .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: ${isError ? '#EF4444' : '#10B981'};
                border-radius: 0 0 0 12px;
                animation: toastProgress ${duration}ms linear forwards;
            }
            @keyframes toastSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes toastProgress {
                from { width: 100%; }
                to   { width: 0%; }
            }
            @media (max-width: 480px) {
                .custom-toast { left: 12px; right: 12px; bottom: 20px; padding: 12px 14px; }
                .custom-toast .toast-message { font-size: 12px; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'toastSlideUp 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========== HELPERS ==========
function applySlideUpAnimation(element) {
    element.classList.remove('slideUp');
    void element.offsetWidth;
    element.classList.add('slideUp');
}

function togglePasswordVisibility(inputEl, toggleEl) {
    if (!inputEl || !toggleEl) return;
    toggleEl.addEventListener('click', () => {
        const type = inputEl.getAttribute('type') === 'password' ? 'text' : 'password';
        inputEl.setAttribute('type', type);
        toggleEl.classList.toggle('fa-eye');
        toggleEl.classList.toggle('fa-eye-slash');
    });
}

// ========== CHECK EMAIL IN DB ==========
async function checkEmailExists(email) {
    try {
        const { data, error } = await supabase
            .from('student')
            .select('email, full_name')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (error) return { exists: false, error: error.message };
        return { exists: !!data, userData: data };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

// ========== UPDATE STATUS ON LOGIN ==========
async function updateStudentActivityOnLogin(userId) {
    try {
        const { error } = await supabase
            .from('student')
            .update({
                status: 'active',
                is_active: true,
                last_login: new Date().toISOString(),
                last_logout: null
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating login status:', error);
            return false;
        }

        console.log(`✅ Student ${userId} marked active at ${new Date().toLocaleTimeString()}`);
        return true;
    } catch (error) {
        console.error('updateStudentActivityOnLogin failed:', error);
        return false;
    }
}

// ========== TEST DATABASE CONNECTION ==========
async function testDatabaseConnection() {
    try {
        console.log('📡 Testing database connection...');
        const { data, error } = await supabase
            .from('student')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Database connection failed:', error);
            return false;
        }
        console.log('✅ Database connected successfully');
        return true;
    } catch (err) {
        console.error('❌ Connection error:', err);
        return false;
    }
}

// ========== LOGIN ==========
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const studentId = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        console.log('=== LOGIN ATTEMPT ===');
        console.log('Entered Student ID:', studentId);

        if (!studentId || !password) {
            showNotification('Please enter your Student ID and Password', true);
            return;
        }

        showLoader();

        try {
            console.log('📡 Checking database for student_id:', studentId);
            
            const { data: studentRecord, error: dbError } = await supabase
                .from('student')
                .select('*')
                .eq('student_id', studentId)
                .maybeSingle();
            
            console.log('📋 Database query result:', studentRecord);
            
            if (dbError) {
                console.error('❌ Database error:', dbError);
                showNotification('Database error. Please try again.', true);
                hideLoader();
                return;
            }
            
            if (!studentRecord) {
                console.log('❌ No student found with ID:', studentId);
                showNotification('Student ID not found. Please sign up first.', true);
                hideLoader();
                return;
            }
            
            console.log('✅ Student found! Email:', studentRecord.email);
            
            const email = studentRecord.email;
            
            if (!email) {
                console.error('❌ Student record has no email!');
                showNotification('Account has no email. Please contact support.', true);
                hideLoader();
                return;
            }

            console.log('🔐 Attempting Supabase auth login with email:', email);

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                console.error('❌ Auth error:', error);
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid Student ID or password. Please try again.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email first. Check your inbox for the confirmation link.');
                } else {
                    throw error;
                }
            }
            
            if (!data.user) {
                throw new Error('Login failed — no user returned.');
            }
            
            console.log('✅ Auth successful! User ID:', data.user.id);

            if (!data.user.email_confirmed_at) {
                const { error: resendError } = await supabase.auth.resend({
                    type: 'signup',
                    email: email
                });
                
                if (!resendError) {
                    showNotification('📧 Email not verified! A new confirmation link has been sent to your email.', false, 5000);
                } else {
                    showNotification('Please verify your email before logging in. Check your spam folder.', true);
                }
                hideLoader();
                return;
            }

            await updateStudentActivityOnLogin(data.user.id);

            localStorage.setItem('currentStudent', JSON.stringify({
                name: studentRecord.full_name,
                studentId: studentRecord.student_id,
                email: studentRecord.email,
                userId: data.user.id,
                status: 'active'
            }));

            showNotification('Login successful! Redirecting...', false, 1500);
            setTimeout(() => {
                window.location.href = '/Assets/Student_dashboard/SDB.html';
            }, 1500);

        } catch (error) {
            console.error('❌ Login error:', error);
            showNotification(error.message || 'Login failed. Please check your credentials.', true);
            hideLoader();
        }
    });
}

// ========== SIGNUP ==========
if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const fullName = document.getElementById('signupName').value.trim();
        const studentId = document.getElementById('signupStudentId').value.trim();
        let username = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        console.log('=== SIGNUP ATTEMPT ===');
        console.log('Full Name:', fullName);
        console.log('Student ID:', studentId);

        if (!fullName || !studentId || !username || !password) {
            showNotification('Please fill in all fields', true);
            return;
        }

        let email = username + '@gordoncollege.edu.ph';
        email = email.replace(/@+/g, '@');

        if (!isValidGordonEmail(email)) {
            showNotification('Invalid email format. Please use a valid username.', true);
            document.getElementById('signupEmail').classList.add('domain-error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters.', true);
            return;
        }

        showLoader();

        try {
            console.log('📡 Checking if student_id exists:', studentId);
            
            const { data: existingId } = await supabase
                .from('student')
                .select('student_id')
                .eq('student_id', studentId)
                .maybeSingle();

            if (existingId) {
                console.log('❌ Student ID already exists:', studentId);
                hideLoader();
                showNotification('Student ID already registered. Please login.', true);
                return;
            }

            console.log('📡 Checking if email exists:', email);
            
            const { data: existingEmail } = await supabase
                .from('student')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (existingEmail) {
                console.log('❌ Email already exists:', email);
                hideLoader();
                showNotification('Email already registered. Please login.', true);
                return;
            }

            console.log('🔐 Creating Supabase auth user...');
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    data: { 
                        full_name: fullName, 
                        student_id: studentId 
                    },
                    emailRedirectTo: `${window.location.origin}/Assets/login/log.html`
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('Signup failed.');

            console.log('✅ Auth user created. User ID:', data.user.id);

            const { error: dbError } = await supabase
                .from('student')
                .insert([{
                    id: data.user.id,
                    full_name: fullName,
                    student_id: studentId,
                    email: email,
                    status: 'pending',
                    is_active: false,
                    last_login: null,
                    last_logout: null
                }]);

            if (dbError) {
                console.error('❌ Database insert error:', dbError);
                throw dbError;
            }

            console.log('✅ Student record created successfully!');

            showNotification('✅ Account created! Please check your email to verify your account before logging in.', false, 6000);
            
            document.getElementById('signupName').value = '';
            document.getElementById('signupStudentId').value = '';
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            
            setTimeout(() => {
                signupForm.style.display = 'none';
                studentLoginCard.style.display = 'block';
                applySlideUpAnimation(studentLoginCard);
                
                const loginMessage = document.createElement('div');
                loginMessage.className = 'login-message';
                loginMessage.innerHTML = '<i class="fas fa-envelope"></i> Please verify your email before logging in. Check your inbox!';
                loginMessage.style.cssText = 'background: #d1fae5; color: #065f46; padding: 12px; border-radius: 10px; margin-top: 16px; font-size: 13px; text-align: center;';
                
                const existingMsg = studentLoginCard.querySelector('.login-message');
                if (existingMsg) existingMsg.remove();
                studentLoginCard.appendChild(loginMessage);
                
                setTimeout(() => loginMessage.remove(), 5000);
            }, 3000);

        } catch (error) {
            console.error('❌ Signup error:', error);
            showNotification(error.message || 'Signup failed. Please try again.', true);
            hideLoader();
        }
    });
}

// ========== LOGOUT ==========
window.studentLogout = async function () {
    try {
        const stored = localStorage.getItem('currentStudent');
        if (stored) {
            const student = JSON.parse(stored);

            const { error } = await supabase
                .from('student')
                .update({
                    status: 'inactive',
                    is_active: false,
                    last_logout: new Date().toISOString()
                })
                .eq('id', student.userId);

            if (error) {
                console.error('Error recording logout:', error);
            } else {
                console.log(`✅ Student ${student.email} logged out at ${new Date().toLocaleTimeString()}`);
            }
        }

        await supabase.auth.signOut();
        localStorage.removeItem('currentStudent');
        window.location.href = '/Assets/login/log.html';

    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('currentStudent');
        window.location.href = '/Assets/login/log.html';
    }
};

// ========== FORGOT PASSWORD ==========
const forgotPasswordBtn = document.getElementById('showForgotPassword');
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
        const email = await showEmailPrompt();
        if (!email) return;

        const trimmed = email.trim().toLowerCase();

        if (!isValidGordonEmail(trimmed)) {
            showNotification('Please use your @gordoncollege.edu.ph email.', true);
            return;
        }

        showLoader();

        try {
            const { exists, error: checkError } = await checkEmailExists(trimmed);

            if (checkError) throw new Error('Unable to verify email. Please try again.');

            if (!exists) {
                hideLoader();
                showNotification('Email not found. Please sign up first.', true, 4000);
                return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
                redirectTo: `${window.location.origin}/Assets/login/password_admin/reset_password.html`
            });

            if (error) throw error;

            showNotification(`✅ Reset link sent to ${trimmed}! Check your inbox.`, false, 5000);
        } catch (error) {
            console.error('Password reset error:', error);
            showNotification(error.message || 'Failed to send reset email.', true);
        } finally {
            hideLoader();
        }
    });
}

// ========== EMAIL PROMPT MODAL ==========
function showEmailPrompt() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'email-prompt-modal';
        modal.innerHTML = `
            <div class="email-prompt-overlay"></div>
            <div class="email-prompt-container">
                <div class="email-prompt-header">
                    <h3>Reset Password</h3>
                    <button class="email-prompt-close">&times;</button>
                </div>
                <div class="email-prompt-body">
                    <p>Enter your registered @gordoncollege.edu.ph email to receive a reset link.</p>
                    <input type="email" id="promptEmail" placeholder="student@gordoncollege.edu.ph" autocomplete="off">
                    <div class="email-hint">⚠️ Only registered emails will receive a reset link</div>
                </div>
                <div class="email-prompt-footer">
                    <button class="email-prompt-cancel">Cancel</button>
                    <button class="email-prompt-submit">Send Reset Link</button>
                </div>
            </div>
        `;

        if (!document.querySelector('#prompt-styles')) {
            const style = document.createElement('style');
            style.id = 'prompt-styles';
            style.textContent = `
                .email-prompt-modal {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    z-index: 20000; display: flex; align-items: center; justify-content: center;
                    animation: fadeIn 0.2s ease;
                }
                .email-prompt-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5);
                }
                .email-prompt-container {
                    position: relative; background: white; border-radius: 16px;
                    width: 90%; max-width: 340px; overflow: hidden; animation: slideUp 0.3s ease;
                }
                .email-prompt-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 16px 16px 12px; border-bottom: 1px solid #e2e8f0;
                }
                .email-prompt-header h3 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
                .email-prompt-close {
                    background: none; border: none; font-size: 24px; cursor: pointer;
                    color: #94a3b8; padding: 0; line-height: 1;
                }
                .email-prompt-body { padding: 16px; }
                .email-prompt-body p { font-size: 13px; color: #64748b; margin-bottom: 12px; }
                .email-prompt-body input {
                    width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8f0;
                    border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box;
                }
                .email-prompt-body input:focus { outline: none; border-color: #2563eb; }
                .email-hint { font-size: 11px; color: #64748b; margin-top: 8px; }
                .email-prompt-footer {
                    display: flex; gap: 12px; padding: 12px 16px 16px; border-top: 1px solid #f1f5f9;
                }
                .email-prompt-cancel, .email-prompt-submit {
                    flex: 1; padding: 10px; border-radius: 8px; font-size: 13px;
                    font-weight: 600; cursor: pointer; border: none; transition: all 0.2s;
                }
                .email-prompt-cancel { background: #f1f5f9; color: #64748b; }
                .email-prompt-submit { background: #2563eb; color: white; }
                .email-prompt-submit:hover { background: #1d4ed8; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        const input = modal.querySelector('#promptEmail');
        const submitBtn = modal.querySelector('.email-prompt-submit');
        const cancelBtn = modal.querySelector('.email-prompt-cancel');
        const closeBtn = modal.querySelector('.email-prompt-close');
        const overlay = modal.querySelector('.email-prompt-overlay');

        const cleanup = () => modal.remove();

        submitBtn.onclick = () => { const v = input.value.trim(); cleanup(); resolve(v || null); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        closeBtn.onclick = () => { cleanup(); resolve(null); };
        overlay.onclick = () => { cleanup(); resolve(null); };
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { const v = input.value.trim(); cleanup(); resolve(v || null); }
        });

        input.focus();
    });
}

// ========== CSS ==========
function addStyles() {
    if (document.querySelector('#login-base-styles')) return;
    const style = document.createElement('style');
    style.id = 'login-base-styles';
    style.textContent = `
        .domain-error {
            border-color: #DC2626 !important;
            background-color: #FEF2F2 !important;
        }
        .slideUp {
            animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// ========== PASSWORD TOGGLES ==========
togglePasswordVisibility(
    document.getElementById('loginPassword'),
    document.getElementById('toggleLoginPassword')
);
togglePasswordVisibility(
    document.getElementById('signupPassword'),
    document.getElementById('toggleSignupPassword')
);

// ========== FORM TOGGLE ==========
if (showSignupBtn) {
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        studentLoginCard.style.display = 'none';
        signupForm.style.display = 'block';
        applySlideUpAnimation(signupForm);
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        studentLoginCard.style.display = 'block';
        applySlideUpAnimation(studentLoginCard);
    });
}

// ========== SESSION CHECK ==========
async function checkExistingSession() {
    const stored = localStorage.getItem('currentStudent');
    if (!stored) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            if (user.email_confirmed_at) {
                window.location.href = '/Assets/Student_dashboard/SDB.html';
            } else {
                localStorage.removeItem('currentStudent');
            }
        } else {
            localStorage.removeItem('currentStudent');
        }
    } catch (e) {
        localStorage.removeItem('currentStudent');
    }
}

// ========== INIT ==========
async function init() {
    addStyles();
    setupLoginInput(); 
    setupEmailInputWithDomain(); 
    await testDatabaseConnection(); // Test database connection
    await checkExistingSession();
    console.log('✅ Login page ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}