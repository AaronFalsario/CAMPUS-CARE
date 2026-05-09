import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// AI Analysis State
let isAnalyzing = false;
let currentAnalysis = null;
let mobilenetModel = null;
let isAILoading = false;
let aiLoadPromise = null;

// Store uploaded image data
let uploadedImageData = null;
let currentImageFile = null;

// ========== DARK MODE SYNC ==========
function initDarkModeSync() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedMode === 'enabled' || (!savedMode && prefersDark)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'darkMode') {
            if (e.newValue === 'enabled') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });
}

// ========== DUPLICATE CHECK FROM SUPABASE DATABASE ONLY ==========
async function checkForDuplicateReport(title, location, category, description) {
    try {
        // Search for similar reports in the incident table
        const { data, error } = await supabase
            .from('incident')
            .select('id, title, location, category, status, created_at, description')
            .eq('location', location)
            .eq('category', category)
            .in('status', ['pending', 'in_progress', 'reviewing', 'submitted'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Duplicate check error:', error);
            return { hasDuplicates: false, duplicates: [] };
        }

        // Filter for similar titles/descriptions
        const similarReports = data.filter(report => {
            const titleSimilar = report.title && title.toLowerCase().includes(report.title.toLowerCase()) ||
                               report.title && report.title.toLowerCase().includes(title.toLowerCase());
            const descSimilar = report.description && description.toLowerCase().includes(report.description.toLowerCase()) ||
                               report.description && report.description.toLowerCase().includes(description.toLowerCase());
            return titleSimilar || descSimilar;
        });

        if (similarReports && similarReports.length > 0) {
            return { hasDuplicates: true, duplicates: similarReports };
        }
        
        return { hasDuplicates: false, duplicates: [] };
    } catch (error) {
        console.error('Duplicate check failed:', error);
        return { hasDuplicates: false, duplicates: [] };
    }
}

// Show duplicate warning modal
function showDuplicateWarning(duplicates) {
    const warningModal = document.createElement('div');
    warningModal.id = 'duplicateWarningModal';
    warningModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 20000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease;';
    warningModal.innerHTML = `
        <div style="background: var(--surface); border-radius: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
            <div style="padding: 20px 24px; background: #FEF3C7; border-bottom: 1px solid #FDE68A; border-radius: 24px 24px 0 0;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">⚠️</span>
                    <div>
                        <h3 style="font-size: 18px; font-weight: 700; color: #92400E;">Similar Reports Found in Database</h3>
                        <p style="font-size: 13px; color: #B45309; margin-top: 4px;">Please review before submitting a duplicate</p>
                    </div>
                </div>
            </div>
            <div style="padding: 20px 24px;">
                <p style="margin-bottom: 16px; color: var(--text);">We found similar reports already in the system:</p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    ${duplicates.map(dup => `
                        <div style="background: var(--bg); border-radius: 12px; padding: 12px; border-left: 3px solid #D97706;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <strong style="color: var(--text);">${dup.title || 'Untitled'}</strong>
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: #FEF3C7; color: #92400E;">${dup.status || 'pending'}</span>
                            </div>
                            <div style="font-size: 12px; color: var(--muted); margin-top: 6px;">📍 ${dup.location}</div>
                            <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">📂 ${dup.category}</div>
                            <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">📅 ${new Date(dup.created_at).toLocaleDateString()}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancelSubmitBtn" style="padding: 10px 20px; border-radius: 40px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; font-weight: 500;">Cancel</button>
                    <button id="forceSubmitBtn" style="padding: 10px 20px; border-radius: 40px; background: #DC2626; color: white; border: none; cursor: pointer; font-weight: 500;">Submit Anyway</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(warningModal);
    
    const cancelBtn = document.getElementById('cancelSubmitBtn');
    const forceBtn = document.getElementById('forceSubmitBtn');
    
    cancelBtn?.addEventListener('click', () => {
        warningModal.remove();
    });
    
    forceBtn?.addEventListener('click', () => {
        warningModal.remove();
        performSubmit(true);
    });
}

// ========== URGENT ALERT FUNCTIONS ==========
function isUrgentReport(category, priority, title, description) {
    const urgentKeywords = [
        'fire', 'smoke', 'burning', 'flame', 'emergency', 'danger', 
        'urgent', 'critical', 'hazard', 'explosion', 'chemical spill',
        'gas leak', 'electrical fire', 'alarm', 'evacuation', 'violence',
        'assault', 'weapon', 'injury', 'blood', 'accident'
    ];
    
    if (category === 'security' && priority === 'high') return true;
    
    if (priority === 'high') {
        const textToCheck = `${title} ${description}`.toLowerCase();
        for (const keyword of urgentKeywords) {
            if (textToCheck.includes(keyword)) {
                return true;
            }
        }
    }
    return false;
}

async function sendUrgentNotifications(report, currentUser, isAnonymous) {
    console.log('🚨 SENDING URGENT NOTIFICATIONS...', report);
    
    const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, email, name, role');
    
    if (error) {
        console.error('Failed to fetch users:', error);
        return;
    }
    
    const usersToNotify = allUsers.filter(user => user.id !== currentUser.id);
    
    const notificationData = {
        id: report.id,
        title: report.title,
        location: report.location,
        category: report.category,
        priority: report.priority,
        description: report.description,
        reporterName: isAnonymous ? 'Anonymous Reporter' : report.studentName,
        reporterId: currentUser.id,
        timestamp: new Date().toISOString()
    };
    
    for (const user of usersToNotify) {
        try {
            await supabase.from('notifications').insert([{
                alert_id: notificationData.id,
                user_id: user.id,
                user_role: user.role,
                channel: 'IN_APP',
                status: 'SENT',
                sent_at: new Date().toISOString()
            }]);
        } catch (err) {
            console.error(`Failed to send to ${user.name}:`, err);
        }
    }
    
    storeUrgentAlert(notificationData);
}

function storeUrgentAlert(alertData) {
    const urgentAlerts = JSON.parse(localStorage.getItem('campus_care_urgent_alerts') || '[]');
    urgentAlerts.unshift({ ...alertData, isActive: true, notifiedAt: new Date().toISOString() });
    while (urgentAlerts.length > 10) urgentAlerts.pop();
    localStorage.setItem('campus_care_urgent_alerts', JSON.stringify(urgentAlerts));
}

// ========== AI MODEL LOADING (LAZY) ==========
async function loadMobileNetLazy() {
    if (mobilenetModel) return mobilenetModel;
    if (aiLoadPromise) return aiLoadPromise;
    
    aiLoadPromise = new Promise(async (resolve, reject) => {
        try {
            const indicator = document.getElementById('aiAnalysisIndicator');
            if (indicator) {
                indicator.className = 'ai-indicator processing';
                indicator.style.display = 'block';
                indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner-small"></div><span>📦 Loading AI model (first time takes 3-5 seconds)...</span></div>`;
            }
            
            // Load TensorFlow.js
            if (typeof tf === 'undefined') {
                await new Promise((resolveScript) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
                    script.onload = resolveScript;
                    script.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
                    document.head.appendChild(script);
                });
            }
            
            // Wait a bit for TensorFlow to initialize
            await new Promise(r => setTimeout(r, 100));
            
            // Load MobileNet model
            if (typeof mobilenet === 'undefined') {
                await new Promise((resolveScript) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
                    script.onload = resolveScript;
                    script.onerror = () => reject(new Error('Failed to load MobileNet'));
                    document.head.appendChild(script);
                });
            }
            
            // Wait a bit more for MobileNet to be ready
            await new Promise(r => setTimeout(r, 200));
            
            mobilenetModel = await mobilenet.load();
            console.log('✅ MobileNet model loaded successfully!');
            
            if (indicator) {
                indicator.style.display = 'none';
            }
            showNotification('🤖 AI ready! Upload an image for analysis.', 'success');
            resolve(mobilenetModel);
        } catch (error) {
            console.error('Failed to load MobileNet:', error);
            const indicator = document.getElementById('aiAnalysisIndicator');
            if (indicator) {
                indicator.className = 'ai-indicator error';
                indicator.innerHTML = `<span>⚠️ AI failed to load. Please select category manually.</span>`;
                setTimeout(() => indicator.style.display = 'none', 3000);
            }
            reject(error);
        }
    });
    
    return aiLoadPromise;
}

// ========== IMAGE ANALYSIS ==========
async function analyzeImageWithMobileNet(imageElement) {
    if (!mobilenetModel) return null;
    try {
        // Resize image for better performance
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageElement, 0, 0, 224, 224);
        
        const predictions = await mobilenetModel.classify(canvas);
        console.log('MobileNet predictions:', predictions);
        return predictions;
    } catch (error) {
        console.error('MobileNet classification error:', error);
        return null;
    }
}

// Enhanced category mapping with more keywords
const categoryMapping = {
    'security': { 
        name: 'Security Alert', 
        color: '#DC2626',
        bgColor: '#FEF2F2',
        keywords: ['knife', 'weapon', 'gun', 'pistol', 'rifle', 'danger', 'threat', 'intruder', 'violence', 'attack', 
                  'fight', 'assault', 'suspicious', 'trespassing', 'theft', 'robbery', 'vandalism', 'broken glass',
                  'harassment', 'emergency', 'fire', 'smoke', 'flame', 'burning', 'alarm', 'security', 'police', 'blood',
                  'injury', 'accident', 'crowd', 'riot', 'argument', 'shouting', 'scream', 'broken window']
    },
    'maintenance': { 
        name: 'Maintenance', 
        color: '#2563EB',
        bgColor: '#EFF6FF',
        keywords: ['broken', 'wire', 'sparking', 'light', 'electrical', 'pipe', 'leak', 'ac', 'cracked',
                  'flickering', 'outlet', 'plumbing', 'flood', 'water', 'heater', 'circuit', 'breaker',
                  'switch', 'socket', 'cable', 'ceiling', 'floor', 'wall crack', 'paint peeling']
    },
    'janitorial': { 
        name: 'Janitorial', 
        color: '#085041',
        bgColor: '#E1F5EE',
        keywords: ['trash', 'garbage', 'dirty', 'toilet', 'spill', 'overflow', 'mess', 'odor', 'smell',
                  'bathroom', 'restroom', 'clean', 'dust', 'mold', 'clogged', 'sink', 'urinal', 'waste',
                  'litter', 'debris', 'stain', 'floor wet', 'water spill', 'food waste']
    },
    'facilities': { 
        name: 'Facilities', 
        color: '#D97706',
        bgColor: '#FFFBEB',
        keywords: ['elevator', 'door', 'window', 'ceiling', 'floor', 'wall', 'paint', 'furniture',
                  'chair', 'table', 'desk', 'stair', 'railing', 'lighting', 'exit', 'signage',
                  'handle', 'lock', 'hinge', 'carpet', 'tile', 'vent', 'hvac']
    }
};

// Improved image analysis with better categorization
async function analyzeImageWithAI(imageFile) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = async function() {
                let detectedCategory = 'maintenance';
                let highestConfidence = 0.3;
                let matchedKeywords = [];
                let allPredictions = [];
                
                // MobileNet analysis
                if (mobilenetModel) {
                    try {
                        const predictions = await analyzeImageWithMobileNet(img);
                        if (predictions && predictions.length > 0) {
                            allPredictions = predictions;
                            console.log('Got predictions:', predictions.map(p => `${p.className}: ${(p.probability * 100).toFixed(1)}%`));
                            
                            for (const pred of predictions) {
                                const className = pred.className.toLowerCase();
                                const confidence = pred.probability;
                                
                                for (const [category, data] of Object.entries(categoryMapping)) {
                                    for (const keyword of data.keywords) {
                                        if (className.includes(keyword)) {
                                            let categoryConfidence = confidence * 0.85;
                                            if (categoryConfidence > highestConfidence) {
                                                highestConfidence = categoryConfidence;
                                                detectedCategory = category;
                                                matchedKeywords.push(keyword);
                                            }
                                        }
                                    }
                                }
                                
                                // Security-specific detection
                                const securityKeywords = ['knife', 'weapon', 'gun', 'pistol', 'rifle', 'scissors', 'blade', 'axe', 'hammer'];
                                for (const secKeyword of securityKeywords) {
                                    if (className.includes(secKeyword)) {
                                        detectedCategory = 'security';
                                        highestConfidence = Math.max(highestConfidence, 0.85);
                                        matchedKeywords.push(secKeyword);
                                    }
                                }
                                
                                // Fire/smoke detection
                                const fireKeywords = ['fire', 'flame', 'smoke', 'burning', 'torch', 'lighter'];
                                for (const fireKeyword of fireKeywords) {
                                    if (className.includes(fireKeyword)) {
                                        detectedCategory = 'security';
                                        highestConfidence = Math.max(highestConfidence, 0.9);
                                        matchedKeywords.push(fireKeyword);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error('MobileNet analysis error:', err);
                    }
                }
                
                // Color analysis as backup
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let redPixels = 0;
                let darkPixels = 0;
                let brightPixels = 0;
                let totalPixels = canvas.width * canvas.height;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const brightness = (r + g + b) / 3;
                    
                    if (r > 200 && g < 100 && b < 100) redPixels++;
                    if (brightness < 50) darkPixels++;
                    if (brightness > 200) brightPixels++;
                }
                
                const redRatio = redPixels / totalPixels;
                const darkRatio = darkPixels / totalPixels;
                const brightRatio = brightPixels / totalPixels;
                
                console.log(`Color analysis - Red: ${(redRatio * 100).toFixed(1)}%, Dark: ${(darkRatio * 100).toFixed(1)}%, Bright: ${(brightRatio * 100).toFixed(1)}%`);
                
                // Color-based classification
                if (redRatio > 0.05) {
                    const colorConfidence = Math.min(0.7 + (redRatio * 2), 0.9);
                    if (colorConfidence > highestConfidence) {
                        detectedCategory = 'security';
                        highestConfidence = colorConfidence;
                        matchedKeywords.push('red_color_emergency');
                    }
                }
                
                if (darkRatio > 0.6 && detectedCategory === 'maintenance' && highestConfidence < 0.5) {
                    highestConfidence = 0.55;
                    matchedKeywords.push('dark_area_maintenance');
                }
                
                if (brightRatio > 0.7 && detectedCategory === 'janitorial' && highestConfidence < 0.4) {
                    highestConfidence = 0.45;
                    matchedKeywords.push('bright_clean_area');
                }
                
                // Default to maintenance if confidence is too low
                if (highestConfidence < 0.35) {
                    detectedCategory = 'maintenance';
                    highestConfidence = 0.4;
                    matchedKeywords.push('unclear_image_default');
                }
                
                highestConfidence = Math.min(highestConfidence, 0.95);
                
                console.log(`AI Detection Result - Category: ${detectedCategory}, Confidence: ${(highestConfidence * 100).toFixed(1)}%`);
                console.log(`Matched keywords: ${matchedKeywords.join(', ')}`);
                
                resolve({
                    predicted_type: detectedCategory,
                    confidence: highestConfidence,
                    matchedKeywords: matchedKeywords.slice(0, 3),
                    allPredictions: allPredictions
                });
            };
            
            img.onerror = () => {
                resolve({ predicted_type: 'maintenance', confidence: 0.3, matchedKeywords: [] });
            };
        };
        
        reader.onerror = () => {
            resolve({ predicted_type: 'maintenance', confidence: 0.3, matchedKeywords: [] });
        };
        
        reader.readAsDataURL(imageFile);
    });
}

async function analyzePriorityLevel(imageFile, category) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let redIntensity = 0;
                let darkIntensity = 0;
                let brightIntensity = 0;
                const pixelCount = canvas.width * canvas.height;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    if (r > 200 && g < 100 && b < 100) redIntensity++;
                    const brightness = (r + g + b) / 3;
                    if (brightness < 40) darkIntensity++;
                    if (brightness > 200) brightIntensity++;
                }
                
                redIntensity = redIntensity / pixelCount;
                darkIntensity = darkIntensity / pixelCount;
                brightIntensity = brightIntensity / pixelCount;
                
                let urgencyScore = 0;
                if (category === 'security') {
                    urgencyScore = 0.85;
                    if (redIntensity > 0.03) urgencyScore = 0.95;
                    if (darkIntensity > 0.5) urgencyScore = 0.9;
                } else if (category === 'maintenance') {
                    urgencyScore = 0.5;
                    if (darkIntensity > 0.4) urgencyScore = 0.7;
                    if (brightIntensity > 0.6) urgencyScore = 0.45;
                } else if (category === 'janitorial') {
                    urgencyScore = 0.35;
                    if (darkIntensity > 0.3) urgencyScore = 0.55;
                } else {
                    urgencyScore = 0.45;
                }
                
                let priority = 'medium';
                if (urgencyScore > 0.75) priority = 'high';
                else if (urgencyScore < 0.45) priority = 'low';
                
                resolve({ priority: priority, confidence: 0.7 });
            };
        };
        reader.onerror = () => resolve({ priority: 'medium', confidence: 0.5 });
        reader.readAsDataURL(imageFile);
    });
}

function applyAICategory(category) {
    const categoryItems = document.querySelectorAll('.cat-item');
    const categoryInput = document.getElementById('category');
    
    categoryItems.forEach((item) => {
        if (item.getAttribute('data-cat') === category) {
            item.classList.add('active');
            if (categoryInput) categoryInput.value = category;
        } else {
            item.classList.remove('active');
        }
    });
}

function applyAIPriority(priority) {
    const priorityButtons = document.querySelectorAll('.p-btn');
    const priorityInput = document.getElementById('priority');
    
    priorityButtons.forEach((btn) => {
        if (btn.getAttribute('data-priority') === priority) {
            btn.classList.add('active');
            if (priorityInput) priorityInput.value = priority;
        } else {
            btn.classList.remove('active');
        }
    });
}

function showAISuggestion(category, confidence, matchedKeywords = [], priority = null) {
    const indicator = document.getElementById('aiAnalysisIndicator');
    if (!indicator) return;
    
    const categoryInfo = categoryMapping[category];
    if (!categoryInfo) return;
    
    const confidencePercent = Math.round(confidence * 100);
    
    let priorityBadge = '';
    if (priority) {
        const priorityColors = {
            high: { bg: '#FEF2F2', color: '#DC2626', text: '🔴 High Priority' },
            medium: { bg: '#FFFBEB', color: '#D97706', text: '🟠 Medium Priority' },
            low: { bg: '#E1F5EE', color: '#1D9E75', text: '🟢 Low Priority' }
        };
        const pc = priorityColors[priority];
        if (pc) {
            priorityBadge = `<span style="background: ${pc.bg}; color: ${pc.color}; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${pc.text}</span>`;
        }
    }
    
    let keywordText = matchedKeywords && matchedKeywords.length > 0 ? 
        `<div style="font-size: 11px; color: #6B7280; margin-top: 6px;">🔍 Detected: ${matchedKeywords.join(', ')}</div>` : '';
    
    indicator.className = 'ai-indicator success';
    indicator.style.display = 'block';
    indicator.innerHTML = `
        <div class="ai-suggestion-content">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 20px;">🤖</span>
                    <span style="font-weight: 500;">AI detected:</span>
                    <span class="ai-category-badge" style="background: ${categoryInfo.bgColor}; color: ${categoryInfo.color};">
                        ${categoryInfo.name}
                    </span>
                    <span style="color: #6B7280;">(${confidencePercent}% confidence)</span>
                    ${priorityBadge}
                </div>
                ${keywordText}
            </div>
            <div class="ai-buttons">
                <button type="button" class="ai-accept-btn" id="acceptAISuggestion">✓ Accept</button>
                <button type="button" class="ai-dismiss-btn" id="dismissAISuggestion">✗ Dismiss</button>
            </div>
        </div>
    `;
    
    currentAnalysis = { category, confidence, priority, matchedKeywords };
    
    const acceptBtn = document.getElementById('acceptAISuggestion');
    const dismissBtn = document.getElementById('dismissAISuggestion');
    
    if (acceptBtn) {
        acceptBtn.onclick = () => {
            applyAICategory(category);
            if (priority) applyAIPriority(priority);
            indicator.style.display = 'none';
            showNotification(`✅ Set to ${categoryInfo.name}${priority ? ` with ${priority} priority` : ''}`, 'success');
        };
    }
    
    if (dismissBtn) {
        dismissBtn.onclick = () => {
            indicator.style.display = 'none';
        };
    }
}

// ========== FORM SETUP ==========
function getCurrentStudent() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        try {
            const student = JSON.parse(stored);
            return {
                id: student.userId || student.id || 'student_001',
                name: student.name || 'Student',
                studentId: student.studentId || student.id || '2024-00001',
                email: student.email || 'student@campus.edu'
            };
        } catch(e) {
            console.error('Error parsing student data:', e);
        }
    }
    return { id: 'student_001', name: 'Student', studentId: '2024-00001', email: 'student@campus.edu' };
}

function prefillStudentName() {
    const studentNameInput = document.getElementById('studentName');
    if (!studentNameInput) return;
    const student = getCurrentStudent();
    studentNameInput.value = student.name;
    studentNameInput.setAttribute('data-original-name', student.name);
}

function setupAnonymousToggle() {
    const anonymousToggle = document.getElementById('anonymousToggle');
    const studentNameInput = document.getElementById('studentName');
    const anonymousWarning = document.getElementById('anonymousWarning');
    const anonymousInfo = document.getElementById('anonymousInfo');
    
    if (!anonymousToggle) return;
    
    anonymousToggle.addEventListener('change', function(e) {
        if (this.checked) {
            if (!studentNameInput.getAttribute('data-original-name') && studentNameInput.value) {
                studentNameInput.setAttribute('data-original-name', studentNameInput.value);
            }
            studentNameInput.value = '';
            studentNameInput.disabled = true;
            studentNameInput.style.backgroundColor = '#F3F4F6';
            studentNameInput.style.color = '#6B7280';
            if (anonymousWarning) anonymousWarning.style.display = 'block';
            if (anonymousInfo) anonymousInfo.style.display = 'block';
            showNotification('🔒 Anonymous mode activated. Your name will not appear.', 'info');
        } else {
            const originalName = studentNameInput.getAttribute('data-original-name');
            studentNameInput.value = originalName || '';
            studentNameInput.disabled = false;
            studentNameInput.style.backgroundColor = '';
            studentNameInput.style.color = '';
            if (anonymousWarning) anonymousWarning.style.display = 'none';
            if (anonymousInfo) anonymousInfo.style.display = 'none';
            showNotification('Anonymous mode disabled. Your name will be visible.', 'info');
        }
    });
}

function setupImageUpload() {
    const imageInput = document.getElementById('image');
    const uploadZone = document.getElementById('uploadZone');
    const uploadContent = document.getElementById('uploadContent');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('previewImg');
    const removeBtn = document.getElementById('removeImageBtn');
    
    if (!uploadZone) return;
    
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== removeBtn && !removeBtn?.contains(e.target)) {
            imageInput.click();
        }
    });
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#1D9E75';
        uploadZone.style.background = '#F0FDF4';
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#D1D5DB';
        uploadZone.style.background = '#F9FAFB';
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#D1D5DB';
        uploadZone.style.background = '#F9FAFB';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            imageInput.value = '';
            uploadedImageData = null;
            currentImageFile = null;
            previewContainer.style.display = 'none';
            uploadContent.style.display = 'block';
            const indicator = document.getElementById('aiAnalysisIndicator');
            if (indicator) indicator.style.display = 'none';
            currentAnalysis = null;
        });
    }
    
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
    });
    
    async function handleImageFile(file) {
        currentImageFile = file;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageData = event.target.result;
            previewImg.src = uploadedImageData;
            uploadContent.style.display = 'none';
            previewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
        
        const indicator = document.getElementById('aiAnalysisIndicator');
        if (indicator) {
            indicator.className = 'ai-indicator processing';
            indicator.style.display = 'block';
            indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner-small"></div><span>🤖 AI is analyzing the image...</span></div>`;
        }
        
        try {
            // Load AI model if not loaded
            await loadMobileNetLazy();
            
            // Wait a bit for model to be ready
            await new Promise(r => setTimeout(r, 500));
            
            // Analyze image
            const aiResult = await analyzeImageWithAI(file);
            console.log('AI Result:', aiResult);
            
            if (aiResult && aiResult.predicted_type && aiResult.confidence > 0.35) {
                const priorityResult = await analyzePriorityLevel(file, aiResult.predicted_type);
                showAISuggestion(aiResult.predicted_type, aiResult.confidence, aiResult.matchedKeywords, priorityResult.priority);
                
                // Auto-accept if confidence is high enough
                if (aiResult.confidence > 0.7) {
                    setTimeout(() => {
                        applyAICategory(aiResult.predicted_type);
                        applyAIPriority(priorityResult.priority);
                        if (indicator) indicator.style.display = 'none';
                        showNotification(`AI auto-selected: ${categoryMapping[aiResult.predicted_type]?.name || aiResult.predicted_type}`, 'success');
                    }, 1000);
                }
            } else {
                if (indicator) {
                    indicator.className = 'ai-indicator error';
                    indicator.innerHTML = `<span>⚠️ Could not determine category (${Math.round((aiResult?.confidence || 0) * 100)}% confidence). Please select manually.</span>`;
                    setTimeout(() => indicator.style.display = 'none', 4000);
                }
            }
        } catch (error) {
            console.error('AI analysis error:', error);
            if (indicator) {
                indicator.className = 'ai-indicator error';
                indicator.innerHTML = `<span>⚠️ AI analysis failed. Please select category manually.</span>`;
                setTimeout(() => indicator.style.display = 'none', 3000);
            }
        }
    }
}

// ========== FORM SUBMISSION ==========
let pendingSubmitData = null;
let forceSubmitFlag = false;

async function performSubmit(forceSubmit = false) {
    const data = pendingSubmitData;
    if (!data) return;
    
    setLoading(true);
    
    try {
        const currentStudent = getCurrentStudent();
        const isAnonymous = data.isAnonymous;
        const finalStudentName = (isAnonymous && !data.studentName) ? 'Anonymous Reporter' : (data.studentName || currentStudent.name);
        
        let imageUrl = data.imageData || null;
        
        const localReport = {
            id: Date.now(),
            title: data.title,
            location: data.location,
            category: data.category,
            priority: data.priority,
            description: data.description,
            imageUrl: imageUrl,
            studentName: finalStudentName,
            studentId: currentStudent.studentId,
            reporterId: currentStudent.id,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        const existingReports = JSON.parse(localStorage.getItem('campus_care_reports') || '[]');
        existingReports.unshift(localReport);
        localStorage.setItem('campus_care_reports', JSON.stringify(existingReports));
        
        const isUrgent = isUrgentReport(data.category, data.priority, data.title, data.description);
        
        if (isUrgent) {
            await sendUrgentNotifications(localReport, currentStudent, isAnonymous);
            showNotification('🚨 URGENT REPORT SUBMITTED! Notifications sent.', 'warning');
        } else {
            showNotification('✅ Report submitted successfully!', 'success');
        }
        
        // Save to Supabase
        try {
            const supabaseData = {
                title: data.title,
                location: data.location,
                category: data.category,
                priority: data.priority,
                description: data.description,
                image_url: imageUrl,
                student_name: finalStudentName,
                student_id_number: currentStudent.studentId,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase.from('incident').insert([supabaseData]);
            if (error) console.error('Supabase error:', error);
        } catch (supabaseError) {
            console.log('Supabase save skipped:', supabaseError.message);
        }
        
        setTimeout(() => {
            window.location.href = '/Assets/Student_dashboard/SDB.html';
        }, 2000);
        
    } catch (error) {
        console.error('Submission error:', error);
        showNotification('❌ Failed: ' + error.message, 'error');
        setLoading(false);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('title')?.value.trim();
    const location = document.getElementById('location')?.value.trim();
    const category = document.getElementById('category')?.value;
    const priority = document.getElementById('priority')?.value;
    const description = document.getElementById('description')?.value.trim();
    const studentName = document.getElementById('studentName')?.value.trim();
    const anonymousToggle = document.getElementById('anonymousToggle');
    const isAnonymous = anonymousToggle ? anonymousToggle.checked : false;
    
    // Validation
    if (!title) { showErrorMessage('Please enter a title', 'titleError'); scrollToError(document.getElementById('title')); return; }
    if (!location) { showErrorMessage('Please enter a location', 'locationError'); scrollToError(document.getElementById('location')); return; }
    if (!category) { showErrorMessage('Please select a category', 'categoryError'); scrollToError(document.querySelector('.cat-grid')); return; }
    if (!priority) { showErrorMessage('Please select a priority level', 'priorityError'); scrollToError(document.querySelector('.priority-row')); return; }
    if (!description) { showErrorMessage('Please provide a description', 'descriptionError'); scrollToError(document.getElementById('description')); return; }
    
    setLoading(true);
    
    try {
        // Check for duplicates in Supabase database
        const duplicateCheck = await checkForDuplicateReport(title, location, category, description);
        
        if (duplicateCheck.hasDuplicates && !forceSubmitFlag) {
            setLoading(false);
            pendingSubmitData = {
                title, location, category, priority, description,
                studentName, isAnonymous, imageData: uploadedImageData
            };
            showDuplicateWarning(duplicateCheck.duplicates);
            return;
        }
        
        pendingSubmitData = {
            title, location, category, priority, description,
            studentName, isAnonymous, imageData: uploadedImageData
        };
        await performSubmit(true);
        
    } catch (error) {
        console.error('Duplicate check error:', error);
        setLoading(false);
        showNotification('Error checking for duplicates. Please try again.', 'error');
    }
}

// ========== UI HELPERS ==========
window.selCat = function(element) {
    document.querySelectorAll('.cat-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    const categoryInput = document.getElementById('category');
    if (categoryInput) categoryInput.value = element.getAttribute('data-cat');
};

window.selPriority = function(element) {
    document.querySelectorAll('.p-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    const priorityInput = document.getElementById('priority');
    if (priorityInput) priorityInput.value = element.getAttribute('data-priority');
};

window.goBack = function() {
    window.location.href = '/Assets/Student_dashboard/SDB.html';
};

function scrollToError(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('error');
    setTimeout(() => element.classList.remove('error'), 3000);
}

function showErrorMessage(message, elementId) {
    let errorDiv = document.getElementById(elementId);
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = elementId;
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: #DC2626; font-size: 12px; margin-top: 4px;';
        const parent = document.getElementById(elementId.replace('Error', ''))?.parentNode;
        if (parent) parent.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function setLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
        if (btnLoader) btnLoader.style.display = isLoading ? 'inline-block' : 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
        background: ${type === 'success' ? '#1D9E75' : type === 'warning' ? '#D97706' : type === 'info' ? '#3B82F6' : '#DC2626'};
        color: white; border-radius: 12px; font-size: 13px; font-weight: 500;
        z-index: 10000; animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initDarkModeSync();
    prefillStudentName();
    setupImageUpload();
    setupAnonymousToggle();
    
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleFormSubmit);
    }
    
    console.log('✅ Report page loaded. AI will load when you upload an image.');
});

// CSS animations
if (!document.querySelector('style[data-report-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-report-animations', 'true');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .spinner-small { width: 18px; height: 18px; border: 2px solid #1D9E75; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        .error { border: 2px solid #DC2626 !important; background-color: #FEF2F2 !important; }
        .ai-indicator { margin-top: 12px; padding: 12px 16px; border-radius: 12px; font-size: 13px; animation: fadeIn 0.3s ease; }
        .ai-indicator.processing { background: #EFF6FF; border-left: 3px solid #3B82F6; }
        .ai-indicator.success { background: #E8F5E9; border-left: 3px solid #1D9E75; }
        .ai-indicator.error { background: #FEF2F2; border-left: 3px solid #DC2626; }
        .ai-suggestion-content { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .ai-buttons { display: flex; gap: 8px; }
        .ai-accept-btn { background: #1D9E75; color: white; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 12px; }
        .ai-accept-btn:hover { background: #085041; }
        .ai-dismiss-btn { background: #E5E7EB; color: #4B5563; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 12px; }
        .ai-dismiss-btn:hover { background: #D1D5DB; }
        .ai-category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-weight: 500; font-size: 12px; }
        .anonymous-switch { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-radius: 12px; cursor: pointer; }
        #anonymousWarning, #anonymousInfo { animation: fadeIn 0.3s ease; }
        #anonymousWarning { background: #FEF3C7; border-left: 3px solid #D97706; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #92400E; margin-top: 8px; }
        #anonymousInfo { background: #E8F5E9; border-left: 3px solid #1D9E75; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #085041; margin-top: 8px; }
    `;
    document.head.appendChild(style);
}