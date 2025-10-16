// Nillion Vault Extension Popup - Enhanced Version 2.0
let did = null;
let data = [];
let nillionSDK = null; // Real Nillion SDK instance
let currentTab = 'dashboard';
let activityLogs = [];
let userIdentities = [];
let permissions = [];
let settings = {};
let isLocked = false;

// Utility Functions
function addLog(message, type = 'info') {
    const log = document.getElementById('log');
    if (log) {
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `[${timestamp}] ${message}\n`;
    log.scrollTop = log.scrollHeight;
}

    // Also add to activity logs for new UI
    addActivityLog(type, message);
}

function addActivityLog(type, message) {
    const activityItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: type,
        message: message
    };
    activityLogs.unshift(activityItem);

    // Keep only last 100 entries
    if (activityLogs.length > 100) {
        activityLogs = activityLogs.slice(0, 100);
    }

    // Save to storage
    chrome.storage.local.set({ activityLogs: activityLogs });

    updateActivityDisplay();

    // Log to background script for persistent storage
    chrome.runtime.sendMessage({
        type: 'LOG_ACTIVITY',
        data: {
            type: type,
            action: 'activity',
            details: message,
            url: window.location.href
        }
    });
}

function setStatus(message, type = 'warning') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerHTML = `<strong>Status:</strong> ${message}`;
        statusElement.className = 'status ' + type;
    }

    // Update connection status badge
    const statusBadge = document.getElementById('connectionStatus');
    const statusDot = statusBadge?.querySelector('.status-dot');
    const statusText = statusBadge?.querySelector('.status-text');

    if (statusBadge && statusDot && statusText) {
        if (type === 'success') {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected';
        } else if (type === 'error') {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Error';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = message;
        }
    }
}

function updateStats() {
    // Update statistics cards
    const identityCount = did && did.id ? 1 : 0;
    document.getElementById('identityCount').textContent = identityCount;
    document.getElementById('documentCount').textContent = data.length;
    document.getElementById('permissionCount').textContent = permissions.length;
}

function updateActivityDisplay() {
    const activityList = document.getElementById('activityList');
    
    if (!activityList) return;
    
    // Show the most recent 5 activities
    const displayLogs = activityLogs.slice(-5);
    
    if (displayLogs.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">✨</div>
                <div class="activity-content">
                    <div class="activity-time">Just now</div>
                    <div class="activity-desc">Welcome to Nillion Vault!</div>
                </div>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = displayLogs.map(log => {
        // Handle undefined or missing properties
        const logType = log.type || 'info';
        const logMessage = log.message || 'Unknown activity';
        const logTimestamp = log.timestamp || new Date().toISOString();
        
        return `
            <div class="activity-item">
                <div class="activity-icon">${getActivityIcon(logType)}</div>
                <div class="activity-content">
                    <div class="activity-time">${new Date(logTimestamp).toLocaleTimeString()}</div>
                    <div class="activity-desc">${logMessage}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getActivityIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'info': 'ℹ️',
        'warning': '⚠️',
        'identity': '🆔',
        'document': '📄',
        'permission': '🔐',
        'security': '🛡️',
        'default': '📝'
    };
    return icons[type] || icons.default;
}

// Tab Management
function switchTab(tabName) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    // Add active class to selected tab and pane
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    currentTab = tabName;

    // Load tab-specific content
    loadTabContent(tabName);
}

function loadTabContent(tabName) {
    switch (tabName) {
        case 'dashboard':
            updateStats();
            updateActivityDisplay();
            break;
        case 'identity':
            loadIdentities();
            updateKeypairInfo();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'security':
            loadSecuritySettings();
            loadPermissions();
            loadPolicies();
            break;
    }
}

// Identity Management
function loadIdentities() {
    const identityList = document.getElementById('identityList');
    if (!identityList) return;

    if (userIdentities.length === 0) {
        identityList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👤</span>
                <p>No identities created yet</p>
                <button class="button" id="createIdentityBtn">Create First Identity</button>
            </div>
        `;

        // Add event listener for create button
        setTimeout(() => {
            const createBtn = document.getElementById('createIdentityBtn');
            if (createBtn) {
                createBtn.addEventListener('click', createIdentity);
            }
        }, 100);
                return;
    }

    identityList.innerHTML = userIdentities.map(identity => `
        <div class="identity-item">
                <div>
                <div class="identity-name">${identity.name}</div>
                <div class="identity-did">${identity.id}</div>
                </div>
            <div class="identity-actions">
                <button class="button small" onclick="activateIdentity('${identity.id}')">Activate</button>
                <button class="button small danger" onclick="deleteIdentity('${identity.id}')">Delete</button>
            </div>
        </div>
    `).join('');

    // Update keypair info
    updateKeypairInfo();
}

function updateKeypairInfo() {
    const currentDIDElement = document.getElementById('currentDID');
    const keypairStatusElement = document.getElementById('keypairStatus');
    const publicKeyElement = document.getElementById('publicKey');

    console.log('updateKeypairInfo called, did object:', did);

    if (currentDIDElement && keypairStatusElement && publicKeyElement) {
        // Check if user has a DID stored or in memory
        if (did && did.id) {
            // Use DID from memory
            console.log('Using DID from memory:', did.id);
            currentDIDElement.textContent = did.id;
            keypairStatusElement.textContent = 'Active';
            keypairStatusElement.style.color = '#10b981';
            publicKeyElement.textContent = did.publicKey || 'Available';
              } else {
            // Check storage as fallback
            console.log('Checking storage for DID...');
            chrome.storage.local.get(['user_did'], (result) => {
                console.log('Storage result:', result);
                if (result.user_did && result.user_did.id) {
                    console.log('Using DID from storage:', result.user_did.id);
                    currentDIDElement.textContent = result.user_did.id;
                    keypairStatusElement.textContent = 'Active';
                    keypairStatusElement.style.color = '#10b981';
                    publicKeyElement.textContent = result.user_did.publicKey || 'Available';
                } else {
                    console.log('No DID found, showing not generated');
                    currentDIDElement.textContent = 'Not generated';
                    keypairStatusElement.textContent = 'Not initialized';
                    keypairStatusElement.style.color = '#6b7280';
                    publicKeyElement.textContent = 'Not available';
                }
            });
          }
        } else {
        console.log('Required elements not found:', {
            currentDIDElement: !!currentDIDElement,
            keypairStatusElement: !!keypairStatusElement,
            publicKeyElement: !!publicKeyElement
        });
    }
}

async function createIdentity() {
    const identityName = prompt('Enter identity name:');
    if (!identityName) return;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'CREATE_IDENTITY',
            name: identityName
        });

        if (response.success) {
            userIdentities.push(response.identity);
            addLog(`✅ Identity created: ${identityName}`, 'success');
            loadIdentities();
    } else {
            addLog(`❌ Failed to create identity: ${response.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ Error creating identity: ${error.message}`, 'error');
    }
}

async function importIdentity() {
    const importData = prompt('Enter identity data (JSON format):');
    if (!importData) return;

    try {
        const identityData = JSON.parse(importData);
        
        if (!identityData.name || !identityData.id) {
            throw new Error('Invalid identity data format');
        }

        const response = await chrome.runtime.sendMessage({
            type: 'CREATE_IDENTITY',
            name: identityData.name,
            data: identityData
        });

        if (response.success) {
            userIdentities.push(response.identity);
            addLog(`📥 Identity imported: ${identityData.name}`, 'success');
            loadIdentities();
        } else {
            addLog(`❌ Failed to import identity: ${response.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ Error importing identity: ${error.message}`, 'error');
    }
}

function activateIdentity(identityId) {
    const identity = userIdentities.find(id => id.id === identityId);
    if (identity) {
        // Set as active identity
        userIdentities.forEach(id => id.active = false);
        identity.active = true;
        did = identity;
        addLog(`✅ Identity activated: ${identity.name}`, 'success');
        updateKeypairInfo();
    }
}

function deleteIdentity(identityId) {
    if (confirm('Are you sure you want to delete this identity?')) {
        userIdentities = userIdentities.filter(id => id.id !== identityId);
        addLog(`🗑️ Identity deleted: ${identityId}`, 'warning');
        loadIdentities();
    }
}

// Document Management
function loadDocuments() {
    const documentList = document.getElementById('documentList');
    const loadingState = document.getElementById('documentsLoading');
    const emptyState = document.getElementById('documentsEmpty');

    if (!documentList) return;

    // Show loading state
    if (loadingState) loadingState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    // Simulate loading time for better UX
    setTimeout(() => {
        if (data.length === 0) {
            if (loadingState) loadingState.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

    documentList.innerHTML = data.map(doc => `
        <div class="document-item" data-doc-id="${doc.id}" style="cursor: pointer;">
            <div class="document-icon">${getFileIcon(doc.type)}</div>
            <div class="document-info">
                <div class="document-name">${doc.name}</div>
                <div class="document-meta">
                    <span class="document-type">${doc.type}</span>
                    <span class="document-size">${formatFileSize(doc.size || 0)}</span>
                    <span class="document-date">${new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
                ${doc.description ? `<div class="document-description">${doc.description}</div>` : ''}
                </div>
            <div class="document-actions">
                <button class="button-icon view-btn" data-doc-id="${doc.id}" title="View">
                    <span>👁️</span>
                </button>
                <button class="button-icon delete-btn" data-doc-id="${doc.id}" title="Delete">
                    <span>🗑️</span>
                </button>
                </div>
            </div>
    `).join('');
    
    // Add event listeners for document actions
    documentList.querySelectorAll('.document-item').forEach(item => {
        item.addEventListener('click', (e) => {
            console.log('Document item clicked');
            if (!e.target.closest('.document-actions')) {
                const docId = parseInt(item.dataset.docId);
                console.log('Document item docId:', docId);
                viewDocument(docId);
            }
        });
    });
    
    documentList.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('View button clicked');
            e.stopPropagation();
            const docId = parseInt(btn.dataset.docId);
            console.log('View button docId:', docId);
            viewDocument(docId);
        });
    });
    
        documentList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const docId = parseInt(btn.dataset.docId);
                deleteDocument(docId);
            });
        });
    }, 300);
}

function getFileIcon(type) {
    switch(type) {
        case 'text': return '📝';
        case 'image': return '🖼️';
        case 'video': return '🎬';
        case 'audio': return '🎵';
        case 'pdf': return '📄';
        case 'archive': return '🗜️';
        case 'document': return '📄';
        case 'file': return '📎';
        case 'general': return '📎';
        case 'note': return '📝';
        case 'credential': return '🔑';
        default: return '📄';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileTypeFromName(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    const typeMap = {
        // Documents
        'pdf': 'PDF',
        'doc': 'DOC',
        'docx': 'DOCX',
        'txt': 'TXT',
        'rtf': 'RTF',
        'odt': 'ODT',
        
        // Spreadsheets
        'xls': 'XLS',
        'xlsx': 'XLSX',
        'csv': 'CSV',
        'ods': 'ODS',
        
        // Presentations
        'ppt': 'PPT',
        'pptx': 'PPTX',
        'odp': 'ODP',
        
        // Images
        'jpg': 'JPG',
        'jpeg': 'JPEG',
        'png': 'PNG',
        'gif': 'GIF',
        'bmp': 'BMP',
        'svg': 'SVG',
        'webp': 'WEBP',
        'tiff': 'TIFF',
        
        // Audio
        'mp3': 'MP3',
        'wav': 'WAV',
        'ogg': 'OGG',
        'flac': 'FLAC',
        'aac': 'AAC',
        'm4a': 'M4A',
        
        // Video
        'mp4': 'MP4',
        'avi': 'AVI',
        'mov': 'MOV',
        'wmv': 'WMV',
        'flv': 'FLV',
        'webm': 'WEBM',
        'mkv': 'MKV',
        
        // Archives
        'zip': 'ZIP',
        'rar': 'RAR',
        '7z': '7Z',
        'tar': 'TAR',
        'gz': 'GZ',
        'bz2': 'BZ2',
        
        // Code
        'js': 'JS',
        'html': 'HTML',
        'css': 'CSS',
        'php': 'PHP',
        'py': 'PY',
        'java': 'JAVA',
        'cpp': 'CPP',
        'c': 'C',
        'json': 'JSON',
        'xml': 'XML',
        
        // Other
        'exe': 'EXE',
        'msi': 'MSI',
        'dmg': 'DMG',
        'iso': 'ISO',
        'bin': 'BIN'
    };
    
    return typeMap[extension] || extension.toUpperCase();
}

async function createDocument() {
    // Show the document creation modal
    document.getElementById('documentModal').style.display = 'flex';

    // Reset form and show universal upload area by default
    document.getElementById('documentForm').reset();
    document.getElementById('docType').value = '';
    toggleContentFields();

    // Clear any existing file previews
    const universalFilePreview = document.getElementById('universalFilePreview');
    if (universalFilePreview) universalFilePreview.style.display = 'none';
    
    // Setup drag and drop functionality
    setTimeout(() => {
        setupDragAndDrop();
    }, 100);
    
    // Focus on the document name input
    setTimeout(() => {
        document.getElementById('docName').focus();
    }, 200);
}

async function quickUpload() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.accept = '*/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Auto-fill the form with file information
            document.getElementById('docName').value = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            document.getElementById('docDescription').value = `Uploaded file: ${file.name}`;
            
            // Determine file type and set appropriate option
            const extension = file.name.split('.').pop().toLowerCase();
            let docType = 'general';
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
                docType = 'image';
            } else if (extension === 'pdf') {
                docType = 'pdf';
            } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
                docType = 'audio';
            } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
                docType = 'video';
            } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
                docType = 'archive';
            }
            
            document.getElementById('docType').value = docType;
            
            // Set the file in the appropriate input field
            let targetInputId = '';
            if (['image', 'pdf', 'audio', 'video', 'archive'].includes(docType)) {
                targetInputId = 'doc' + docType.charAt(0).toUpperCase() + docType.slice(1);
            } else {
                targetInputId = 'docGeneralFile';
            }
            
            const targetInput = document.getElementById(targetInputId);
            if (targetInput) {
                // Create a new FileList-like object and set it to the input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                targetInput.files = dataTransfer.files;
            }
            
            // Show upload fields for the selected type
            toggleContentFields();
            
            // Show a simple file info instead of upload preview
            const contentFields = document.getElementById('contentFields');
            if (contentFields) {
                contentFields.style.display = 'block';
                contentFields.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Selected File</label>
                        <div class="file-info-display">
                            <div class="file-info-item">
                                <div class="file-info-icon">${getFileIcon(docType)}</div>
                                <div class="file-info-details">
                                    <div class="file-info-name">${file.name}</div>
                                    <div class="file-info-meta">${formatFileSize(file.size)} • ${docType.toUpperCase()}</div>
                                </div>
                            </div>
                </div>
            </div>
        `;
            }
            
            addActivityLog('info', `📤 File selected: ${file.name}`);
        } catch (error) {
            addActivityLog('error', `❌ Error processing file: ${error.message}`);
        }
    };
    
    input.click();
}

async function uploadDocument() {
    // This function is kept for backward compatibility but now redirects to quickUpload
    quickUpload();
}

function handleUniversalFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        // Auto-fill the form with file information
        document.getElementById('docName').value = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        document.getElementById('docDescription').value = `Uploaded file: ${file.name}`;

        // Determine file type and set appropriate option
        const extension = file.name.split('.').pop().toLowerCase();
        let docType = 'general';

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
            docType = 'image';
        } else if (extension === 'pdf') {
            docType = 'pdf';
        } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
            docType = 'audio';
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
            docType = 'video';
        } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
            docType = 'archive';
        } else if (['txt', 'md', 'rtf'].includes(extension)) {
            docType = 'text';
        }

        document.getElementById('docType').value = docType;

        // Set the file in the appropriate input field
        let targetInputId = '';
        if (['image', 'pdf', 'audio', 'video', 'archive'].includes(docType)) {
            targetInputId = 'doc' + docType.charAt(0).toUpperCase() + docType.slice(1);
        } else {
            targetInputId = 'docGeneralFile';
        }

        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
            // Create a new FileList-like object and set it to the input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            targetInput.files = dataTransfer.files;
        }

        // Show upload fields for the selected type
        toggleContentFields();

        // Show file preview
        showUniversalFilePreview(file, docType);

        addActivityLog('info', `📁 File selected: ${file.name}`);

    } catch (error) {
        addActivityLog('error', `❌ Error processing file: ${error.message}`);
    }
}

function showUniversalFilePreview(file, docType) {
    const preview = document.getElementById('universalFilePreview');
    if (!preview) return;
    
    preview.style.display = 'block';
    preview.innerHTML = `
        <div class="file-preview-item">
            <div class="file-preview-icon">${getFileIcon(docType)}</div>
            <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${formatFileSize(file.size)} • ${docType.toUpperCase()}</div>
            </div>
            <button class="file-preview-remove" onclick="removeUniversalFile()" title="Remove file">
                <span>×</span>
            </button>
        </div>
    `;
}

function removeUniversalFile() {
    const input = document.getElementById('universalFileInput');
    const preview = document.getElementById('universalFilePreview');

    if (input) input.value = '';
    if (preview) preview.style.display = 'none';

    // Clear the specific type input as well
    const docType = document.getElementById('docType').value;
    if (docType) {
        let targetInputId = '';
        if (['image', 'pdf', 'audio', 'video', 'archive'].includes(docType)) {
            targetInputId = 'doc' + docType.charAt(0).toUpperCase() + docType.slice(1);
        } else {
            targetInputId = 'docGeneralFile';
        }

        const targetInput = document.getElementById(targetInputId);
        if (targetInput) targetInput.value = '';
    }

    addActivityLog('info', '🗑️ File removed');
}

function copyToClipboard(text, message = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(message, 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy to clipboard', 'error');
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

function setupRealTimeLoading() {
    // Refresh documents every 30 seconds
    setInterval(() => {
        if (document.querySelector('.tab-button[data-tab="documents"]') &&
            document.querySelector('.tab-button[data-tab="documents"]').classList.contains('active')) {
            console.log('🔄 Auto-refreshing documents...');
            loadDocuments();
        }
    }, 30000);

    // Listen for tab switches to refresh data
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName === 'documents') {
                setTimeout(() => loadDocuments(), 100);
            }
        });
    });

    // Listen for storage changes (from background script)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && (changes.documents || changes.nillion_data)) {
            console.log('🔄 Storage changed, refreshing documents...');
            if (document.querySelector('.tab-button[data-tab="documents"]') &&
                document.querySelector('.tab-button[data-tab="documents"]').classList.contains('active')) {
                loadDocuments();
            }
        }
    });
}



function closeDocumentModal() {
    document.getElementById('documentModal').style.display = 'none';
    document.getElementById('documentForm').reset();
    document.getElementById('contentFields').style.display = 'none';
    
    // Hide all content groups
    const allGroups = [
        'textContentGroup',
        'imageUploadGroup', 
        'pdfUploadGroup',
        'audioUploadGroup',
        'videoUploadGroup',
        'archiveUploadGroup',
        'generalFileUploadGroup'
    ];
    
    allGroups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) group.style.display = 'none';
    });
    
    // Clear all previews
    const previews = ['imagePreview', 'pdfPreview', 'audioPreview', 'videoPreview', 'archivePreview', 'generalPreview', 'universalFilePreview'];
    previews.forEach(previewId => {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
    });
}

function handleFileSelect(input, type) {
    const file = input.files[0];
    if (!file) return;
    
    const previewId = type + 'Preview';
    const preview = document.getElementById(previewId);
    
    if (preview) {
        preview.style.display = 'block';
        
        if (type === 'image') {
            // Show image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `
                    <div class="file-preview-item">
                        <div class="file-preview-icon">🖼️</div>
                        <div class="file-preview-info">
                            <div class="file-preview-name">${file.name}</div>
                            <div class="file-preview-size">${formatFileSize(file.size)}</div>
            </div>
                        <button class="file-preview-remove" onclick="removeFile('${type}')">✕</button>
                </div>
                    <img src="${e.target.result}" class="image-preview" alt="Preview">
                `;
            };
            reader.readAsDataURL(file);
        } else {
            // Show file info preview
            const icon = getFileIcon(type);
            const fileType = type === 'general' ? getFileTypeFromName(file.name) : type;
            preview.innerHTML = `
                <div class="file-preview-item">
                    <div class="file-preview-icon">${icon}</div>
                    <div class="file-preview-info">
                        <div class="file-preview-name">${file.name}</div>
                        <div class="file-preview-size">${formatFileSize(file.size)} • ${fileType.toUpperCase()}</div>
                    </div>
                    <button class="file-preview-remove" onclick="removeFile('${type}')">✕</button>
                </div>
            `;
        }
    }
}

function removeFile(type) {
    let inputId;
    if (type === 'general') {
        inputId = 'docGeneralFile';
    } else {
        inputId = 'doc' + type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    const input = document.getElementById(inputId);
    const preview = document.getElementById(type + 'Preview');
    
    if (input) input.value = '';
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

// Add drag and drop functionality
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.file-upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
        e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
        e.preventDefault();
            area.classList.remove('dragover');
            
        const files = e.dataTransfer.files;
        if (files.length > 0) {
                const file = files[0];
                const input = area.querySelector('input[type="file"]');
                if (input) {
                    // Create a new FileList with the dropped file
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    
                    // Trigger the change event
                    const event = new Event('change', { bubbles: true });
                    input.dispatchEvent(event);
                }
            }
          });
    });
}

function toggleContentFields() {
    const docType = document.getElementById('docType').value;
    const contentFields = document.getElementById('contentFields');
    const universalUploadArea = document.getElementById('universalUploadArea');
    const universalFilePreview = document.getElementById('universalFilePreview');

    // Hide all content groups first
    const allGroups = [
        'textContentGroup',
        'imageUploadGroup',
        'pdfUploadGroup',
        'audioUploadGroup',
        'videoUploadGroup',
        'archiveUploadGroup',
        'generalFileUploadGroup'
    ];

    allGroups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) group.style.display = 'none';
    });

    // Handle universal upload area and content fields visibility
    if (!docType) {
        // No document type selected - show universal upload area
        if (universalUploadArea) universalUploadArea.style.display = 'block';
        if (contentFields) contentFields.style.display = 'none';
        if (universalFilePreview) universalFilePreview.style.display = 'none';
    } else {
        // Document type selected - hide universal upload area and show appropriate content fields
        if (universalUploadArea) universalUploadArea.style.display = 'none';

        if (docType === 'text' || docType === 'note' || docType === 'credential') {
            if (contentFields) contentFields.style.display = 'block';
            document.getElementById('textContentGroup').style.display = 'block';
        } else if (['image', 'pdf', 'audio', 'video', 'archive'].includes(docType)) {
            if (contentFields) contentFields.style.display = 'block';
            document.getElementById(docType + 'UploadGroup').style.display = 'block';
        } else if (docType === 'general') {
            if (contentFields) contentFields.style.display = 'block';
            document.getElementById('generalFileUploadGroup').style.display = 'block';
        } else {
            if (contentFields) contentFields.style.display = 'none';
        }

        // Clear universal upload preview when switching to specific type
        if (universalFilePreview) universalFilePreview.style.display = 'none';
    }
}

async function handleDocumentSubmit(e) {
    e.preventDefault();
    
    const docName = document.getElementById('docName').value;
    const docType = document.getElementById('docType').value;
    const docContent = document.getElementById('docContent').value;
    const docDescription = document.getElementById('docDescription').value;
    
    if (!docName || !docType) {
        addActivityLog('error', '❌ Please fill in all required fields');
            return;
    }
    
    try {
        let content = '';
        let size = 0;
        let file = null;
        
        // Get file based on document type
        if (['image', 'pdf', 'audio', 'video', 'archive'].includes(docType)) {
            const inputId = 'doc' + docType.charAt(0).toUpperCase() + docType.slice(1);
            const fileInput = document.getElementById(inputId);
            file = fileInput ? fileInput.files[0] : null;
            
            if (!file) {
                addActivityLog('error', '❌ Please select a file to upload');
                return;
            }
            
            content = `File: ${file.name}`;
            size = file.size;
        } else if (docType === 'general') {
            const fileInput = document.getElementById('docGeneralFile');
            file = fileInput ? fileInput.files[0] : null;
            
            if (!file) {
                addActivityLog('error', '❌ Please select a file to upload');
                return;
            }
            
            content = `File: ${file.name}`;
            size = file.size;
        } else if (docContent) {
            content = docContent;
            size = docContent.length;
        }
        
        const newDoc = {
            id: Date.now(),
            name: docName,
            content: content,
            type: docType,
            description: docDescription,
            size: size,
            fileInfo: file ? {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
            } : null,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        data.push(newDoc);
        
        // Save documents to storage
        await chrome.storage.local.set({
          documents: data,
          nillion_data: data // Also save to nillion_data for compatibility
        });
        
        // Store in Nillion network
        if (nillionSDK) {
            await nillionSDK.createData(docName, content);
        }

        addActivityLog('success', `📄 Created document: ${docName}`);
        loadDocuments();
        updateStats();
        closeDocumentModal();
    } catch (error) {
        addActivityLog('error', `❌ Error creating document: ${error.message}`);
    }
}

function viewDocument(docId) {
    console.log('viewDocument called with ID:', docId);
    console.log('Available documents:', data);
    const doc = data.find(d => d.id === docId);
    console.log('Found document:', doc);
    if (doc) {
        showDocumentDetails(doc);
    } else {
        console.error('Document not found with ID:', docId);
        addActivityLog('error', '❌ Document not found');
    }
}

function showDocumentDetails(doc) {
    console.log('showDocumentDetails called with:', doc);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    console.log('Modal created:', modal);

    // Format document content for better display
    const formatContent = (content, type) => {
        if (!content) return 'No content available';

        if (type === 'credential' || type === 'note') {
            return `<pre class="formatted-content">${content}</pre>`;
        }

        // For text content, try to format it nicely
        if (typeof content === 'string' && content.length > 100) {
            return `<div class="long-content">${content}</div>`;
        }

        return content;
    };

    modal.innerHTML = `
        <div class="modal-overlay" id="viewModalOverlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">
                    <div class="modal-icon">${getFileIcon(doc.type)}</div>
                    <h3>${doc.name}</h3>
                </div>
                <div class="modal-header-actions">
                    <button class="button-icon" id="copyDocIdBtn" title="Copy Document ID" data-doc-id="${doc.id}">
                        <span>📋</span>
                    </button>
                    <button class="button-icon" id="viewRawBtn" title="View Raw JSON">
                        <span>🔍</span>
                    </button>
                    <button class="modal-close" id="viewModalClose">&times;</button>
                </div>
            </div>
            <div class="document-details">
                <div class="detail-item">
                    <label>Document ID:</label>
                    <div class="id-display">
                        <code class="doc-id">${doc.id}</code>
                        <button class="copy-btn" onclick="copyToClipboard('${doc.id}', 'Document ID copied!')">📋</button>
                    </div>
                </div>
                <div class="detail-item">
                    <label>Type:</label>
                    <span>${doc.type}</span>
                </div>
                <div class="detail-item">
                    <label>Size:</label>
                    <span>${formatFileSize(doc.size || 0)}</span>
                </div>
                <div class="detail-item">
                    <label>Created:</label>
                    <span>${new Date(doc.createdAt).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label>Modified:</label>
                    <span>${new Date(doc.modifiedAt).toLocaleString()}</span>
                </div>
                ${doc.description ? `
                <div class="detail-item">
                    <label>Description:</label>
                    <span>${doc.description}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                    <label>Content:</label>
                    <div class="content-preview">${formatContent(doc.content, doc.type)}</div>
                </div>
                <div class="detail-item" id="rawContent" style="display: none;">
                    <label>Raw JSON:</label>
                    <div class="raw-content">
                        <pre>${JSON.stringify(doc, null, 2)}</pre>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal appended to body');
    
    // Add event listeners for closing the modal
    const overlay = modal.querySelector('#viewModalOverlay');
    const closeBtn = modal.querySelector('#viewModalClose');
    const copyBtn = modal.querySelector('#copyDocIdBtn');
    const viewRawBtn = modal.querySelector('#viewRawBtn');

    const closeModal = () => {
        console.log('Closing modal');
        modal.remove();
    };

    console.log('Adding event listeners to overlay and close button');
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // Add copy functionality
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const docId = copyBtn.getAttribute('data-doc-id');
            copyToClipboard(docId, 'Document ID copied to clipboard!');
        });
    }

    // Add raw view toggle
    if (viewRawBtn) {
        viewRawBtn.addEventListener('click', () => {
            const rawContent = modal.querySelector('#rawContent');
            const contentPreview = modal.querySelector('.content-preview');

            if (rawContent.style.display === 'none') {
                rawContent.style.display = 'block';
                contentPreview.style.display = 'none';
                viewRawBtn.title = 'View Formatted';
                viewRawBtn.innerHTML = '<span>📋</span>';
            } else {
                rawContent.style.display = 'none';
                contentPreview.style.display = 'block';
                viewRawBtn.title = 'View Raw JSON';
                viewRawBtn.innerHTML = '<span>🔍</span>';
            }
        });
    }
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

async function deleteDocument(docId) {
    if (confirm('Are you sure you want to delete this document?')) {
        data = data.filter(d => d.id !== docId);
        
        // Save updated documents to storage
        await chrome.storage.local.set({
          documents: data,
          nillion_data: data // Also save to nillion_data for compatibility
        });
        
        addActivityLog('warning', `🗑️ Document deleted: ${docId}`);
        loadDocuments();
        updateStats();
    }
}

async function createSampleData() {
    if (confirm('Create sample data for testing auto-fill functionality? This will add 5 sample documents.')) {
        try {
            const sampleData = [
                {
                    id: Date.now() - 1000,
                    name: 'Personal Information',
                    content: 'John Doe',
                    type: 'text',
                    description: 'Full name for forms',
                    size: 8,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                },
                {
                    id: Date.now() - 2000,
                    name: 'Email Contact',
                    content: 'john.doe@example.com',
                    type: 'text',
                    description: 'Email address',
                    size: 20,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                },
                {
                    id: Date.now() - 3000,
                    name: 'Phone Number',
                    content: '+1-555-123-4567',
                    type: 'text',
                    description: 'Contact phone number',
                    size: 15,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                },
                {
                    id: Date.now() - 4000,
                    name: 'Home Address',
                    content: '123 Main Street, City, State 12345',
                    type: 'text',
                    description: 'Residential address',
                    size: 35,
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                },
                {
                    id: Date.now() - 5000,
                    name: 'Resume Document',
                    content: 'File: John_Doe_Resume.pdf',
                    type: 'pdf',
                    description: 'Professional resume document',
                    size: 1024000,
                    fileInfo: {
                        name: 'John_Doe_Resume.pdf',
                        type: 'application/pdf',
                        size: 1024000,
                        lastModified: Date.now()
                    },
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString()
                }
            ];
            
            // Add sample data to existing data
            data = [...data, ...sampleData];
            
            // Save to storage
            await chrome.storage.local.set({
                documents: data,
                nillion_data: data
            });
            
            addActivityLog('success', '🧪 Sample data created for testing');
            loadDocuments();
            updateStats();
            
            // Show success message
            showNotification('Sample data created! You can now test auto-fill functionality on websites with forms.', 'success');
            
        } catch (error) {
            addActivityLog('error', `❌ Error creating sample data: ${error.message}`);
            showNotification('Failed to create sample data', 'error');
        }
    }
}


// Permission Management
function loadPermissions() {
    const permissionList = document.getElementById('permissionList');
    const permissionItems = document.getElementById('permissionItems');
    const permissionsEmpty = document.getElementById('permissionsEmpty');
    
    if (!permissionList) return;

    console.log('Loading permissions:', permissions);

    if (permissions.length === 0) {
        if (permissionsEmpty) permissionsEmpty.style.display = 'block';
        if (permissionItems) permissionItems.style.display = 'none';
        return;
    }

    if (permissionsEmpty) permissionsEmpty.style.display = 'none';
    if (permissionItems) {
        permissionItems.style.display = 'block';
        permissionItems.innerHTML = permissions.map(permission => {
            // Handle undefined or missing properties
            const siteName = permission.siteName || permission.domain || 'Unknown Site';
            const permissionTypes = permission.permissions ? permission.permissions.join(', ') : 'Auto-fill Access';
            const grantedDate = permission.grantedAt ? new Date(permission.grantedAt).toLocaleDateString() : 'Unknown Date';
            
            return `
                <div class="permission-item">
                    <div class="permission-info">
                        <div class="permission-icon">🌐</div>
                        <div class="permission-details">
                            <div class="permission-domain">${siteName}</div>
                            <div class="permission-type">${permissionTypes}</div>
                            <div class="permission-date">Granted: ${grantedDate}</div>
                        </div>
                    </div>
                    <div class="permission-actions">
                        <span class="permission-status">Active</span>
                        <button class="button-icon" onclick="revokePermission('${permission.id}')" title="Revoke Permission">
                            <span>🚫</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

async function grantPermission() {
    try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tabs[0]) {
            addLog('❌ No active tab found', 'error');
            return;
        }

        const currentTabInfo = tabs[0];
        const domain = new URL(currentTabInfo.url).hostname;

        const permissionsList = ['read', 'write', 'execute'];
        const selectedPermissions = [];

        // Simple permission selection (could be enhanced with checkboxes)
        if (confirm(`Grant read permission to ${domain}?`)) selectedPermissions.push('read');
        if (confirm(`Grant write permission to ${domain}?`)) selectedPermissions.push('write');
        if (confirm(`Grant execute permission to ${domain}?`)) selectedPermissions.push('execute');

        if (selectedPermissions.length === 0) return;

        const response = await chrome.runtime.sendMessage({
            type: 'GRANT_PERMISSION',
            payload: {
                appId: 'app-' + Date.now(),
                siteName: getSiteName(domain),
                domain: domain,
                permissions: selectedPermissions,
                description: `Permission granted via extension popup`
            }
        });

        if (response.success) {
            permissions.push(response.permission);
            
            // Save permissions to storage
            await chrome.storage.local.set({ permissions: permissions });
            
            addLog(`✅ Permission granted to ${domain}`, 'success');
            loadPermissions();
            updateStats();
            }
        } catch (error) {
        addLog(`❌ Error granting permission: ${error.message}`, 'error');
    }
}

async function revokePermission(permissionId) {
    if (confirm('Are you sure you want to revoke this permission?')) {
        chrome.runtime.sendMessage({
            type: 'REVOKE_PERMISSION',
            permissionId: permissionId
        });

        permissions = permissions.filter(p => p.id !== permissionId);
        
        // Save updated permissions to storage
        await chrome.storage.local.set({ permissions: permissions });
        
        addLog(`🚫 Permission revoked: ${permissionId}`, 'warning');
        loadPermissions();
        updateStats();
    }
}

async function revokeAllPermissions() {
    if (confirm('Are you sure you want to revoke all permissions? This cannot be undone.')) {
        permissions.forEach(permission => {
            chrome.runtime.sendMessage({
                type: 'REVOKE_PERMISSION',
                permissionId: permission.id
        });
    });
    
        permissions = [];
        
        // Save updated permissions to storage
        await chrome.storage.local.set({ permissions: permissions });
        
        addLog('🚫 All permissions revoked', 'warning');
        loadPermissions();
        updateStats();
    }
}

// Activity Log
function loadActivityLog() {
    // Activity is now handled by the footer, so this function updates the footer
    updateActivityDisplay();
}

function exportActivityLog() {
    const logText = activityLogs.map(log =>
        `[${new Date(log.timestamp).toLocaleString()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nillion-vault-activity-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('📥 Activity log exported', 'success');
}

function clearActivityLog() {
    if (confirm('Are you sure you want to clear the activity log?')) {
        activityLogs = [];
        addLog('🗑️ Activity log cleared', 'warning');
        loadActivityLog();
    }
}

// Security Settings
function loadSecuritySettings() {
    // Load current settings into form
    document.getElementById('autoLockToggle').checked = settings.autoLock || false;
    document.getElementById('passphraseAuthToggle').checked = settings.passphraseAuth || false;
    document.getElementById('auditLoggingToggle').checked = settings.auditLogging !== false;
    document.getElementById('lockTimeoutSelect').value = settings.lockTimeout || '15';
}

function saveSecuritySettings() {
    settings = {
        autoLock: document.getElementById('autoLockToggle').checked,
        passphraseAuth: document.getElementById('passphraseAuthToggle').checked,
        auditLogging: document.getElementById('auditLoggingToggle').checked,
        lockTimeout: document.getElementById('lockTimeoutSelect').value
    };

    chrome.storage.local.set({ settings: settings });
    addLog('💾 Security settings saved', 'success');
}

async function setPassword() {
    const password = prompt('Enter new password:');
    if (!password) return;

    const confirmPassword = prompt('Confirm password:');
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        await chrome.runtime.sendMessage({
            type: 'SET_PASSWORD',
            password: password
        });

        addLog('🔐 Password set successfully', 'success');
    } catch (error) {
        addLog(`❌ Error setting password: ${error.message}`, 'error');
    }
}

async function testAuthentication() {
    try {
        const password = prompt('Enter password to test:');
        if (!password) return;

        const response = await chrome.runtime.sendMessage({
            type: 'PASSWORD_AUTH',
            password: password
        });

        if (response.success) {
            addLog('✅ Authentication successful', 'success');
        } else {
            addLog('❌ Authentication failed', 'error');
        }
    } catch (error) {
        addLog(`❌ Authentication error: ${error.message}`, 'error');
    }
}

async function createPolicy() {
    const appDomain = prompt('Enter application domain (e.g., example.com):');
    if (!appDomain) return;

    const permissionType = prompt('Enter permission type (read/write/execute):');
    if (!permissionType) return;

    const autoApprove = confirm('Auto-approve requests from this domain?');

    try {
        const policy = {
            id: Date.now(),
            domain: appDomain,
            permissionType: permissionType,
            autoApprove: autoApprove,
            createdAt: new Date().toISOString(),
            active: true
        };

        // Store policy
        chrome.storage.local.get(['permissionPolicies'], (result) => {
            const policies = result.permissionPolicies || [];
            policies.push(policy);
            chrome.storage.local.set({ permissionPolicies: policies });
        });

        addLog(`📋 Created policy for ${appDomain}`, 'success');
        loadPolicies();
        } catch (error) {
        addLog(`❌ Error creating policy: ${error.message}`, 'error');
    }
}

function loadPolicies() {
    chrome.storage.local.get(['permissionPolicies'], (result) => {
        const policies = result.permissionPolicies || [];
        const policyList = document.getElementById('policyList');
        
        if (policies.length === 0) {
            policyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h4>No policies configured</h4>
                    <p>Create automated permission rules for trusted applications</p>
                    <button class="button primary" id="createPolicyBtn">
                        <span>➕</span>
                        <span>Create Policy</span>
                    </button>
                </div>
            `;
            document.getElementById('createPolicyBtn')?.addEventListener('click', createPolicy);
            return;
        }

        policyList.innerHTML = policies.map(policy => `
            <div class="policy-item">
                <div class="policy-info">
                    <div class="policy-domain">${policy.domain}</div>
                    <div class="policy-type">${policy.permissionType}</div>
                    <div class="policy-status ${policy.autoApprove ? 'auto-approve' : 'manual'}">
                        ${policy.autoApprove ? 'Auto-approve' : 'Manual'}
                    </div>
                </div>
                <div class="policy-actions">
                    <button class="button-icon" onclick="togglePolicy(${policy.id})" title="Toggle Policy">
                        <span>${policy.active ? '⏸️' : '▶️'}</span>
                    </button>
                    <button class="button-icon" onclick="deletePolicy(${policy.id})" title="Delete Policy">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
        `).join('');
    });
}

// Modal Management
function createModal(content, actionButton = 'Close') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="button modal-close">Close</button>
            </div>
        </div>
    `;

    return modal;
}

function showModal(modal) {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);

        // Add close event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.remove();
        });
    }
}

// Authentication Functions
async function checkAuthentication() {
    try {
        const result = await chrome.storage.local.get(['vault_initialized', 'vault_password', 'is_authenticated']);
        
        if (!result.vault_initialized) {
            return { authenticated: false, initialized: false };
        }
        
        // Check if user is currently authenticated (session-based)
        if (!result.is_authenticated) {
            return { authenticated: false, initialized: true };
        }
        
        return { authenticated: true, initialized: true };
    } catch (error) {
        console.error('Error checking authentication:', error);
        return { authenticated: false, initialized: false };
    }
}

function showPasswordPrompt() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="password-prompt">
            <div class="prompt-header">
                <div class="prompt-logo">🔒</div>
                <h2>Unlock Nillion Vault</h2>
                <p>Enter your password to access your vault</p>
            </div>

            <form id="passwordForm" class="password-form">
                <div class="form-group">
                    <input type="password" class="form-input" id="passwordInput" placeholder="Enter password" required autofocus>
                </div>

                <div class="prompt-actions">
                    <button type="submit" class="button button-primary">Unlock</button>
                    <button type="button" class="button button-secondary" id="forgotPassword">Forgot Password?</button>
                </div>
            </form>

            <div class="prompt-footer">
                <p>Your data is encrypted and secure</p>
            </div>
        </div>
    `;

    // Add form event listeners
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);
    document.getElementById('forgotPassword').addEventListener('click', resetVault);
    
    // Focus on password input
    document.getElementById('passwordInput').focus();
}

function showAuthScreen() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="auth-screen">
            <div class="auth-header">
                <div class="auth-logo">🔒</div>
                <h1>Nillion Vault</h1>
                <p>Enter your password to continue</p>
            </div>

            <form id="authForm" class="auth-form">
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-input" id="authPassword" placeholder="Enter your vault password" required>
                </div>

                <button type="submit" class="button button-primary auth-button">Unlock Vault</button>
            </form>

            <div class="auth-footer">
                <p>Forgot your password? <a href="#" id="resetPassword">Reset Vault</a></p>
            </div>
        </div>
    `;

    // Add auth form event listener
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('resetPassword').addEventListener('click', resetVault);
}

async function handlePasswordSubmit(e) {
    e.preventDefault();

    const password = document.getElementById('passwordInput').value;
    if (!password) return;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'PASSWORD_AUTH',
            password: password
        });

        if (response.success) {
            // Set authentication session
            await chrome.storage.local.set({ is_authenticated: true });
            // Authentication successful, reload the main interface
            location.reload();
        } else {
            showAlert('Invalid password. Please try again.', 'error');
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showAlert('Authentication failed. Please try again.', 'error');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const password = document.getElementById('authPassword').value;
    if (!password) return;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'PASSWORD_AUTH',
            password: password
        });

        if (response.success) {
            // Authentication successful, reload the main interface
            location.reload();
        } else {
            showAlert('Invalid password. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showAlert('Authentication failed. Please try again.', 'error');
    }
}

async function resetVault() {
    if (confirm('Are you sure you want to reset your vault? This will clear all your data and settings.')) {
        try {
            await chrome.storage.local.clear();
            showAlert('Vault reset successfully. Please refresh the page to set up again.', 'success');
        } catch (error) {
            console.error('Error resetting vault:', error);
            showAlert('Failed to reset vault. Please try again.', 'error');
        }
    }
}

// Site Name Helper
function getSiteName(domain) {
    const siteNames = {
        'linkedin.com': 'LinkedIn',
        'facebook.com': 'Facebook',
        'twitter.com': 'Twitter',
        'instagram.com': 'Instagram',
        'github.com': 'GitHub',
        'google.com': 'Google',
        'amazon.com': 'Amazon',
        'netflix.com': 'Netflix',
        'youtube.com': 'YouTube'
    };
    
    for (const [key, value] of Object.entries(siteNames)) {
        if (domain.includes(key)) {
            return value;
        }
    }
    
    return domain.charAt(0).toUpperCase() + domain.slice(1);
}

// Legacy Functions (for backward compatibility)
async function checkStatus() {
    addActivityLog('info', '🔍 Checking extension status...');

    try {
        if (chrome.runtime && chrome.runtime.id) {
            addActivityLog('success', '✅ Extension runtime available');
            addActivityLog('info', '🆔 Extension ID: ' + chrome.runtime.id);

            // Check vault initialization status
            const result = await chrome.storage.local.get(['vault_initialized', 'user_did']);
            if (result.vault_initialized && result.user_did) {
                addActivityLog('success', '🔑 Vault: Initialized');
                addActivityLog('info', '🆔 User DID: ' + result.user_did.id);
                
                try {
                    if (!nillionSDK) {
                        nillionSDK = new NillionSDK();
                    }
                    const testResult = await nillionSDK.testConnection();
                    if (testResult.success) {
                        addActivityLog('success', '✅ Nillion network connection: Active');
                        addActivityLog('info', '✅ Server: ' + testResult.server);
                        addActivityLog('info', '✅ Collection: ' + testResult.collection);
                        setStatus('Connected ✅', 'success');
            } else {
                        addActivityLog('error', '⚠️ Nillion network connection: Failed - ' + testResult.error);
                        setStatus('Connection Failed ⚠️', 'warning');
        }
    } catch (error) {
                    addActivityLog('error', '⚠️ Nillion network test failed: ' + error.message);
                    setStatus('Connection Error ⚠️', 'warning');
            }
        } else {
                addActivityLog('warning', '❌ Vault: Not initialized');
                setStatus('Not Initialized ❌', 'error');
            }
        } else {
            setStatus('Error ❌', 'error');
            addActivityLog('error', '❌ Extension runtime not available');
        }
    } catch (error) {
        setStatus('Error ❌', 'error');
        addActivityLog('error', '❌ Error checking status: ' + error.message);
    }
}

async function generateDID() {
    addLog('🔄 Generating DID with Nillion...');
    try {
        if (!nillionSDK) {
            nillionSDK = new NillionSDK();
        }

        const result = await nillionSDK.initialize();
        console.log('Nillion SDK initialize result:', result);

        if (result.success) {
            did = {
                id: result.userDid,
                publicKey: result.userDid.split(':')[2] || result.userDid,
                createdAt: new Date().toISOString()
            };
            
            console.log('Generated DID object:', did);
            
            // Store DID in chrome storage
            await chrome.storage.local.set({
                user_did: did,
                vault_initialized: true
            });
            
            console.log('DID stored in chrome storage');
            
            setStatus('DID Generated ✅', 'success');
            addLog('✅ DID Generated: ' + did.id);
            addLog('💾 Connected to Nillion network');
            updateKeypairInfo();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to generate DID');
        }
    } catch (error) {
        console.error('Error in generateDID:', error);
        setStatus('DID Error ❌', 'error');
        addLog('❌ Error generating DID: ' + error.message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Nillion Vault Extension Popup Loading...');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContainer = document.getElementById('mainContainer');

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
        console.log('Fallback timeout triggered - showing main interface');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainContainer.style.display = 'flex';
        }, 300);
    }, 3000);

    // Show main interface quickly
    setTimeout(async () => {
        clearTimeout(fallbackTimeout);
        // Hide loading screen first
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainContainer.style.display = 'flex';
        }, 300);

        // Check authentication in background
        try {
            const authCheck = await checkAuthentication();
            if (!authCheck.initialized) {
                // First time user - redirect to welcome page
                chrome.tabs.create({
                    url: chrome.runtime.getURL('welcome.html')
                });
                return;
            } else if (!authCheck.authenticated) {
                // Show password prompt like MetaMask
                showPasswordPrompt();
            return;
        }
    } catch (error) {
            console.error('Auth check failed:', error);
            // Show password prompt if auth check fails
            showPasswordPrompt();
        return;
    }
    }, 800);

        // Load data from storage
        try {
            const result = await chrome.storage.local.get(['userIdentities', 'permissions', 'settings', 'activityLogs', 'user_did', 'documents']);
            userIdentities = result.userIdentities || [];
            permissions = result.permissions || [];
            settings = result.settings || {};
            activityLogs = result.activityLogs || [];
            data = result.documents || []; // Load documents from storage
            
            console.log('Loaded from storage:', {
                permissions: permissions,
                activityLogs: activityLogs,
                documents: data
            });
            
            // Note: Sample data creation removed - users should start with empty vault
            
            // Note: Sample permissions creation removed - users should start with empty permissions
            
            // Load DID if available
            if (result.user_did) {
                did = result.user_did;
            }
        } catch (error) {
            console.error('Error loading data from storage:', error);
        }

        // Set up tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });

        // Set up security settings event listeners
        document.getElementById('autoLockToggle')?.addEventListener('change', saveSecuritySettings);
        document.getElementById('passphraseAuthToggle')?.addEventListener('change', saveSecuritySettings);
        document.getElementById('auditLoggingToggle')?.addEventListener('change', saveSecuritySettings);
        document.getElementById('lockTimeoutSelect')?.addEventListener('change', saveSecuritySettings);

        // Set up button event listeners
        document.getElementById('configureApiBtn')?.addEventListener('click', function() {
                    addLog('⚙️ Opening API key configuration...');
                    chrome.tabs.create({
                        url: chrome.runtime.getURL('welcome.html')
                    });
        });

        document.getElementById('checkStatusBtn')?.addEventListener('click', checkStatus);
        document.getElementById('generateDIDBtn')?.addEventListener('click', generateDID);
        document.getElementById('createIdentityBtn')?.addEventListener('click', createIdentity);
        document.getElementById('importIdentityBtn')?.addEventListener('click', importIdentity);
        document.getElementById('generateKeypairBtn')?.addEventListener('click', generateDID);
        document.getElementById('createDocumentBtn')?.addEventListener('click', createDocument);
        document.getElementById('createDocumentBtnDashboard')?.addEventListener('click', createDocument);
        document.getElementById('refreshDocumentsBtn')?.addEventListener('click', loadDocuments);
        document.getElementById('createSampleDataBtn')?.addEventListener('click', createSampleData);
        document.getElementById('createSampleDataEmptyBtn')?.addEventListener('click', createSampleData);
        document.getElementById('documentForm')?.addEventListener('submit', handleDocumentSubmit);
        document.getElementById('modalCloseBtn')?.addEventListener('click', closeDocumentModal);
        document.getElementById('cancelBtn')?.addEventListener('click', closeDocumentModal);
        document.getElementById('quickUploadBtn')?.addEventListener('click', quickUpload);
        document.getElementById('universalUploadArea')?.addEventListener('click', () => {
            document.getElementById('universalFileInput')?.click();
        });
        document.getElementById('universalFileInput')?.addEventListener('change', (e) => handleUniversalFileSelect(e.target));
        document.getElementById('grantPermissionBtn')?.addEventListener('click', grantPermission);
        document.getElementById('revokeAllPermissionsBtn')?.addEventListener('click', revokeAllPermissions);
        document.getElementById('exportActivityBtn')?.addEventListener('click', exportActivityLog);
        document.getElementById('clearActivityBtn')?.addEventListener('click', clearActivityLog);
        document.getElementById('setPassphraseBtn')?.addEventListener('click', setPassword);
        document.getElementById('createPolicyBtn')?.addEventListener('click', createPolicy);
    
    // Initialize
        addActivityLog('success', '🚀 Nillion Vault 2.0 Loaded');
        addActivityLog('info', '🔧 Version: 2.0.0');
        addActivityLog('info', '🌐 Advanced Decentralized Identity & Data Management');
        

        // Load initial tab content
        loadTabContent('dashboard');

        // Set up real-time data loading
        setupRealTimeLoading();
        
        // Update keypair info and stats after loading data
        updateKeypairInfo();
        updateStats();

        // Auto-check status after a delay
      setTimeout(() => {
          checkStatus();
      }, 500);
    
    console.log('Nillion Vault Extension Popup Ready!');
    }, 1500);


