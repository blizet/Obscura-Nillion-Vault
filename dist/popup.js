// Nillion Vault Extension Popup - Main Logic
let did = null;
let data = [];
let nillionSDK = null; // Real Nillion SDK instance

function addLog(message) {
    const log = document.getElementById('log');
    if (!log) return;
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `[${timestamp}] ${message}\n`;
    log.scrollTop = log.scrollHeight;
}

function setStatus(message, type = 'warning') {
    const status = document.getElementById('status');
    if (!status) return;
    status.innerHTML = `<strong>Status:</strong> ${message}`;
    status.className = 'status ' + type;
}

async function checkStatus() {
    addLog('🔍 Checking extension status...');
    
    if (chrome.runtime && chrome.runtime.id) {
        addLog('✅ Extension runtime available');
        addLog('🆔 Extension ID: ' + chrome.runtime.id);
        addLog('🌐 Nillion Integration: Active');
        
        // Check API key status
        const result = await chrome.storage.local.get(['api_key_configured', 'nillion_api_key']);
        if (result.api_key_configured && result.nillion_api_key) {
            addLog('🔑 API Key: Configured');
            
          // Test connection to Nillion network via backend server
          addLog('🔗 Testing connection to Nillion network...');
          try {
              if (!nillionSDK) {
                  nillionSDK = new NillionSDK();
              }
              const testResult = await nillionSDK.testConnection();
              if (testResult.success) {
                  addLog('✅ Nillion network connection: Active');
                  addLog('✅ Server: ' + testResult.server);
                  addLog('✅ Builder: ' + testResult.builder);
                  addLog('✅ Collection: ' + testResult.collection);
                  setStatus('Extension: Active ✅', 'success');
              } else {
                  addLog('⚠️ Nillion network connection: Failed - ' + testResult.error);
                  setStatus('Extension: Network Error ⚠️', 'warning');
              }
          } catch (error) {
              addLog('⚠️ Nillion network test failed: ' + error.message);
              setStatus('Extension: Network Error ⚠️', 'warning');
          }
        } else {
            addLog('❌ API Key: Not configured');
            setStatus('Extension: Not Initialized ❌', 'error');
        }
    } else {
        setStatus('Extension: Error ❌', 'error');
        addLog('❌ Extension runtime not available');
    }
}

async function generateDID() {
    addLog('🔄 Generating DID with Nillion...');
    try {
        // Initialize Nillion SDK if not already done
        if (!nillionSDK) {
            nillionSDK = new NillionSDK();
        }
        
        const result = await nillionSDK.initialize();
        
        if (result.success) {
            did = {
                id: result.userDid,
                publicKey: result.userDid.split(':')[2] // Extract public key from DID
            };
            setStatus('DID Generated ✅', 'success');
            addLog('✅ DID Generated: ' + did.id);
            addLog('🔑 Public Key: ' + did.publicKey.substring(0, 20) + '...');
            addLog('💾 Connected to Nillion network');
            addLog('📦 Collection: ' + result.collectionId);
        } else {
            throw new Error(result.error || 'Failed to generate DID');
        }
    } catch (error) {
        setStatus('DID Error ❌', 'error');
        addLog('❌ Error generating DID: ' + error.message);
    }
}

function openDataForm() {
    // Create modal form instead of opening new tab
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            color: #333;
        ">
            <h2 style="margin: 0 0 20px 0; color: #333;">Create New Data</h2>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Name *</label>
                <input type="text" id="dataName" placeholder="Enter data name" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-sizing: border-box;
                " />
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Type</label>
                  <select id="dataType" style="
                      width: 100%;
                      padding: 8px;
                      border: 1px solid #ddd;
                      border-radius: 4px;
                      box-sizing: border-box;
                  ">
                      <option value="text">📝 Plain Text</option>
                      <option value="document">📄 Document</option>
                      <option value="image">🖼️ Image</option>
                      <option value="video">🎥 Video</option>
                      <option value="audio">🎵 Audio</option>
                      <option value="pdf">📋 PDF</option>
                      <option value="archive">📦 Archive</option>
                  </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Content</label>
                <textarea id="dataContent" placeholder="Enter data content" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-sizing: border-box;
                    min-height: 100px;
                    resize: vertical;
                "></textarea>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">File Upload</label>
                <div id="fileUploadArea" style="
                    border: 2px dashed #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    <input type="file" id="fileInput" accept="image/*,video/*,audio/*,.pdf,.zip,.rar,.7z,.txt,.json" style="display: none;">
                    <div style="font-size: 24px; color: #007bff; margin-bottom: 8px;">📁</div>
                    <div style="font-size: 14px; color: #666;">Click to upload or drag and drop</div>
                </div>
                <div id="filePreview" style="
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    display: none;
                ">
                    <div id="fileInfo"></div>
                    <button type="button" id="clearFileBtn" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 5px;
                    ">Remove File</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="modalCancelBtn" style="
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: #f5f5f5;
                    border-radius: 4px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="modalSubmitBtn" style="
                    padding: 8px 16px;
                    border: none;
                    background: #007bff;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">Create Data</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    addLog('📝 Opening data creation form...');
    
    // Add event listeners for the modal
    setupModalEvents(modal);
}

function setupModalEvents(modal) {
    let selectedFile = null;
    
    // File upload handling
    const fileInput = modal.querySelector('#fileInput');
    const fileUploadArea = modal.querySelector('#fileUploadArea');
    const filePreview = modal.querySelector('#filePreview');
    const fileInfo = modal.querySelector('#fileInfo');
    const clearFileBtn = modal.querySelector('#clearFileBtn');
    
    // File input change
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            selectedFile = file;
            showFilePreview(file);
            addLog(`📁 File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        }
    });
    
    // Upload area click
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#007bff';
        fileUploadArea.style.backgroundColor = '#f8f9ff';
    });
    
    fileUploadArea.addEventListener('dragleave', function() {
        fileUploadArea.style.borderColor = '#ddd';
        fileUploadArea.style.backgroundColor = 'transparent';
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#ddd';
        fileUploadArea.style.backgroundColor = 'transparent';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            selectedFile = files[0];
            showFilePreview(files[0]);
            addLog(`📁 File dropped: ${files[0].name}`);
        }
    });
    
    // Clear file button
    clearFileBtn.addEventListener('click', function() {
        selectedFile = null;
        fileInput.value = '';
        filePreview.style.display = 'none';
        addLog('🗑️ File cleared');
    });
    
    function showFilePreview(file) {
        fileInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="font-size: 20px; color: #007bff;">📄</div>
                <div>
                    <div style="font-weight: 600; color: #333;">${file.name}</div>
                    <div style="font-size: 12px; color: #666;">${(file.size / 1024 / 1024).toFixed(2)} MB - ${file.type}</div>
                </div>
            </div>
        `;
        filePreview.style.display = 'block';
    }
    
    // Cancel button
    modal.querySelector('#modalCancelBtn').addEventListener('click', function() {
        modal.remove();
        addLog('❌ Data creation cancelled');
    });
    
    // Submit button
    modal.querySelector('#modalSubmitBtn').addEventListener('click', function() {
        const name = modal.querySelector('#dataName').value.trim();
        const type = modal.querySelector('#dataType').value;
        const content = modal.querySelector('#dataContent').value;
        
        if (!name) {
            alert('Please enter a name');
            return;
        }
        
        const newData = {
            id: 'data-' + Date.now(),
            name: name,
            type: type,
            content: content || (selectedFile ? 'File uploaded: ' + selectedFile.name : ''),
            fileName: selectedFile ? selectedFile.name : null,
            fileSize: selectedFile ? selectedFile.size : null,
            fileType: selectedFile ? selectedFile.type : null,
            createdAt: new Date().toISOString()
        };
        
          // Store in Nillion Private Storage
          if (!nillionSDK) {
              nillionSDK = new NillionSDK();
          }
          
          // Initialize SDK first if not already done
          nillionSDK.initialize().then(initResult => {
              if (!initResult.success) {
                  throw new Error(initResult.error || 'Failed to initialize SDK');
              }
              
              // Now create the data
              return nillionSDK.createData(newData.id, newData, {
                  name: newData.name,
                  type: newData.type,
                  fileName: newData.fileName,
                  fileSize: newData.fileSize,
                  fileType: newData.fileType
              });
          }).then(result => {
              if (result.success) {
                  addLog(`✅ Data created: ${name} (${type})`);
                  setStatus('Data Created ✅', 'success');
                  modal.remove();
              } else {
                  throw new Error(result.error || 'Failed to store data');
              }
          }).catch(error => {
              addLog(`❌ Error creating data: ${error.message}`);
              setStatus('Data Creation Error ❌', 'error');
          });
    });
}

async function listData() {
    addLog('📋 Listing all data from Nillion network...');
    
    if (!nillionSDK) {
        nillionSDK = new NillionSDK();
    }
    
    try {
        // Initialize SDK first if not already done
        const initResult = await nillionSDK.initialize();
        if (!initResult.success) {
            throw new Error(initResult.error || 'Failed to initialize SDK');
        }
        
        const result = await nillionSDK.listData();
        
        if (result.success) {
            const storedData = result.data || [];
            if (storedData.length === 0) {
                addLog('📭 No data items found');
                setStatus('No Data', 'warning');
            } else {
                addLog(`📊 Found ${storedData.length} data items:`);
                storedData.forEach((item, index) => {
                    addLog(`  ${index + 1}. ${item.name} (${item.type}) - ${new Date(item.createdAt).toLocaleDateString()}`);
                });
                setStatus(`${storedData.length} Items Found`, 'success');
                
                // Show detailed data viewer
                showDataViewer(storedData);
            }
        } else {
            throw new Error(result.error || 'Failed to list data');
        }
    } catch (error) {
        addLog(`❌ Error listing data: ${error.message}`);
        setStatus('Data Listing Error ❌', 'error');
    }
}

function showDataViewer(dataItems) {
    // Create modal for data viewer
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            color: #333;
        ">
            <h2 style="margin: 0 0 20px 0; color: #333;">📊 Your Private Data</h2>
            <div id="dataList" style="margin-bottom: 20px;">
                ${dataItems.map((item, index) => `
                    <div style="
                        border: 1px solid #e1e5e9;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        background: #f8f9fa;
                    ">
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0; color: #333; font-size: 16px;">${item.name}</h3>
                                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                                    ${getFileIcon(item.type)} ${item.type} • ${new Date(item.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button class="viewBtn" data-id="${item.id}" style="
                                    background: #007bff;
                                    color: white;
                                    border: none;
                                    padding: 5px 10px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">View</button>
                                <button class="deleteBtn" data-id="${item.id}" style="
                                    background: #dc3545;
                                    color: white;
                                    border: none;
                                    padding: 5px 10px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">Delete</button>
                            </div>
                        </div>
                        
                          <div style="margin-bottom: 10px;">
                              <strong>Content:</strong> ${item.content ? (typeof item.content === 'string' ? item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '') : JSON.stringify(item.content).substring(0, 100) + '...') : 'No content'}
                          </div>
                        
                        ${item.fileName ? `
                            <div style="margin-bottom: 10px;">
                                <strong>File:</strong> ${item.fileName} (${(item.fileSize / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        ` : ''}
                        
                        <div style="margin-bottom: 10px;">
                            <strong>Permissions:</strong>
                            <div style="margin-top: 5px;">
                                <span style="
                                    background: #28a745;
                                    color: white;
                                    padding: 2px 6px;
                                    border-radius: 3px;
                                    font-size: 11px;
                                    margin-right: 5px;
                                ">Read</span>
                                <span style="
                                    background: #007bff;
                                    color: white;
                                    padding: 2px 6px;
                                    border-radius: 3px;
                                    font-size: 11px;
                                    margin-right: 5px;
                                ">Write</span>
                                <span style="
                                    background: #ffc107;
                                    color: #333;
                                    padding: 2px 6px;
                                    border-radius: 3px;
                                    font-size: 11px;
                                    margin-right: 5px;
                                ">Download</span>
                            </div>
                        </div>
                        
                        <div style="font-size: 12px; color: #666;">
                            <strong>ID:</strong> ${item.id} • 
                            <strong>Created:</strong> ${new Date(item.createdAt).toLocaleString()}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="closeViewerBtn" style="
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: #f5f5f5;
                    border-radius: 4px;
                    cursor: pointer;
                ">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    setupDataViewerEvents(modal, dataItems);
}

function getFileIcon(type) {
    switch(type) {
        case 'text': return '📝';
        case 'image': return '🖼️';
        case 'video': return '🎥';
        case 'audio': return '🎵';
        case 'pdf': return '📋';
        case 'archive': return '📦';
        case 'document': return '📄';
        default: return '📄';
    }
}

function setupDataViewerEvents(modal, dataItems) {
    // Close button
    modal.querySelector('#closeViewerBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // View buttons
    modal.querySelectorAll('.viewBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dataId = this.getAttribute('data-id');
            const item = dataItems.find(d => d.id === dataId);
            if (item) {
                showDataDetails(item);
            }
        });
    });
    
    // Delete buttons
    modal.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dataId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this data item?')) {
                deleteDataItem(dataId);
                modal.remove();
                listData(); // Refresh the list
            }
        });
    });
}

function showDataDetails(item) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            color: #333;
        ">
            <h2 style="margin: 0 0 20px 0; color: #333;">${getFileIcon(item.type)} ${item.name}</h2>
            
            <div style="margin-bottom: 15px;">
                <strong>Type:</strong> ${item.type}
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Content:</strong>
                <div style="
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 5px;
                    white-space: pre-wrap;
                    max-height: 200px;
                    overflow-y: auto;
                ">${item.content || 'No content'}</div>
            </div>
            
            ${item.fileName ? `
                <div style="margin-bottom: 15px;">
                    <strong>File:</strong> ${item.fileName} (${(item.fileSize / 1024 / 1024).toFixed(2)} MB)
                </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
                <strong>Permissions:</strong>
                <div style="margin-top: 5px;">
                    <span style="
                        background: #28a745;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        margin-right: 5px;
                    ">Read</span>
                    <span style="
                        background: #007bff;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        margin-right: 5px;
                    ">Write</span>
                    <span style="
                        background: #ffc107;
                        color: #333;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        margin-right: 5px;
                    ">Download</span>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Metadata:</strong>
                <div style="
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 5px;
                    font-size: 12px;
                ">
                    <div><strong>ID:</strong> ${item.id}</div>
                    <div><strong>Created:</strong> ${new Date(item.createdAt).toLocaleString()}</div>
                    ${item.fileType ? `<div><strong>File Type:</strong> ${item.fileType}</div>` : ''}
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="closeDetailsBtn" style="
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: #f5f5f5;
                    border-radius: 4px;
                    cursor: pointer;
                ">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button
    modal.querySelector('#closeDetailsBtn').addEventListener('click', function() {
        modal.remove();
    });
}

async function deleteDataItem(dataId) {
    if (!nillionSDK) {
        nillionSDK = new NillionSDK();
    }
    
    try {
        // Initialize SDK first if not already done
        const initResult = await nillionSDK.initialize();
        if (!initResult.success) {
            throw new Error(initResult.error || 'Failed to initialize SDK');
        }
        
        const result = await nillionSDK.deleteData(dataId);
        
        if (result.success) {
            addLog(`🗑️ Data item deleted: ${dataId}`);
            setStatus('Data Deleted ✅', 'success');
        } else {
            throw new Error(result.error || 'Failed to delete data');
        }
    } catch (error) {
        addLog(`❌ Error deleting data: ${error.message}`);
        setStatus('Data Deletion Error ❌', 'error');
    }
}

async function clearData() {
    if (confirm('⚠️ Clear all data from Nillion network? This cannot be undone.')) {
        if (!nillionSDK) {
            nillionSDK = new NillionSDK();
        }
        
        try {
            // Initialize SDK first if not already done
            const initResult = await nillionSDK.initialize();
            if (!initResult.success) {
                throw new Error(initResult.error || 'Failed to initialize SDK');
            }
            
            // Get all data first
            const listResult = await nillionSDK.listData();
            if (listResult.success && listResult.data) {
                // Delete each item
                for (const item of listResult.data) {
                    await nillionSDK.deleteData(item._id);
                }
                addLog('🗑️ All data cleared from Nillion network');
                setStatus('Data Cleared ✅', 'success');
            } else {
                addLog('📭 No data to clear');
                setStatus('No Data to Clear', 'warning');
            }
        } catch (error) {
            addLog(`❌ Error clearing data: ${error.message}`);
            setStatus('Data Clear Error ❌', 'error');
        }
    }
}

async function testPermission() {
    addLog('🔐 Testing current website permission...');
    
    // Get current tab information
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            const currentTab = tabs[0];
            const currentDomain = new URL(currentTab.url).hostname;
            const siteName = getSiteName(currentDomain);
            
            addLog('🌐 Current website: ' + siteName + ' (' + currentDomain + ')');
            
            // Check if we have permissions for this site
            chrome.storage.local.get('pdm_permissions', function(result) {
                const permissions = result.pdm_permissions || [];
                const sitePermissions = permissions.filter(p => p.domain === currentDomain);
                
                if (sitePermissions.length > 0) {
                    addLog('✅ Found ' + sitePermissions.length + ' permission(s) for this site:');
                    sitePermissions.forEach(perm => {
                        addLog('  📋 ' + perm.siteName + ': ' + perm.permissions.join(', ') + 
                              ' (granted: ' + new Date(perm.grantedAt).toLocaleDateString() + ')');
                    });
                    setStatus('Site Permissions Found ✅', 'success');
                } else {
                    addLog('⚠️ No permissions found for this site');
                    addLog('💡 Visit a website with forms to grant permissions');
                    setStatus('No Permissions', 'warning');
                }
            });
        } else {
            addLog('❌ Could not get current tab information');
            setStatus('Tab Error ❌', 'error');
        }
    });
}

async function listPermissions() {
    addLog('📋 Listing all website permissions...');
    
    if (!nillionSDK) {
        nillionSDK = new NillionSDK();
    }
    
    try {
        // Get current tab information
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0]) {
            const currentTab = tabs[0];
            const currentDomain = new URL(currentTab.url).hostname;
            const currentSiteName = getSiteName(currentDomain);
            
            addLog('🌐 Current website: ' + currentSiteName + ' (' + currentDomain + ')');
            addLog('');
            
            // Get permissions from local storage (simplified for now)
            const result = await chrome.storage.local.get(['pdm_permissions']);
            const permissions = result.pdm_permissions || [];
            
            if (permissions.length === 0) {
                addLog('📭 No website permissions found');
                addLog('💡 Visit websites with forms to grant permissions');
                setStatus('No Permissions', 'warning');
            } else {
                addLog('📊 Found ' + permissions.length + ' website permission(s):');
                addLog('');
                
                // Group by domain
                const permissionsByDomain = {};
                permissions.forEach(perm => {
                    if (!permissionsByDomain[perm.domain]) {
                        permissionsByDomain[perm.domain] = [];
                    }
                    permissionsByDomain[perm.domain].push(perm);
                });
                
                // Show current website first
                if (permissionsByDomain[currentDomain]) {
                    addLog('🎯 CURRENT WEBSITE:');
                    permissionsByDomain[currentDomain].forEach(perm => {
                        addLog('  📋 ' + perm.siteName + ' (' + perm.domain + ')');
                        addLog('     Permissions: ' + perm.permissions.join(', '));
                        addLog('     Granted: ' + new Date(perm.grantedAt).toLocaleString());
                        addLog('     Description: ' + (perm.description || 'No description'));
                        addLog('');
                    });
                }
                
                // Show other websites
                const otherDomains = Object.keys(permissionsByDomain).filter(domain => domain !== currentDomain);
                if (otherDomains.length > 0) {
                    addLog('🌐 OTHER WEBSITES:');
                    otherDomains.forEach(domain => {
                        permissionsByDomain[domain].forEach(perm => {
                            addLog('  📋 ' + perm.siteName + ' (' + perm.domain + ')');
                            addLog('     Permissions: ' + perm.permissions.join(', '));
                            addLog('     Granted: ' + new Date(perm.grantedAt).toLocaleString());
                            addLog('     Description: ' + (perm.description || 'No description'));
                            addLog('');
                        });
                    });
                }
                
                setStatus(permissions.length + ' Permissions Found', 'success');
            }
        } else {
            addLog('❌ Could not get current tab information');
            setStatus('Tab Error ❌', 'error');
        }
    } catch (error) {
        addLog(`❌ Error listing permissions: ${error.message}`);
        setStatus('Permission Listing Error ❌', 'error');
    }
}

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
        'youtube.com': 'YouTube',
        'indeed.com': 'Indeed',
        'glassdoor.com': 'Glassdoor',
        'monster.com': 'Monster',
        'ziprecruiter.com': 'ZipRecruiter',
        'cake.ai': 'Cake AI',
        'cake-resume.com': 'Cake Resume'
    };
    
    for (const [key, value] of Object.entries(siteNames)) {
        if (domain.includes(key)) {
            return value;
        }
    }
    
    return domain.charAt(0).toUpperCase() + domain.slice(1);
}

async function revokePermission() {
    addLog('🗑️ Revoking permissions for current website...');
    
    if (!nillionSDK) {
        nillionSDK = new NillionSDK();
    }
    
    try {
        // Get current tab information
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0]) {
            const currentTab = tabs[0];
            const currentDomain = new URL(currentTab.url).hostname;
            const siteName = getSiteName(currentDomain);
            
            addLog('🌐 Current website: ' + siteName + ' (' + currentDomain + ')');
            
            // Get permissions from local storage
            const result = await chrome.storage.local.get(['pdm_permissions']);
            const permissions = result.pdm_permissions || [];
            const sitePermissions = permissions.filter(p => p.domain === currentDomain);
            
            if (sitePermissions.length > 0) {
                addLog('🗑️ Revoking ' + sitePermissions.length + ' permission(s) for ' + siteName);
                
                // Remove permissions from local storage
                const remainingPermissions = permissions.filter(p => p.domain !== currentDomain);
                await chrome.storage.local.set({ pdm_permissions: remainingPermissions });
                
                sitePermissions.forEach(perm => {
                    addLog('  ❌ Removed: ' + perm.siteName + ' (' + perm.permissions.join(', ') + ')');
                });
                
                addLog('✅ Permissions revoked successfully');
                setStatus('Permissions Revoked ✅', 'success');
            } else {
                addLog('⚠️ No permissions found for this site');
                setStatus('No Permissions to Revoke', 'warning');
            }
        } else {
            addLog('❌ Could not get current tab information');
            setStatus('Tab Error ❌', 'error');
        }
    } catch (error) {
        addLog(`❌ Error revoking permissions: ${error.message}`);
        setStatus('Permission Revocation Error ❌', 'error');
    }
}

function clearLog() {
    const log = document.getElementById('log');
    if (log) {
        log.textContent = 'Log cleared...\n';
    }
}

function copyLog() {
    const log = document.getElementById('log');
    if (log) {
        const logText = log.textContent;
        navigator.clipboard.writeText(logText).then(() => {
            addLog('📋 Log copied to clipboard');
            setStatus('Log Copied ✅', 'success');
        }).catch(err => {
            addLog('❌ Failed to copy log: ' + err.message);
            setStatus('Copy Failed ❌', 'error');
        });
    }
}

async function checkApiKeyStatus() {
    try {
        const result = await chrome.storage.local.get(['api_key_configured', 'nillion_api_key']);
        
        if (result.api_key_configured && result.nillion_api_key) {
            // API key is configured
            const apiKeyPreview = result.nillion_api_key.substring(0, 8) + '...' + result.nillion_api_key.substring(result.nillion_api_key.length - 4);
            addLog('🔑 API Key: ' + apiKeyPreview + ' (Configured)');
            setStatus('Ready ✅', 'success');
        } else {
            // No API key configured
            addLog('❌ API Key: Not configured');
            setStatus('Not Initialized ❌', 'error');
            addLog('💡 Click "⚙️ Configure API Key" to get started');
        }
    } catch (error) {
        console.error('Error checking API key status:', error);
        addLog('❌ Error checking API key status');
        setStatus('Error ❌', 'error');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Nillion Vault Extension Popup Loading...');
    
    // Check if API key is configured first
    try {
        const result = await chrome.storage.local.get(['api_key_configured', 'nillion_api_key']);
        if (!result.api_key_configured || !result.nillion_api_key) {
            // No API key configured - show message and redirect button
            addLog('❌ API Key not configured');
            setStatus('API Key Required ❌', 'error');
            addLog('💡 Click "⚙️ Configure API Key" to get started');
            
            // Show configure button prominently
            const configureBtn = document.getElementById('configureApiBtn');
            if (configureBtn) {
                configureBtn.style.background = '#dc3545';
                configureBtn.style.color = 'white';
                configureBtn.style.fontWeight = 'bold';
                configureBtn.textContent = '⚙️ Configure API Key (Required)';
            }
            return;
        }
    } catch (error) {
        console.error('Error checking API key:', error);
        addLog('❌ Error checking API key');
        setStatus('Error ❌', 'error');
        return;
    }
    
    // Add event listeners to all buttons
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(button => {
        const buttonId = button.id;
        console.log('Setting up button:', buttonId);
        
        switch(buttonId) {
            case 'configureApiBtn':
                button.addEventListener('click', function() {
                    addLog('⚙️ Opening API key configuration...');
                    chrome.tabs.create({
                        url: chrome.runtime.getURL('welcome.html')
                    });
                });
                break;
            case 'checkStatusBtn':
                button.addEventListener('click', checkStatus);
                break;
            case 'generateDIDBtn':
                button.addEventListener('click', generateDID);
                break;
            case 'createDataBtn':
                button.addEventListener('click', openDataForm);
                break;
            case 'listDataBtn':
                button.addEventListener('click', listData);
                break;
            case 'clearDataBtn':
                button.addEventListener('click', clearData);
                break;
            case 'testPermissionBtn':
                button.addEventListener('click', testPermission);
                break;
            case 'listPermissionsBtn':
                button.addEventListener('click', listPermissions);
                break;
            case 'revokePermissionBtn':
                button.addEventListener('click', revokePermission);
                break;
              case 'clearLogBtn':
                  button.addEventListener('click', clearLog);
                  break;
              case 'copyLogBtn':
                  button.addEventListener('click', copyLog);
                  break;
        }
    });
    
    // Initialize
    addLog('🚀 Nillion Vault Loaded');
    addLog('🔧 Version: 1.0.0');
    addLog('🌐 Powered by Nillion SecretVaults');
    
    // Check API key status
    checkApiKeyStatus();
    
      // Auto-check status
      setTimeout(() => {
          checkStatus();
      }, 500);
      
      // Auto-initialize SDK
      setTimeout(async () => {
          try {
              if (!nillionSDK) {
                  nillionSDK = new NillionSDK();
              }
              const initResult = await nillionSDK.initialize();
              if (initResult.success) {
                  addLog('✅ Nillion SDK initialized successfully');
                  setStatus('Ready ✅', 'success');
              } else {
                  addLog('⚠️ SDK initialization failed: ' + initResult.error);
                  setStatus('SDK Error ⚠️', 'warning');
              }
          } catch (error) {
              addLog('⚠️ SDK initialization error: ' + error.message);
              setStatus('SDK Error ⚠️', 'warning');
          }
      }, 1000);
    
    console.log('Nillion Vault Extension Popup Ready!');
});
