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

// ========== LLM TEXT ANALYSIS ==========
async function analyzeTextWithLLM(text, title, category) {
    console.log(' Analyzing text with LLM...', { title, category, textLength: text.length });
    
    if ('ai' in window && window.ai?.canCreateTextSession) {
        try {
            const capabilities = await window.ai.canCreateTextSession();
            if (capabilities === 'readily') {
                const session = await window.ai.createTextSession();
                const prompt = `Analyze this campus incident report for an emergency system. Return ONLY valid JSON without markdown formatting.
                
Title: "${title}"
Category: "${category}"
Description: "${text.substring(0, 1000)}"

Return JSON with these exact fields:
{
    "severity": "low|medium|high|critical",
    "risk_factors": ["array", "of", "risk", "keywords"],
    "needs_immediate_action": true/false,
    "suggested_response": "string of what action to take",
    "sentiment": "urgent|neutral|routine",
    "confidence": 0.0 to 1.0
}`;
                
                const result = await session.prompt(prompt);
                session.destroy();
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const analysis = JSON.parse(cleaned);
                console.log('✅ LLM Analysis (Gemini):', analysis);
                return analysis;
            }
        } catch (error) {
            console.warn('Chrome AI failed:', error);
        }
    }
    
    return fallbackTextAnalysis(text);
}

//LLM ENGINE
function fallbackTextAnalysis(text) {
    const lowerText = text.toLowerCase();
    const threatLevels = {
        critical: {
            keywords: ['fire', 'smoke', 'burning', 'flame', 'explosion', 'blast', 'weapon', 'gun', 'knife', 'blade', 'active shooter', 'shooting', 'violence', 'assault', 'attack', 'fight', 'brawl', 'stab', 'stabbing', 'emergency', '911', 'help', 'danger', 'unsafe', 'hazardous', 'unconscious', 'fainted', 'seizure', 'heart attack', 'stroke', 'bleeding', 'blood', 'injury', 'injured', 'wound', 'chemical spill', 'gas leak', 'toxic', 'poison', 'collapse', 'collapsed', 'structural damage'],
            weight: 100
        },
        high: {
            keywords: ['broken pipe', 'water leak', 'flooding', 'flood', 'overflow', 'electrical', 'sparking', 'exposed wire', 'power outage', 'locked out', 'trapped', 'stuck elevator', 'suspicious person', 'trespassing', 'intruder', 'theft', 'robbery', 'stolen', 'missing', 'vandalism', 'damaged', 'destroyed', 'harassment', 'threat', 'intimidation', 'medical emergency', 'fall', 'accident', 'gas smell', 'strange odor'],
            weight: 70
        },
        medium: {
            keywords: ['not working', 'malfunction', 'broken', 'cracked', 'damage', 'ac not working', 'heater broken', 'no hot water', 'elevator stuck', 'door jammed', 'window broken', 'leaking', 'dripping', 'clogged', 'backed up', 'loud noise', 'strange sound', 'banging', 'flickering light', 'burnt out bulb', 'pest', 'rodent', 'insect', 'slip hazard', 'trip hazard', 'wet floor'],
            weight: 40
        },
        low: {
            keywords: ['trash', 'garbage', 'overflowing bin', 'recycling', 'dirty', 'messy', 'unsanitary', 'mold', 'mildew', 'odor', 'smell', 'stinky', 'foul', 'paint chipping', 'peeling paint', 'scuff mark', 'graffiti', 'tag', 'vandal', 'landscaping', 'overgrown', 'weeds', 'light out', 'bulb replacement', 'supplies needed', 'restock'],
            weight: 15
        }
    };
    
    const amplifiers = {
        urgent: ['immediately', 'asap', 'right now', 'urgent', 'emergency', 'critical'],
        widespread: ['everyone', 'whole building', 'entire floor', 'many people', 'multiple'],
        time_sensitive: ['spreading', 'getting worse', 'growing', 'expanding']
    };
    
    let scores = { critical: 0, high: 0, medium: 0, low: 0 };
    let detectedKeywords = [];
    let matchedAmplifiers = [];

    for (const [level, data] of Object.entries(threatLevels)) {
        for (const keyword of data.keywords) {
            if (lowerText.includes(keyword)) {
                scores[level] += data.weight;
                detectedKeywords.push(keyword);
                if (lowerText.includes(` ${keyword} `) || lowerText.startsWith(keyword)) {
                    scores[level] += data.weight * 0.3;
                }
            }
        }
    }
    
    for (const [type, words] of Object.entries(amplifiers)) {
        for (const word of words) {
            if (lowerText.includes(word)) {
                matchedAmplifiers.push(word);
                scores.critical += 15;
                scores.high += 12;
                scores.medium += 8;
            }
        }
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) {
        scores.critical += 5;
        scores.high += 5;
    }
    
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) {
        scores.critical += exclamationCount * 10;
        scores.high += exclamationCount * 5;
    }
    
    let severity = 'low';
    let maxScore = scores.low;
    if (scores.critical > maxScore) { severity = 'critical'; maxScore = scores.critical; }
    if (scores.high > maxScore) { severity = 'high'; maxScore = scores.high; }
    if (scores.medium > maxScore) { severity = 'medium'; maxScore = scores.medium; }
    
    const uniqueRiskFactors = [...new Set(detectedKeywords.slice(0, 5))];
    let suggestedResponse = '';
    let needsImmediateAction = false;
    
    if (severity === 'critical') {
        needsImmediateAction = true;
        if (scores.critical > 200) {
            suggestedResponse = '🚨 CRITICAL EMERGENCY: Evacuate area immediately! Contact campus security and emergency services (911).';
        } else if (lowerText.includes('fire') || lowerText.includes('smoke')) {
            suggestedResponse = '🔥 FIRE HAZARD: Activate fire alarm, evacuate building, call 911 and campus security.';
        } else if (lowerText.includes('weapon') || lowerText.includes('gun') || lowerText.includes('violence')) {
            suggestedResponse = '⚠️ SAFETY THREAT: Run-Hide-Fight protocol. Lock doors, call 911 immediately.';
        } else if (lowerText.includes('injury') || lowerText.includes('blood') || lowerText.includes('unconscious')) {
            suggestedResponse = '🏥 MEDICAL EMERGENCY: Call 911. Do not move injured person. Provide first aid if trained.';
        } else {
            suggestedResponse = '🚨 IMMEDIATE ACTION REQUIRED: Notify campus security and emergency services.';
        }
    } else if (severity === 'high') {
        if (lowerText.includes('water') || lowerText.includes('flood') || lowerText.includes('leak')) {
            suggestedResponse = '💧 URGENT: Facilities dispatched. Estimated response: 30 minutes.';
        } else if (lowerText.includes('electrical') || lowerText.includes('power')) {
            suggestedResponse = '⚡ ELECTRICAL HAZARD: Stay away from area. Facilities dispatched. Estimated response: 1 hour.';
        } else {
            suggestedResponse = '⚠️ High Priority: Department dispatched. Response within 30-60 minutes.';
        }
    } else if (severity === 'medium') {
        suggestedResponse = '📋 Medium Priority: Issue logged. Expected resolution within 24 hours.';
    } else {
        suggestedResponse = '✅ Routine Request: Added to maintenance queue. Expected resolution within 2-3 business days.';
    }
    
    let sentiment = severity === 'critical' || severity === 'high' ? 'urgent' : severity === 'medium' ? 'neutral' : 'routine';
    let confidence = maxScore > 100 ? 0.95 : maxScore > 70 ? 0.85 : maxScore > 40 ? 0.75 : maxScore > 20 ? 0.65 : 0.6;
    
    const context = {
        hasLocation: /\b(building|room|hall|floor|wing|office|classroom|laboratory)\b/i.test(text),
        hasTimeFrame: /\b(now|immediately|asap|urgent|today|tonight)\b/i.test(text),
        hasPeople: /\b(students|staff|faculty|people|everyone|crowd)\b/i.test(text)
    };
    
    if (context.hasLocation && severity !== 'critical') {
        suggestedResponse += ' Location information included - will expedite response.';
    }
    if (context.hasPeople && severity === 'high') {
        suggestedResponse += ' Multiple people may be affected. Consider broader notification.';
        needsImmediateAction = true;
    }
    
    return {
        severity: severity,
        risk_factors: uniqueRiskFactors,
        needs_immediate_action: needsImmediateAction,
        suggested_response: suggestedResponse,
        sentiment: sentiment,
        confidence: confidence,
        analysis_details: { score: maxScore, matched_keywords_count: detectedKeywords.length, amplifiers_found: matchedAmplifiers }
    };
}

function showLLMSuggestion(analysis) {
    const existingPopup = document.querySelector('.llm-popup');
    if (existingPopup) existingPopup.remove();
    const existingCompact = document.querySelector('.llm-compact');
    if (existingCompact) existingCompact.remove();
    
    const descriptionCard = document.querySelector('.card:has(#description)');
    if (!descriptionCard) return;
    descriptionCard.style.position = 'relative';
    
    const severityMap = {
        critical: { class: 'llm-severity-critical', icon: '🔴', text: 'CRITICAL' },
        high: { class: 'llm-severity-high', icon: '🟠', text: 'HIGH RISK' },
        medium: { class: 'llm-severity-medium', icon: '🟡', text: 'MEDIUM RISK' },
        low: { class: 'llm-severity-low', icon: '🟢', text: 'LOW RISK' }
    };
    
    const severityInfo = severityMap[analysis.severity] || severityMap.low;
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        const compactDiv = document.createElement('div');
        compactDiv.className = 'llm-compact';
        compactDiv.innerHTML = `
            <div class="llm-compact-row">
                <span class="llm-compact-badge ${severityInfo.class}">${severityInfo.icon} ${severityInfo.text}</span>
                <span class="llm-compact-text">💡 ${analysis.suggested_response.substring(0, 60)}${analysis.suggested_response.length > 60 ? '...' : ''}</span>
                <div class="llm-compact-actions">
                    <button class="llm-compact-btn llm-accept-btn">Apply</button>
                    <button class="llm-compact-btn llm-dismiss-btn">✗</button>
                </div>
            </div>
        `;
        descriptionCard.appendChild(compactDiv);
        compactDiv.querySelector('.llm-accept-btn')?.addEventListener('click', () => {
            if (analysis.severity === 'critical' || analysis.severity === 'high') applyAIPriority('high');
            else if (analysis.severity === 'medium') applyAIPriority('medium');
            compactDiv.remove();
            showNotification('Applied text analysis suggestions', 'success');
        });
        compactDiv.querySelector('.llm-dismiss-btn')?.addEventListener('click', () => compactDiv.remove());
    } else {
        const popup = document.createElement('div');
        popup.className = 'llm-popup';
        popup.innerHTML = `
            <div class="llm-popup-header">
                <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"/><path d="M12 6v6l4 2"/></svg>AI Analysis</h4>
                <button class="llm-close-btn" id="llmClosePopup">✕</button>
            </div>
            <div class="llm-popup-content">
                <div class="llm-severity-badge ${severityInfo.class}">${severityInfo.icon} ${severityInfo.text} ${analysis.needs_immediate_action ? '⚠️ Immediate Action' : ''}</div>
                ${analysis.risk_factors?.length > 0 ? `<div class="llm-risk-factors"><strong>⚠️ Risk Factors Detected</strong><div class="llm-risk-tags">${analysis.risk_factors.map(factor => `<span class="llm-risk-tag">${factor}</span>`).join('')}</div></div>` : ''}
                <div class="llm-suggestion"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${analysis.suggested_response}</div>
                <div class="llm-popup-actions"><button class="llm-accept-btn" id="llmAcceptBtn">✓ Apply Suggestion</button><button class="llm-dismiss-btn" id="llmDismissBtn">✗ Dismiss</button></div>
            </div>
        `;
        descriptionCard.appendChild(popup);
        document.getElementById('llmClosePopup')?.addEventListener('click', () => popup.remove());
        document.getElementById('llmAcceptBtn')?.addEventListener('click', () => {
            if (analysis.severity === 'critical' || analysis.severity === 'high') applyAIPriority('high');
            else if (analysis.severity === 'medium') applyAIPriority('medium');
            popup.remove();
            showNotification('Applied text analysis suggestions', 'success');
        });
        document.getElementById('llmDismissBtn')?.addEventListener('click', () => popup.remove());
    }
}

// ========== URGENT ALERT FUNCTIONS ==========
function isUrgentReport(category, priority, title, description) {
    const urgentKeywords = ['fire', 'smoke', 'burning', 'flame', 'emergency', 'danger', 'urgent', 'critical', 'hazard', 'explosion', 'chemical spill', 'gas leak', 'electrical fire', 'alarm', 'evacuation', 'violence', 'assault', 'weapon', 'injury', 'blood', 'accident'];
    if (category === 'security' && priority === 'high') return true;
    if (priority === 'high') {
        const textToCheck = `${title} ${description}`.toLowerCase();
        for (const keyword of urgentKeywords) {
            if (textToCheck.includes(keyword)) return true;
        }
    }
    return false;
}

async function fetchUserNotifications(userId) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error) { console.error('Error fetching notifications:', error); return []; }
    return data || [];
}

async function markNotificationAsRead(notificationId) {
    const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
    if (error) console.error('Error marking as read:', error);
    return !error;
}

async function sendUrgentNotifications(report, currentUser, isAnonymous) {
    console.log('🚨 SENDING URGENT NOTIFICATIONS TO DATABASE...', report);
    const { data: allUsers, error } = await supabase.from('users').select('id, email, name, role');
    if (error) { console.error('Failed to fetch users:', error); return; }
    const usersToNotify = allUsers.filter(user => user.id !== currentUser.id);
    const notifications = usersToNotify.map(user => ({
        alert_id: report.id.toString(), user_id: user.id, user_role: user.role, channel: 'IN_APP', status: 'SENT',
        sent_at: new Date().toISOString(), title: `🚨 URGENT: ${report.title}`,
        message: `${isAnonymous ? 'Anonymous' : report.studentName} reported: ${report.description.substring(0, 100)}`,
        location: report.location, category: report.category, priority: report.priority, is_read: false, created_at: new Date().toISOString()
    }));
    const { data: inserted, error: insertError } = await supabase.from('notifications').insert(notifications).select();
    if (insertError) console.error('Failed to insert notifications:', insertError);
    else console.log(`✅ Sent ${inserted?.length || notifications.length} urgent notifications`);
    storeUrgentAlert({ id: report.id, title: report.title, location: report.location, category: report.category, priority: report.priority, description: report.description, reporterName: isAnonymous ? 'Anonymous Reporter' : report.studentName, timestamp: new Date().toISOString() });
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
                indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner-small"></div><span> Loading AI model (first time takes 3-5 seconds)...</span></div>`;
            }
            
            if (typeof tf === 'undefined') {
                await new Promise((resolveScript) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
                    script.onload = resolveScript;
                    script.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
                    document.head.appendChild(script);
                });
            }
            
            await new Promise(r => setTimeout(r, 100));
            
            if (typeof mobilenet === 'undefined') {
                await new Promise((resolveScript) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
                    script.onload = resolveScript;
                    script.onerror = () => reject(new Error('Failed to load MobileNet'));
                    document.head.appendChild(script);
                });
            }
            
            await new Promise(r => setTimeout(r, 200));
            mobilenetModel = await mobilenet.load();
            console.log('✅ MobileNet model loaded successfully!');
            if (indicator) indicator.style.display = 'none';
            showNotification('AI ready! Upload an image for analysis.', 'success');
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

const categoryMapping = {
    'security': { name: 'Security Alert', color: '#DC2626', bgColor: '#FEF2F2', keywords: ['knife', 'weapon', 'gun', 'pistol', 'rifle', 'danger', 'threat', 'intruder', 'violence', 'attack', 'fight', 'assault', 'suspicious', 'trespassing', 'theft', 'robbery', 'vandalism', 'broken glass', 'harassment', 'emergency', 'fire', 'smoke', 'flame', 'burning', 'alarm', 'security', 'police', 'blood', 'injury', 'accident', 'crowd', 'riot', 'argument', 'shouting', 'scream', 'broken window'] },
    'maintenance': { name: 'Maintenance', color: '#2563EB', bgColor: '#EFF6FF', keywords: ['broken', 'wire', 'sparking', 'light', 'electrical', 'pipe', 'leak', 'ac', 'cracked', 'flickering', 'outlet', 'plumbing', 'flood', 'water', 'heater', 'circuit', 'breaker', 'switch', 'socket', 'cable', 'ceiling', 'floor', 'wall crack', 'paint peeling'] },
    'janitorial': { name: 'Janitorial', color: '#085041', bgColor: '#E1F5EE', keywords: ['trash', 'garbage', 'dirty', 'toilet', 'spill', 'overflow', 'mess', 'odor', 'smell', 'bathroom', 'restroom', 'clean', 'dust', 'mold', 'clogged', 'sink', 'urinal', 'waste', 'litter', 'debris', 'stain', 'floor wet', 'water spill', 'food waste'] },
    'facilities': { name: 'Facilities', color: '#D97706', bgColor: '#FFFBEB', keywords: ['elevator', 'door', 'window', 'ceiling', 'floor', 'wall', 'paint', 'furniture', 'chair', 'table', 'desk', 'stair', 'railing', 'lighting', 'exit', 'signage', 'handle', 'lock', 'hinge', 'carpet', 'tile', 'vent', 'hvac'] }
};

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
                
                if (mobilenetModel) {
                    try {
                        const predictions = await analyzeImageWithMobileNet(img);
                        if (predictions && predictions.length > 0) {
                            allPredictions = predictions;
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
                                const securityKeywords = ['knife', 'weapon', 'gun', 'pistol', 'rifle', 'scissors', 'blade', 'axe', 'hammer'];
                                for (const secKeyword of securityKeywords) {
                                    if (className.includes(secKeyword)) {
                                        detectedCategory = 'security';
                                        highestConfidence = Math.max(highestConfidence, 0.85);
                                        matchedKeywords.push(secKeyword);
                                    }
                                }
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
                    } catch (err) { console.error('MobileNet analysis error:', err); }
                }
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let redPixels = 0, darkPixels = 0, brightPixels = 0;
                let totalPixels = canvas.width * canvas.height;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    const brightness = (r + g + b) / 3;
                    if (r > 200 && g < 100 && b < 100) redPixels++;
                    if (brightness < 50) darkPixels++;
                    if (brightness > 200) brightPixels++;
                }
                const redRatio = redPixels / totalPixels;
                const darkRatio = darkPixels / totalPixels;
                const brightRatio = brightPixels / totalPixels;
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
                if (highestConfidence < 0.35) {
                    detectedCategory = 'maintenance';
                    highestConfidence = 0.4;
                    matchedKeywords.push('unclear_image_default');
                }
                highestConfidence = Math.min(highestConfidence, 0.95);
                resolve({ predicted_type: detectedCategory, confidence: highestConfidence, matchedKeywords: matchedKeywords.slice(0, 3), allPredictions: allPredictions });
            };
            img.onerror = () => resolve({ predicted_type: 'maintenance', confidence: 0.3, matchedKeywords: [] });
        };
        reader.onerror = () => resolve({ predicted_type: 'maintenance', confidence: 0.3, matchedKeywords: [] });
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
                let redIntensity = 0, darkIntensity = 0, brightIntensity = 0;
                const pixelCount = canvas.width * canvas.height;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    if (r > 200 && g < 100 && b < 100) redIntensity++;
                    const brightness = (r + g + b) / 3;
                    if (brightness < 40) darkIntensity++;
                    if (brightness > 200) brightIntensity++;
                }
                redIntensity /= pixelCount;
                darkIntensity /= pixelCount;
                brightIntensity /= pixelCount;
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
                } else { urgencyScore = 0.45; }
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
        } else { item.classList.remove('active'); }
    });
}

function applyAIPriority(priority) {
    const priorityButtons = document.querySelectorAll('.p-btn');
    const priorityInput = document.getElementById('priority');
    priorityButtons.forEach((btn) => {
        if (btn.getAttribute('data-priority') === priority) {
            btn.classList.add('active');
            if (priorityInput) priorityInput.value = priority;
        } else { btn.classList.remove('active'); }
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
        const priorityColors = { high: { bg: '#FEF2F2', color: '#DC2626', text: '🔴 High Priority' }, medium: { bg: '#FFFBEB', color: '#D97706', text: '🟠 Medium Priority' }, low: { bg: '#E1F5EE', color: '#1D9E75', text: '🟢 Low Priority' } };
        const pc = priorityColors[priority];
        if (pc) priorityBadge = `<span style="background: ${pc.bg}; color: ${pc.color}; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${pc.text}</span>`;
    }
    let keywordText = matchedKeywords && matchedKeywords.length > 0 ? `<div style="font-size: 11px; color: #6B7280; margin-top: 6px;">🔍 Detected: ${matchedKeywords.join(', ')}</div>` : '';
    indicator.className = 'ai-indicator success';
    indicator.style.display = 'block';
    indicator.innerHTML = `<div class="ai-suggestion-content"><div style="flex:1;"><div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;"><span style="font-size:20px;">🤖</span><span style="font-weight:500;">AI detected:</span><span class="ai-category-badge" style="background:${categoryInfo.bgColor}; color:${categoryInfo.color};">${categoryInfo.name}</span><span style="color:#6B7280;">(${confidencePercent}% confidence)</span>${priorityBadge}</div>${keywordText}</div><div class="ai-buttons"><button type="button" class="ai-accept-btn" id="acceptAISuggestion">✓ Accept</button><button type="button" class="ai-dismiss-btn" id="dismissAISuggestion">✗ Dismiss</button></div></div>`;
    currentAnalysis = { category, confidence, priority, matchedKeywords };
    const acceptBtn = document.getElementById('acceptAISuggestion');
    const dismissBtn = document.getElementById('dismissAISuggestion');
    if (acceptBtn) acceptBtn.onclick = () => { applyAICategory(category); if (priority) applyAIPriority(priority); indicator.style.display = 'none'; showNotification(`✅ Set to ${categoryInfo.name}${priority ? ` with ${priority} priority` : ''}`, 'success'); };
    if (dismissBtn) dismissBtn.onclick = () => { indicator.style.display = 'none'; };
}

// ========== FORM SETUP ==========
function getCurrentStudent() {
    const stored = localStorage.getItem('currentStudent');
    if (stored) {
        try {
            const student = JSON.parse(stored);
            return { id: student.userId || student.id || 'student_001', name: student.name || 'Student', studentId: student.studentId || student.id || '2024-00001', email: student.email || 'student@campus.edu' };
        } catch(e) { console.error('Error parsing student data:', e); }
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
            if (!studentNameInput.getAttribute('data-original-name') && studentNameInput.value) studentNameInput.setAttribute('data-original-name', studentNameInput.value);
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

// ========== GEMINI VISION API ==========
const GEMINI_API_KEY = 'AIzaSyAvDlGENdvHzRRnK0gW41KEq-MxKIb9HZI';

async function generateImageDescription(imageFile) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result.split(',')[1];
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "You are a campus safety assistant. Analyze this image and describe ONLY the problem/issue/damage/hazard you see. Be specific and concise. Start your response with 'The problem here is:'" },
                                { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                            ]
                        }]
                    })
                });
                const data = await response.json();
                if (data.error) {
                    console.error('Gemini API Error:', data.error);
                    resolve({ description: "The problem here is: ", predictions: [], confidence: 0, issues: [] });
                    return;
                }
                const description = data.candidates?.[0]?.content?.parts?.[0]?.text || "The problem here is: ";
                console.log('✅ Gemini Vision Analysis:', description);
                resolve({ description: description, predictions: [], confidence: 85, issues: [] });
            } catch (error) {
                console.error('Gemini API error:', error);
                resolve({ description: "The problem here is: ", predictions: [], confidence: 0, issues: [] });
            }
        };
        reader.readAsDataURL(imageFile);
    });
}

async function analyzeImageColors(img) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let redPixels = 0, darkPixels = 0, brightPixels = 0;
        let totalPixels = canvas.width * canvas.height;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const brightness = (r + g + b) / 3;
            if (r > 200 && g < 100 && b < 100) redPixels++;
            if (brightness < 50) darkPixels++;
            if (brightness > 200) brightPixels++;
        }
        const redRatio = redPixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;
        const brightRatio = brightPixels / totalPixels;
        let colorDesc = '';
        if (redRatio > 0.05) colorDesc = ' Red color detected - may indicate emergency or blood.';
        if (darkRatio > 0.6) colorDesc += ' Very dark image - lighting issue suspected.';
        if (brightRatio > 0.6) colorDesc += ' Very bright image - possible overexposure or daylight.';
        resolve(colorDesc);
    });
}

// ========== IMAGE UPLOAD SETUP ==========
function setupImageUpload() {
    const imageInput = document.getElementById('image');
    const uploadZone = document.getElementById('uploadZone');
    const uploadContent = document.getElementById('uploadContent');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('previewImg');
    const removeBtn = document.getElementById('removeImageBtn');
    
    if (!uploadZone) return;
    
    const choiceDialog = document.createElement('div');
    choiceDialog.id = 'uploadChoiceDialog';
    choiceDialog.style.cssText = `position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:20000; display:none; align-items:center; justify-content:center; animation:fadeIn 0.2s ease;`;
    choiceDialog.innerHTML = `<div style="background:var(--surface); border-radius:24px; max-width:340px; width:90%; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.3);"><div style="padding:24px;"><div style="text-align:center; margin-bottom:24px;"><span style="font-size:48px;">📸</span><h3 style="font-size:20px; font-weight:600; margin-top:12px; color:var(--text);">Choose Image Source</h3></div><div style="display:flex; flex-direction:column; gap:12px;"><button id="chooseGalleryBtn" style="padding:14px; background:#1D9E75; color:white; border:none; border-radius:40px; cursor:pointer; font-weight:500; font-size:16px; display:flex; align-items:center; justify-content:center; gap:12px;"><span>🖼️</span> Upload from Gallery</button><button id="chooseCameraBtn" style="padding:14px; background:#3B82F6; color:white; border:none; border-radius:40px; cursor:pointer; font-weight:500; font-size:16px; display:flex; align-items:center; justify-content:center; gap:12px;"><span>📷</span> Take a Photo</button><button id="cancelChoiceBtn" style="padding:12px; background:transparent; color:var(--text); border:1px solid var(--border); border-radius:40px; cursor:pointer; font-weight:500; font-size:14px;">Cancel</button></div></div></div>`;
    document.body.appendChild(choiceDialog);
    
    const cameraModal = document.createElement('div');
    cameraModal.id = 'cameraModal';
    cameraModal.style.cssText = `position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.95); z-index:20001; display:none; flex-direction:column; align-items:center; justify-content:center; animation:fadeIn 0.3s ease;`;
    cameraModal.innerHTML = `<div style="background:var(--surface); border-radius:24px; max-width:95%; width:500px; overflow:hidden;"><div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;"><h3 style="font-size:18px; font-weight:600; color:var(--text);">Take a Photo</h3><button id="closeCameraModalBtn" style="background:none; border:none; font-size:28px; cursor:pointer; color:var(--text);">&times;</button></div><div style="padding:20px;"><div style="position:relative; background:#000; border-radius:12px; overflow:hidden;"><video id="cameraVideo" autoplay playsinline style="width:100%; border-radius:12px; display:block;"></video><canvas id="cameraCanvas" style="display:none;"></canvas></div><div style="display:flex; gap:12px; margin-top:20px;"><button id="capturePhotoBtn" style="flex:1; padding:14px; background:#1D9E75; color:white; border:none; border-radius:40px; cursor:pointer; font-weight:500; font-size:16px;">📸 Capture</button><button id="cancelCameraModalBtn" style="flex:1; padding:14px; background:#6B7280; color:white; border:none; border-radius:40px; cursor:pointer; font-weight:500; font-size:16px;">Cancel</button></div></div></div>`;
    document.body.appendChild(cameraModal);
    
    let currentStream = null;
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    
    uploadZone.addEventListener('click', (e) => { if (e.target === removeBtn || removeBtn?.contains(e.target)) return; choiceDialog.style.display = 'flex'; });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#1D9E75'; uploadZone.style.background = '#F0FDF4'; });
    uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#D1D5DB'; uploadZone.style.background = '#F9FAFB'; });
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#D1D5DB'; uploadZone.style.background = '#F9FAFB'; const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) { choiceDialog.style.display = 'none'; handleImageFile(file); } });
    
    const galleryBtn = document.getElementById('chooseGalleryBtn');
    if (galleryBtn) galleryBtn.addEventListener('click', () => { choiceDialog.style.display = 'none'; imageInput.click(); });
    const cameraBtn = document.getElementById('chooseCameraBtn');
    if (cameraBtn) cameraBtn.addEventListener('click', async () => { choiceDialog.style.display = 'none'; await requestCameraAccess(); });
    const cancelChoiceBtn = document.getElementById('cancelChoiceBtn');
    if (cancelChoiceBtn) cancelChoiceBtn.addEventListener('click', () => { choiceDialog.style.display = 'none'; });
    
    async function requestCameraAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            currentStream = stream;
            video.srcObject = stream;
            cameraModal.style.display = 'flex';
        } catch (error) {
            console.error('Camera access error:', error);
            let errorMessage = 'Unable to access camera. ';
            if (error.name === 'NotAllowedError') errorMessage += 'Please allow camera access.';
            else if (error.name === 'NotFoundError') errorMessage += 'No camera found.';
            else errorMessage += 'Please check camera permissions.';
            showNotification(errorMessage, 'error');
            closeCameraModal();
        }
    }
    
    const captureBtn = document.getElementById('capturePhotoBtn');
    if (captureBtn) captureBtn.addEventListener('click', () => {
        if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                closeCameraModal();
                await handleImageFile(file);
            }, 'image/jpeg', 0.9);
        }
    });
    
    function closeCameraModal() {
        if (currentStream) { currentStream.getTracks().forEach(track => track.stop()); currentStream = null; }
        cameraModal.style.display = 'none';
        video.srcObject = null;
    }
    
    const closeCameraModalBtn = document.getElementById('closeCameraModalBtn');
    const cancelCameraModalBtn = document.getElementById('cancelCameraModalBtn');
    if (closeCameraModalBtn) closeCameraModalBtn.addEventListener('click', closeCameraModal);
    if (cancelCameraModalBtn) cancelCameraModalBtn.addEventListener('click', closeCameraModal);
    
    if (removeBtn) removeBtn.addEventListener('click', (e) => {
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
    
    imageInput.addEventListener('change', function(e) { const file = e.target.files[0]; if (file) handleImageFile(file); imageInput.value = ''; });
    
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
            indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner-small"></div><span>🔍 AI is analyzing the image with Gemini Vision...</span></div>`;
        }
        
        try {
            await loadMobileNetLazy();
            await new Promise(r => setTimeout(r, 500));

            const [aiResult, imageDescription] = await Promise.all([
                analyzeImageWithAI(file),
                generateImageDescription(file)
            ]);
            
            console.log('MobileNet AI Result:', aiResult);
            console.log('Gemini Vision Analysis:', imageDescription);
            
            const descriptionField = document.getElementById('description');
            const titleField = document.getElementById('title');
            
            if (descriptionField && imageDescription && imageDescription.description && !imageDescription.description.includes("unable to analyze")) {
                const currentDesc = descriptionField.value;
                const geminiDescription = imageDescription.description;
                
                if (!currentDesc || currentDesc.trim().length === 0 || currentDesc === "The problem here is: " || currentDesc.includes('[AI Analysis]')) {
                    descriptionField.value = geminiDescription;
                    descriptionField.style.borderColor = 'var(--teal)';
                    descriptionField.style.backgroundColor = 'var(--teal-light)';
                    descriptionField.focus();
                    const length = descriptionField.value.length;
                    descriptionField.setSelectionRange(length, length);
                    showNotification('📸 Gemini AI analyzed the image! Description added. You can edit if needed.', 'success');
                    
                    if (titleField && (!titleField.value || titleField.value.trim().length === 0)) {
                        titleField.placeholder = "e.g., Broken Window, Water Leak, Trash Overflow";
                        titleField.style.backgroundColor = 'var(--teal-light)';
                        setTimeout(() => { titleField.style.backgroundColor = ''; }, 2000);
                    }
                    
                    setTimeout(() => { descriptionField.style.backgroundColor = ''; }, 3000);
                    descriptionField.dispatchEvent(new Event('input'));
                }
            }
            
            if (aiResult && aiResult.predicted_type && aiResult.confidence > 0.35) {
                const priorityResult = await analyzePriorityLevel(file, aiResult.predicted_type);
                showAISuggestion(aiResult.predicted_type, aiResult.confidence, aiResult.matchedKeywords, priorityResult.priority);
                
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
        const localReport = { id: Date.now(), title: data.title, location: data.location, category: data.category, priority: data.priority, description: data.description, imageUrl: imageUrl, studentName: finalStudentName, studentId: currentStudent.studentId, reporterId: currentStudent.id, status: 'pending', timestamp: new Date().toISOString(), llm_analysis: data.llm_analysis };
        const existingReports = JSON.parse(localStorage.getItem('campus_care_reports') || '[]');
        existingReports.unshift(localReport);
        localStorage.setItem('campus_care_reports', JSON.stringify(existingReports));
        const isUrgent = isUrgentReport(data.category, data.priority, data.title, data.description) || (data.llm_analysis?.severity === 'critical');
        if (isUrgent) { await sendUrgentNotifications(localReport, currentStudent, isAnonymous); showNotification('🚨 URGENT REPORT SUBMITTED! Notifications sent.', 'warning'); }
        else { showNotification('✅ Report submitted successfully!', 'success'); }
        try {
            const supabaseData = { title: data.title, location: data.location, category: data.category, priority: data.priority, description: data.description, image_url: imageUrl, student_name: finalStudentName, student_id_number: currentStudent.studentId, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), llm_analysis: data.llm_analysis, text_severity: data.llm_analysis?.severity };
            const { error } = await supabase.from('incident').insert([supabaseData]);
            if (error) console.error('Supabase error:', error);
        } catch (supabaseError) { console.log('Supabase save skipped:', supabaseError.message); }
        setTimeout(() => { window.location.href = '/Assets/Student_dashboard/SDB.html'; }, 2000);
    } catch (error) { console.error('Submission error:', error); showNotification('❌ Failed: ' + error.message, 'error'); setLoading(false); }
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
    if (!title) { showErrorMessage('Please enter a title', 'titleError'); scrollToError(document.getElementById('title')); return; }
    if (!location) { showErrorMessage('Please enter a location', 'locationError'); scrollToError(document.getElementById('location')); return; }
    if (!category) { showErrorMessage('Please select a category', 'categoryError'); scrollToError(document.querySelector('.cat-grid')); return; }
    if (!priority) { showErrorMessage('Please select a priority level', 'priorityError'); scrollToError(document.querySelector('.priority-row')); return; }
    if (!description) { showErrorMessage('Please provide a description', 'descriptionError'); scrollToError(document.getElementById('description')); return; }
    setLoading(true);
    try {
        const llmAnalysis = await analyzeTextWithLLM(description, title, category);
        console.log('LLM Analysis Result:', llmAnalysis);
        if (llmAnalysis && document.getElementById('llmTextIndicator')) showLLMSuggestion(llmAnalysis);
        const duplicateCheck = await checkForDuplicateReport(title, location, category, description);
        if (duplicateCheck.hasDuplicates && !forceSubmitFlag) {
            setLoading(false);
            pendingSubmitData = { title, location, category, priority, description, studentName, isAnonymous, imageData: uploadedImageData, llm_analysis: llmAnalysis };
            showDuplicateWarning(duplicateCheck.duplicates);
            return;
        }
        pendingSubmitData = { title, location, category, priority, description, studentName, isAnonymous, imageData: uploadedImageData, llm_analysis: llmAnalysis };
        await performSubmit(true);
    } catch (error) { console.error('Duplicate check error:', error); setLoading(false); showNotification('Error checking for duplicates. Please try again.', 'error'); }
}

// ========== UI HELPERS ==========
window.selCat = function(element) {
    document.querySelectorAll('.cat-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    const categoryInput = document.getElementById('category');
    if (categoryInput) categoryInput.value = element.getAttribute('data-cat');
    const description = document.getElementById('description')?.value;
    const title = document.getElementById('title')?.value;
    if (description && description.length > 20) {
        analyzeTextWithLLM(description, title, element.getAttribute('data-cat')).then(analysis => { if (analysis && document.getElementById('llmTextIndicator')) showLLMSuggestion(analysis); });
    }
};

window.selPriority = function(element) {
    document.querySelectorAll('.p-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    const priorityInput = document.getElementById('priority');
    if (priorityInput) priorityInput.value = element.getAttribute('data-priority');
};

window.goBack = function() { window.location.href = '/Assets/Student_dashboard/SDB.html'; };

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
    notification.style.cssText = `position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; background: ${type === 'success' ? '#1D9E75' : type === 'warning' ? '#D97706' : type === 'info' ? '#3B82F6' : '#DC2626'}; color: white; border-radius: 12px; font-size: 13px; font-weight: 500; z-index: 10000; animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease'; setTimeout(() => notification.remove(), 300); }, 3000);
}

// ========== TEXT INPUT HANDLER FOR LLM ==========
let textAnalysisTimeout;
function setupTextAnalysis() {
    const descriptionInput = document.getElementById('description');
    const titleInput = document.getElementById('title');
    const triggerAnalysis = () => {
        clearTimeout(textAnalysisTimeout);
        textAnalysisTimeout = setTimeout(async () => {
            const description = document.getElementById('description')?.value;
            const title = document.getElementById('title')?.value;
            const category = document.getElementById('category')?.value || 'maintenance';
            if (description && description.length > 15) {
                const indicator = document.getElementById('llmTextIndicator');
                if (indicator && !indicator.innerHTML.includes('Loading')) {
                    indicator.className = 'ai-indicator processing';
                    indicator.style.display = 'block';
                    indicator.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner-small"></div><span>📝 Analyzing text...</span></div>`;
                }
                const analysis = await analyzeTextWithLLM(description, title, category);
                if (analysis && document.getElementById('llmTextIndicator')) showLLMSuggestion(analysis);
            }
        }, 1000);
    };
    if (descriptionInput) descriptionInput.addEventListener('input', triggerAnalysis);
    if (titleInput) titleInput.addEventListener('input', triggerAnalysis);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initDarkModeSync();
    prefillStudentName();
    setupImageUpload();
    setupAnonymousToggle();
    setupTextAnalysis();
    const reportForm = document.getElementById('reportForm');
    if (reportForm) reportForm.addEventListener('submit', handleFormSubmit);
    console.log('✅ Report page loaded. AI will load when you upload an image. LLM will analyze text as you type.');
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
        body.dark-mode .ai-indicator.processing { background: #1E3A5F; }
        body.dark-mode .ai-indicator.success { background: #085041; }
        body.dark-mode .ai-indicator.error { background: #7F1D1D; }
        body.dark-mode .ai-dismiss-btn { background: #4B5563; color: #D1D5DB; }
        
        .llm-popup { position: absolute; top: 0; right: -320px; width: 300px; background: var(--surface); border-radius: 16px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 0 0 1px var(--border); animation: slideInRight 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1); z-index: 100; overflow: hidden; }
        .llm-popup-header { padding: 10px 14px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .llm-popup-header h4 { font-size: 11px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
        .llm-close-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--muted); font-size: 14px; transition: all 0.2s; }
        .llm-close-btn:hover { background: var(--border); color: var(--text); }
        .llm-popup-content { padding: 12px 14px; }
        .llm-severity-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; margin-bottom: 10px; }
        .llm-severity-critical { background: #FEF2F2; color: #DC2626; }
        .llm-severity-high { background: #FEF2F2; color: #DC2626; }
        .llm-severity-medium { background: #FFFBEB; color: #D97706; }
        .llm-severity-low { background: #E1F5EE; color: #1D9E75; }
        .dark-mode .llm-severity-critical { background: #7F1D1D; color: #FCA5A5; }
        .llm-risk-factors { background: var(--surface2); border-radius: 10px; padding: 8px 10px; margin: 10px 0; font-size: 10px; }
        .llm-risk-factors strong { display: block; margin-bottom: 5px; font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .llm-risk-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .llm-risk-tag { background: var(--border); color: var(--text); padding: 2px 7px; border-radius: 12px; font-size: 9px; font-weight: 500; }
        .llm-suggestion { font-size: 10px; color: var(--teal); background: var(--teal-light); padding: 8px 10px; border-radius: 10px; margin: 10px 0; line-height: 1.4; }
        .llm-popup-actions { display: flex; gap: 8px; margin-top: 10px; }
        .llm-accept-btn { flex: 1; background: var(--teal); color: white; border: none; padding: 6px 10px; border-radius: 24px; font-size: 10px; font-weight: 500; cursor: pointer; }
        .llm-dismiss-btn { flex: 1; background: var(--border); color: var(--muted); border: none; padding: 6px 10px; border-radius: 24px; font-size: 10px; font-weight: 500; cursor: pointer; }
        .llm-compact { margin-top: 12px; padding: 10px 12px; background: var(--surface2); border-radius: 12px; border-left: 3px solid var(--teal); animation: fadeInUp 0.25s ease; }
        .llm-compact-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .llm-compact-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 12px; }
        .llm-compact-text { font-size: 10px; color: var(--muted); flex: 1; }
        .llm-compact-actions { display: flex; gap: 6px; }
        .llm-compact-btn { padding: 3px 8px; border-radius: 16px; font-size: 9px; font-weight: 500; cursor: pointer; border: none; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) { .llm-popup { position: static; transform: none; width: 100%; margin-top: 12px; } }
    `;
    document.head.appendChild(style);
}