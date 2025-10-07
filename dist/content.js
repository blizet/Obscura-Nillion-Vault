// Content script for Private Data Manager extension

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.pdmContentScriptLoaded) {
    return;
  }
  window.pdmContentScriptLoaded = true;
  
  // Check if we should run on this site
  const currentDomain = window.location.hostname.toLowerCase();
  const excludedSites = [
    'youtube.com',
    'youtu.be',
    'netflix.com',
    'hulu.com',
    'disney.com',
    'amazon.com',
    'twitch.tv',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'reddit.com',
    'pinterest.com',
    'snapchat.com',
    'discord.com',
    'zoom.us',
    'teams.microsoft.com',
    'meet.google.com',
    'webex.com'
  ];
  
  // Skip if current site is in excluded list
  if (excludedSites.some(site => currentDomain.includes(site))) {
    console.log('Nillion Vault: Skipping site (excluded):', currentDomain);
    return;
  }
  
  console.log('Nillion Vault content script loaded on:', currentDomain);
  
  // Create message handler for communication with web apps
  const messageHandler = {
    // Handle messages from web apps
    handleWebAppMessage: function(event) {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      const message = event.data;
      
      // Only handle PDM-related messages
      if (message.type && message.type.startsWith('PDM_')) {
        console.log('Received PDM message from web app:', message);
        
        // Forward to background script
        chrome.runtime.sendMessage({
          type: 'FORWARD_TO_POPUP',
          originalMessage: message,
          origin: event.origin
        }, (response) => {
          if (response && response.success) {
            // Send response back to web app
            window.postMessage({
              type: 'PDM_RESPONSE',
              requestId: message.requestId,
              ...response.data
            }, window.location.origin);
          }
        });
      }
    },
    
    // Handle messages from extension
    handleExtensionMessage: function(event) {
      if (event.data.type === 'PDM_RESPONSE') {
        // This is a response from the extension, forward to web app
        window.postMessage(event.data, window.location.origin);
      }
    }
  };
  
  // Listen for messages from web apps
  window.addEventListener('message', messageHandler.handleWebAppMessage);
  
  // Listen for messages from extension
  window.addEventListener('message', messageHandler.handleExtensionMessage);
  
  // Smart field detection and PDM integration
  const smartFieldDetection = () => {
    // Detect form fields that match our stored data
    const detectMatchingFields = () => {
      // More comprehensive field detection
      const formFields = document.querySelectorAll(`
        input[type="text"], 
        input[type="email"], 
        input[type="file"], 
        input[name*="name"], 
        input[name*="email"], 
        input[name*="phone"], 
        input[name*="resume"], 
        input[name*="cv"], 
        input[name*="document"], 
        input[name*="upload"], 
        input[accept*="pdf"], 
        input[accept*="doc"], 
        input[accept*="docx"], 
        textarea,
        [data-testid*="upload"],
        [data-testid*="file"],
        [class*="upload"],
        [class*="file"],
        [id*="upload"],
        [id*="file"],
        [id*="resume"],
        [id*="cv"]
      `);
      
      console.log('🔍 Nillion Vault: Found', formFields.length, 'potential form fields');
      
      const matchingFields = [];
      
      formFields.forEach(field => {
        const fieldName = field.name || field.id || field.placeholder || field.className || '';
        const fieldType = field.type || 'text';
        const fieldAccept = field.accept || '';
        const fieldText = field.textContent || field.innerText || '';
        
        // Enhanced relevance checking
        const relevance = getFieldRelevance(fieldName, fieldType, fieldAccept, fieldText);
        
        if (relevance > 0) {
          console.log('✅ Nillion Vault: Relevant field found:', {
            name: fieldName,
            type: fieldType,
            accept: fieldAccept,
            relevance: relevance
          });
          
          matchingFields.push({
            element: field,
            name: fieldName,
            type: fieldType,
            accept: fieldAccept,
            relevance: relevance
          });
        }
      });
      
      console.log('🎯 Nillion Vault: Total matching fields:', matchingFields.length);
      return matchingFields;
    };
    
    // Check if field is relevant to our stored data
    const isFieldRelevant = (fieldName, fieldType) => {
      const relevantKeywords = [
        'name', 'email', 'phone', 'address', 'resume', 'cv', 'document', 
        'file', 'upload', 'profile', 'bio', 'description', 'experience',
        'education', 'skills', 'portfolio', 'work', 'company', 'position'
      ];
      
      const fieldLower = fieldName.toLowerCase();
      return relevantKeywords.some(keyword => fieldLower.includes(keyword)) || 
             fieldType === 'file';
    };
    
    // Get relevance score for field
    const getFieldRelevance = (fieldName, fieldType, fieldAccept, fieldText) => {
      const fieldLower = fieldName.toLowerCase();
      const acceptLower = fieldAccept.toLowerCase();
      const textLower = fieldText.toLowerCase();
      let score = 0;
      
      // File upload fields get highest priority
      if (fieldType === 'file') {
        score += 10;
        
        // Check for document-related file types
        if (acceptLower.includes('pdf') || acceptLower.includes('doc') || acceptLower.includes('docx')) {
          score += 5;
        }
      }
      
      // Check for resume/CV related keywords
      if (fieldLower.includes('resume') || fieldLower.includes('cv') || 
          fieldLower.includes('curriculum') || fieldLower.includes('vitae')) {
        score += 8;
      }
      
      // Check for document-related keywords
      if (fieldLower.includes('document') || fieldLower.includes('file') || 
          fieldLower.includes('upload') || fieldLower.includes('attachment')) {
        score += 6;
      }
      
      // Check for personal info keywords
      if (fieldLower.includes('name') || fieldLower.includes('fullname')) score += 6;
      if (fieldLower.includes('email') || fieldLower.includes('mail')) score += 5;
      if (fieldLower.includes('phone') || fieldLower.includes('telephone')) score += 4;
      if (fieldLower.includes('address') || fieldLower.includes('location')) score += 3;
      
      // Check for professional keywords
      if (fieldLower.includes('experience') || fieldLower.includes('work') || 
          fieldLower.includes('career') || fieldLower.includes('job')) {
        score += 4;
      }
      
      // Check for education/skills keywords
      if (fieldLower.includes('education') || fieldLower.includes('skills') || 
          fieldLower.includes('qualification') || fieldLower.includes('degree')) {
        score += 3;
      }
      
      // Check for portfolio/profile keywords
      if (fieldLower.includes('portfolio') || fieldLower.includes('profile') || 
          fieldLower.includes('bio') || fieldLower.includes('description')) {
        score += 3;
      }
      
      // Check text content for relevant keywords
      if (textLower.includes('resume') || textLower.includes('cv') || 
          textLower.includes('upload') || textLower.includes('document')) {
        score += 2;
      }
      
      // Check for drag-and-drop areas
      if (fieldLower.includes('drop') || fieldLower.includes('drag') || 
          textLower.includes('drop') || textLower.includes('drag')) {
        score += 3;
      }
      
      console.log('🔍 PDM: Field relevance check:', {
        name: fieldName,
        type: fieldType,
        accept: fieldAccept,
        text: fieldText.substring(0, 50),
        score: score
      });
      
      return score;
    };
    
    // Show PDM permission dialog for detected fields
    const showPDMPermissionDialog = (matchingFields) => {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      const currentDomain = window.location.hostname;
      const siteName = getSiteName(currentDomain);
      
      dialog.innerHTML = `
        <div style="
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        ">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
            <h2 style="margin: 0; color: #333; font-size: 24px;">Nillion Vault Privacy Request</h2>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">We detected form fields that match your private data</p>
          </div>
          
          <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="font-weight: bold; margin-bottom: 10px;">${siteName} wants to access your private data</div>
            <div style="font-size: 14px; color: #666;">
              <strong>Website:</strong> ${currentDomain}<br>
              <strong>Detected Fields:</strong> ${matchingFields.length} relevant form fields
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Detected Form Fields:</div>
            <div style="max-height: 150px; overflow-y: auto; border: 1px solid #e1e5e9; border-radius: 4px; padding: 10px;">
              ${matchingFields.map(field => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
                  <div>
                    <strong>${field.name || 'Unnamed field'}</strong>
                    <span style="color: #666; font-size: 12px;"> (${field.type})</span>
                  </div>
                  <div style="font-size: 12px; color: #007bff;">
                    Relevance: ${field.relevance}/10
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Select permissions to grant:</div>
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" id="permRead" checked style="margin-right: 8px;">
              <span>📖 Read - Allow ${siteName} to view your data</span>
            </label>
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" id="permWrite" checked style="margin-right: 8px;">
              <span>✏️ Write - Allow ${siteName} to modify your data</span>
            </label>
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" id="permDownload" style="margin-right: 8px;">
              <span>⬇️ Download - Allow ${siteName} to download your data</span>
            </label>
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" id="permStream" style="margin-right: 8px;">
              <span>📺 Stream - Allow ${siteName} to stream your media</span>
            </label>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Data Description (optional):</label>
            <input type="text" id="dataDescription" placeholder="e.g., Resume, Portfolio, Personal Info" style="
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              box-sizing: border-box;
            ">
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="pdmDeny" style="
              padding: 10px 20px;
              border: 1px solid #ddd;
              background: #f5f5f5;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Deny</button>
            <button id="pdmGrant" style="
              padding: 10px 20px;
              border: none;
              background: #007bff;
              color: white;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              transition: all 0.3s ease;
            ">Grant Access</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Handle deny
      dialog.querySelector('#pdmDeny').addEventListener('click', () => {
        dialog.remove();
        showNotification('❌ Access denied to ' + siteName, 'error');
      });
      
      // Handle grant
      dialog.querySelector('#pdmGrant').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent double-click
        if (dialog.querySelector('#pdmGrant').disabled) {
          return;
        }
        
        // Disable button to prevent double-click
        dialog.querySelector('#pdmGrant').disabled = true;
        dialog.querySelector('#pdmGrant').textContent = 'Processing...';
        
        const permissions = [];
        if (dialog.querySelector('#permRead').checked) permissions.push('read');
        if (dialog.querySelector('#permWrite').checked) permissions.push('write');
        if (dialog.querySelector('#permDownload').checked) permissions.push('download');
        if (dialog.querySelector('#permStream').checked) permissions.push('stream');
        
        const description = dialog.querySelector('#dataDescription').value || 'Data from ' + siteName;
        
        console.log('✅ PDM: Granting permission with data:', {
          siteName,
          permissions,
          description,
          fieldsCount: matchingFields.length
        });
        
        // Grant permission and auto-fill
        grantPermissionAndFill(siteName, currentDomain, permissions, description, matchingFields);
        
        // Remove dialog after a short delay to ensure processing completes
        setTimeout(() => {
          dialog.remove();
        }, 500);
      });
    };
    
    // Grant permission and auto-fill fields
    const grantPermissionAndFill = async (siteName, domain, permissions, description, matchingFields) => {
      try {
        // Grant permission through extension messaging
        const appId = domain.replace(/[^a-zA-Z0-9]/g, '');
        
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          type: 'GRANT_PERMISSION',
          payload: {
            appId: appId,
            siteName: siteName,
            domain: domain,
            permissions: permissions,
            description: description
          }
        });
        
        if (response && response.success) {
          showNotification(`✅ Access granted to ${siteName}`, 'success');
          
          // Auto-fill fields with stored data
          autoFillFields(matchingFields);
        } else {
          throw new Error(response?.error || 'Failed to grant permission');
        }
      } catch (error) {
        console.error('❌ Permission grant failed:', error);
        showNotification(`❌ Failed to grant permission: ${error.message}`, 'error');
      }
    };
    
    // Auto-fill form fields with stored data
    const autoFillFields = async (matchingFields) => {
      console.log('🔄 Nillion Vault: Starting auto-fill for', matchingFields.length, 'fields');
      
      try {
        // Get data from Nillion Private Storage via extension messaging
        const response = await chrome.runtime.sendMessage({
          type: 'LIST_DATA'
        });
        
        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to get data');
        }
        
        const result = { success: true, data: response.data };
        
        if (result.success) {
          const storedData = result.data || [];
          console.log('📊 Nillion Vault: Found', storedData.length, 'stored data items');
          
          let filledCount = 0;
          
          matchingFields.forEach((field, index) => {
            const fieldElement = field.element;
            const fieldName = field.name.toLowerCase();
            
            // Find matching data
            let matchingData = null;
            
            if (fieldName.includes('name') || fieldName.includes('fullname')) {
              matchingData = storedData.find(d => d.name && (d.type === 'document' || d.type === 'text'));
            } else if (fieldName.includes('email')) {
              matchingData = storedData.find(d => d.content && d.content.includes('@'));
            } else if (fieldName.includes('phone')) {
              matchingData = storedData.find(d => d.content && /\d{3}-\d{3}-\d{4}/.test(d.content));
            } else if (fieldName.includes('resume') || fieldName.includes('cv') || field.type === 'file') {
              matchingData = storedData.find(d => d.fileName && (d.fileName.includes('resume') || d.fileName.includes('cv')));
            } else if (fieldName.includes('description') || fieldName.includes('bio') || fieldName.includes('about')) {
              matchingData = storedData.find(d => d.type === 'text' && d.content && d.content.length > 20);
            }
            
            if (matchingData) {
              console.log('✅ Nillion Vault: Auto-filling field', fieldName, 'with data:', matchingData.name);
              
              if (fieldElement.type === 'file') {
                // For file inputs, we can't directly set the file, but we can show a message
                showFieldNotification(fieldElement, `📄 Nillion Vault has your ${matchingData.name} ready to upload`);
              } else {
                // For text inputs, we can auto-fill
                fieldElement.value = matchingData.content || matchingData.name || '';
                fieldElement.style.border = '2px solid #28a745';
                fieldElement.style.backgroundColor = '#f8fff8';
                showFieldNotification(fieldElement, '✅ Auto-filled with Nillion Vault data');
                filledCount++;
              }
            } else {
              console.log('⚠️ Nillion Vault: No matching data found for field', fieldName);
            }
          });
          
          // Show summary notification
          if (filledCount > 0) {
            showNotification(`✅ Nillion Vault auto-filled ${filledCount} fields with your data`, 'success');
          } else {
            showNotification('⚠️ Nillion Vault: No matching data found to auto-fill', 'warning');
          }
        } else {
          throw new Error(result.error || 'Failed to retrieve data');
        }
      } catch (error) {
        console.error('❌ Auto-fill failed:', error);
        showNotification(`❌ Auto-fill failed: ${error.message}`, 'error');
      }
    };
    
    // Show notification for specific field
    const showFieldNotification = (field, message) => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: absolute;
        background: #28a745;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10001;
        pointer-events: none;
      `;
      
      const rect = field.getBoundingClientRect();
      notification.style.left = rect.left + 'px';
      notification.style.top = (rect.top - 30) + 'px';
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    };
    
    // Get site name from domain
    const getSiteName = (domain) => {
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
        'ziprecruiter.com': 'ZipRecruiter'
      };
      
      for (const [key, value] of Object.entries(siteNames)) {
        if (domain.includes(key)) {
          return value;
        }
      }
      
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    };
    
    // Show notification
    const showNotification = (message, type) => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
      `;
      
      if (type === 'success') {
        notification.style.background = '#28a745';
      } else {
        notification.style.background = '#dc3545';
      }
      
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    };
    
    // Enhanced detection for upload areas and buttons
    const detectUploadAreas = () => {
      const uploadAreas = document.querySelectorAll(`
        [class*="upload"],
        [class*="drop"],
        [class*="file"],
        [data-testid*="upload"],
        [data-testid*="file"],
        [id*="upload"],
        [id*="file"],
        [id*="resume"],
        [id*="cv"],
        button[class*="upload"],
        button[class*="file"],
        div[class*="upload"],
        div[class*="drop"]
      `);
      
      console.log('🔍 PDM: Found', uploadAreas.length, 'upload areas');
      
      const uploadFields = [];
      uploadAreas.forEach(area => {
        const text = (area.textContent || area.innerText || '').toLowerCase();
        const className = (typeof area.className === 'string' ? area.className : (area.className && area.className.toString ? area.className.toString() : '') || '').toLowerCase();
        const id = (area.id || '').toLowerCase();
        
        // Check if this looks like an upload area
        if (text.includes('upload') || text.includes('resume') || text.includes('cv') || 
            text.includes('document') || text.includes('file') || text.includes('drop') ||
            className.includes('upload') || className.includes('drop') || className.includes('file') ||
            id.includes('upload') || id.includes('file') || id.includes('resume') || id.includes('cv')) {
          
          console.log('✅ PDM: Upload area found:', {
            text: text.substring(0, 50),
            className: className,
            id: id
          });
          
          uploadFields.push({
            element: area,
            name: area.id || area.className || 'upload-area',
            type: 'upload-area',
            relevance: 8
          });
        }
      });
      
      return uploadFields;
    };
    
    // Monitor for form changes and new fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const matchingFields = detectMatchingFields();
          const uploadAreas = detectUploadAreas();
          const allFields = [...matchingFields, ...uploadAreas];
          
          if (allFields.length > 0) {
            // Check if we already showed permission dialog for this page
            if (!document.querySelector('.pdm-permission-shown')) {
              document.body.classList.add('pdm-permission-shown');
              setTimeout(() => {
                showPDMPermissionDialog(allFields);
              }, 1000); // Small delay to let page load
            }
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Initial detection
    setTimeout(() => {
      const matchingFields = detectMatchingFields();
      const uploadAreas = detectUploadAreas();
      const allFields = [...matchingFields, ...uploadAreas];
      
      console.log('🎯 PDM: Initial detection complete:', {
        formFields: matchingFields.length,
        uploadAreas: uploadAreas.length,
        total: allFields.length
      });
      
      if (allFields.length > 0) {
        showPDMPermissionDialog(allFields);
      }
    }, 2000); // Wait for page to load
  };

  // Inject PDM API into page
  const injectPDMAPI = function() {
    if (window.PDM) {
      return; // Already injected
    }
    
    window.PDM = {
      // Request permission to access private data
      requestPermission: function(appId, appName, permissions, message) {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          // Set up response listener
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          // Send permission request
          window.postMessage({
            type: 'PDM_REQUEST_PERMISSION',
            requestId: requestId,
            payload: {
              appId,
              appName,
              permissions,
              message
            }
          }, window.location.origin);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Permission request timeout'));
          }, 30000);
        });
      },
      
      // Get user's DID
      getDID: function() {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          window.postMessage({
            type: 'PDM_GET_DID',
            requestId: requestId
          }, window.location.origin);
          
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Request timeout'));
          }, 10000);
        });
      },
      
      // Get private data
      getData: function(dataId) {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          window.postMessage({
            type: 'PDM_GET_DATA',
            requestId: requestId,
            payload: { dataId }
          }, window.location.origin);
          
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Request timeout'));
          }, 10000);
        });
      },
      
      // Set private data
      setData: function(dataId, content) {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          window.postMessage({
            type: 'PDM_SET_DATA',
            requestId: requestId,
            payload: { dataId, content }
          }, window.location.origin);
          
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Request timeout'));
          }, 10000);
        });
      },
      
      // Delete private data
      deleteData: function(dataId) {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          window.postMessage({
            type: 'PDM_DELETE_DATA',
            requestId: requestId,
            payload: { dataId }
          }, window.location.origin);
          
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Request timeout'));
          }, 10000);
        });
      },
      
      // List all private data
      listData: function() {
        return new Promise((resolve, reject) => {
          const requestId = crypto.randomUUID();
          
          const responseHandler = (event) => {
            if (event.data.type === 'PDM_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', responseHandler);
              if (event.data.success) {
                resolve(event.data.data);
              } else {
                reject(new Error(event.data.error));
              }
            }
          };
          
          window.addEventListener('message', responseHandler);
          
          window.postMessage({
            type: 'PDM_LIST_DATA',
            requestId: requestId
          }, window.location.origin);
          
          setTimeout(() => {
            window.removeEventListener('message', responseHandler);
            reject(new Error('Request timeout'));
          }, 10000);
        });
      },
      
      // Check if extension is available
      isAvailable: function() {
        return true;
      }
    };
    
    // Add version info
    window.PDM.version = '1.0.0';
    window.PDM.extensionId = chrome.runtime.id;
  };
  
  // Inject API immediately
  injectPDMAPI();
  
  // Also inject when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPDMAPI);
  }
  
  // Notify web apps that PDM is available
  window.postMessage({
    type: 'PDM_EXTENSION_READY',
    data: {
      version: '1.0.0',
      extensionId: chrome.runtime.id
    }
  }, window.location.origin);
  
  console.log('Nillion Vault API injected into page');
  
  // Start smart field detection
  smartFieldDetection();
  
  // Load Nillion API
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('nillion-api.js');
  script.onload = function() {
    console.log('✅ Nillion API loaded in content script');
  };
  document.head.appendChild(script);
})();
