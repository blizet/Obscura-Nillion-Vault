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
    return;
  }
  
  // Special handling for Google Forms
  const isGoogleForms = currentDomain.includes('docs.google.com') && window.location.pathname.includes('/forms/');
  if (isGoogleForms) {
    // Add a delay to ensure Google Forms are fully loaded
    setTimeout(() => {
      detectFormFields();
    }, 2000);
  }
  
  // Nillion Vault content script loaded
  
  // Add CSS animations for notifications and UI elements
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .field-item:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)) !important;
    }

    .field-item[data-field-type="file"]:hover {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1)) !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
    }

    .nillion-upload-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes slideInUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    .nillion-field-filled {
      border: 2px solid #22c55e !important;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1)) !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
      transition: all 0.3s ease !important;
    }
    
    .nillion-field-filled:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
  
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
      // More comprehensive field detection including Google Forms
      let formFields;
      
      if (isGoogleForms) {
        // Google Forms specific selectors - updated for current Google Forms structure
        formFields = document.querySelectorAll(`
          .quantumWizTextinputPaperinputInput,
          .quantumWizTextinputPapertextareaInput,
          .quantumWizMenuPaperselectOption,
          .freebirdFormviewerComponentsQuestionBaseRoot input,
          .freebirdFormviewerComponentsQuestionBaseRoot textarea,
          .freebirdFormviewerComponentsQuestionBaseRoot select,
          .freebirdFormviewerComponentsQuestionTextInput,
          .freebirdFormviewerComponentsQuestionTextareaInput,
          .freebirdFormviewerComponentsQuestionSelectInput,
          .freebirdFormviewerComponentsQuestionFileuploadInput,
          .whsOnd.zHQkBf,
          .KHxj8b.tL9Q4c,
          .uArJ5e.cd29Sd.UQuaGc,
          .m2 input,
          .m2 textarea,
          .m2 select,
          .exportInputWrapper input,
          .exportInputWrapper textarea,
          .exportInputWrapper select,
          [role="textbox"],
          [role="combobox"],
          [role="listbox"],
          [aria-label*="name" i],
          [aria-label*="email" i],
          [aria-label*="phone" i],
          [aria-label*="address" i],
          [aria-label*="resume" i],
          [aria-label*="cv" i],
          [aria-label*="document" i],
          [aria-label*="upload" i],
          [aria-label*="Add file" i],
          input[type="text"], 
          input[type="email"], 
          input[type="file"], 
          input[type="tel"],
          input[type="url"],
          textarea,
          select
        `);
        // Found Google Forms fields
      } else {
        // Standard form field detection
        formFields = document.querySelectorAll(`
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
        // Found standard form fields
      }
      
      const matchingFields = [];
      
      formFields.forEach(field => {
        let fieldName = field.name || field.id || field.placeholder || field.className || '';
        let fieldType = field.type || 'text';
        const fieldAccept = field.accept || '';
        const fieldText = field.textContent || field.innerText || '';
        
        // Enhanced field type detection for Google Forms
        if (isGoogleForms) {
          if (field.classList.contains('whsOnd') && field.classList.contains('zHQkBf')) {
            fieldType = 'text'; // Phone Number field
          } else if (field.classList.contains('KHxj8b') && field.classList.contains('tL9Q4c')) {
            fieldType = 'textarea'; // Address field
          } else if (field.classList.contains('uArJ5e') && field.classList.contains('cd29Sd')) {
            fieldType = 'file'; // Resume upload field
          } else if (field.tagName === 'TEXTAREA') {
            fieldType = 'textarea';
          } else if (field.tagName === 'INPUT' && field.type === 'file') {
            fieldType = 'file';
          }
        }
        
        // For Google Forms, try to get the question text
        if (isGoogleForms) {
          const questionElement = field.closest('.freebirdFormviewerComponentsQuestionBaseRoot') || 
                                 field.closest('.quantumWizTextinputPaperinputRoot') ||
                                 field.closest('[role="listitem"]') ||
                                 field.closest('.m2') ||
                                 field.closest('.exportInputWrapper') ||
                                 field.closest('.geS5n') ||
                                 field.closest('[jsname="WsjYwc"]');
          
          if (questionElement) {
            const labelElement = questionElement.querySelector(`
              .freebirdFormviewerComponentsQuestionBaseTitle,
              .quantumWizTextinputPaperinputLabel,
              .quantumWizTextinputPapertextareaLabel,
              .freebirdFormviewerComponentsQuestionBaseTitleText,
              [role="heading"],
              .freebirdFormviewerComponentsQuestionBaseTitleText,
              .m2,
              .exportLabel,
              .HoXoMd.D1wxyf.RjsPE,
              .M7eMe
            `);
            if (labelElement) {
              fieldName = labelElement.textContent.trim() || fieldName;
            }
            
            // Also check for any text content in the question container
            if (!fieldName || fieldName === 'unnamed') {
              const allText = questionElement.textContent || '';
              const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              if (lines.length > 0) {
                fieldName = lines[0]; // Use first non-empty line as field name
              }
            }
          }
          
          // Also check for aria-label and other attributes
          if (!fieldName || fieldName === 'unnamed') {
            fieldName = field.getAttribute('aria-label') || 
                       field.getAttribute('aria-describedby') || 
                       field.getAttribute('placeholder') ||
                       field.getAttribute('title') ||
                       fieldName;
          }
          
          // For Google Forms, also check parent elements for context
          if (!fieldName || fieldName === 'unnamed') {
            let parent = field.parentElement;
            let attempts = 0;
            while (parent && attempts < 5) {
              const parentText = parent.textContent?.trim();
              if (parentText && parentText.length > 0 && parentText.length < 100) {
                fieldName = parentText;
                break;
              }
              parent = parent.parentElement;
              attempts++;
            }
          }
        }
        
        // Enhanced relevance checking
        const relevance = getFieldRelevance(fieldName, fieldType, fieldAccept, fieldText);
        
        if (relevance > 0) {
          
          matchingFields.push({
            element: field,
            name: fieldName,
            type: fieldType,
            accept: fieldAccept,
            relevance: relevance,
            isGoogleForm: isGoogleForms
          });
        }
      });
      
      // Total matching fields found
      return matchingFields;
    };
    
    // Check if field is relevant to our stored data
    const isFieldRelevant = (fieldName, fieldType) => {
      const relevantKeywords = [
        'name', 'email', 'phone', 'address', 'resume', 'cv', 'document', 
        'file', 'upload', 'profile', 'bio', 'description', 'experience',
        'education', 'skills', 'portfolio', 'work', 'company', 'position'
      ];
      
      const fieldLower = (fieldName || '').toLowerCase();
      return relevantKeywords.some(keyword => fieldLower.includes(keyword)) || 
             fieldType === 'file';
    };
    
    // Get relevance score for field
    const getFieldRelevance = (fieldName, fieldType, fieldAccept, fieldText) => {
      const fieldLower = (fieldName || '').toLowerCase();
      const acceptLower = (fieldAccept || '').toLowerCase();
      const textLower = (fieldText || '').toLowerCase();
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
      
      // Field relevance calculated
      
      return score;
    };
    
    // Show PDM permission dialog for detected fields with enhanced design
    const showPDMPermissionDialog = async (matchingFields) => {
      // Check if site already has permission
      const hasPermission = await checkExistingPermission();
      if (hasPermission) {
        // Site already has permission, auto-filling directly
        showNotification(`✅ ${getSiteName(window.location.hostname)} already has access`, 'success');
        autoFillFields(matchingFields);
        return;
      }
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: fadeIn 0.3s ease-out;
      `;
      
      const currentDomain = window.location.hostname;
      const siteName = getSiteName(currentDomain);
      
      dialog.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95));
          backdrop-filter: blur(20px);
          padding: 32px;
          border-radius: 20px;
          width: 90%;
          max-width: 620px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 
            0 25px 50px rgba(0,0,0,0.25),
            0 0 0 1px rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              font-size: 56px; 
              margin-bottom: 12px;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
            ">🔒</div>
            <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
              Nillion Vault Privacy Request
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 500;">
              We detected form fields that match your private data
            </p>
          </div>
          
          <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2);">
            <div style="font-weight: 700; margin-bottom: 8px; color: #1e40af; font-size: 16px;">
              ${isGoogleForms ? '📋 Google Form' : siteName} wants to access your private data
            </div>
            <div style="font-size: 14px; color: #3730a3; font-weight: 500;">
              <strong>Website:</strong> ${currentDomain}<br>
              <strong>Form Type:</strong> ${isGoogleForms ? 'Google Forms' : 'Standard Form'}<br>
              <strong>Detected Fields:</strong> ${matchingFields.length} relevant form fields
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Detected Form Fields:</div>
            <div style="max-height: 150px; overflow-y: auto; border: 1px solid #e1e5e9; border-radius: 4px; padding: 10px;">
              ${matchingFields.map(field => `
                <div style="
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  padding: 12px; 
                  margin-bottom: 8px;
                  background: ${field.isGoogleForm ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(52, 168, 83, 0.1))' : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.8))'};
                  border-radius: 8px;
                  border: 1px solid ${field.isGoogleForm ? 'rgba(66, 133, 244, 0.2)' : 'rgba(226, 232, 240, 0.5)'};
                  transition: all 0.2s ease;
                  cursor: pointer;
                  position: relative;
                " class="field-item" data-field-name="${field.name || 'unnamed'}" data-field-type="${field.type}">
                  <div>
                    <strong style="color: ${field.isGoogleForm ? '#1a73e8' : '#1f2937'};">${field.name || 'Unnamed field'}</strong>
                    <span style="color: #6b7280; font-size: 12px; margin-left: 8px;">(${field.type})</span>
                    ${field.isGoogleForm ? '<span style="color: #34a853; margin-left: 8px; font-size: 12px; font-weight: 600;">📋 Google Form</span>' : ''}
                  </div>
                  <div style="
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                  ">${field.relevance || field.score}/10</div>
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
        
        // Granting permission with data
        
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
    
    // Create file upload helper and auto-upload functionality
    const createFileUploadHelper = (fieldElement, matchingData, fieldName) => {
      // First, try to auto-upload the file if we have the file data
      if (matchingData.fileData && matchingData.fileData.length > 0) {
        try {

          // Validate file data
          if (!matchingData.fileData || matchingData.fileData.length === 0) {
            throw new Error('No file data available');
          }

          // Convert base64 data to blob
          let byteCharacters;
          try {
            byteCharacters = atob(matchingData.fileData);
          } catch (decodeError) {
            throw new Error('Invalid file data format');
          }

          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          // Create blob with correct MIME type
          const mimeType = matchingData.fileType || 'application/octet-stream';
          const blob = new Blob([byteArray], { type: mimeType });

          // Create File object
          const file = new File([blob], matchingData.fileName, {
            type: mimeType,
            lastModified: Date.now()
          });

          // Create FileList-like object
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          // Set the files to the input
          fieldElement.files = dataTransfer.files;

          // Trigger change event
          fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
          fieldElement.dispatchEvent(new Event('input', { bubbles: true }));

          // Visual feedback
          fieldElement.style.border = '2px solid #22c55e';
          fieldElement.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
          fieldElement.style.transition = 'all 0.3s ease';

          // Show success notification
          showNotification(`✅ Nillion Vault: Auto-uploaded ${matchingData.fileName}`, 'success');

          // Show field notification
          showFieldNotification(fieldElement, `✅ Auto-uploaded: ${matchingData.fileName}`);

          // Successfully auto-uploaded file
          return; // Exit early since we successfully auto-uploaded
          
        } catch (error) {
          console.error('❌ Nillion Vault: Auto-upload failed:', error);
          showNotification(`❌ Auto-upload failed: ${error.message}`, 'error');
          // Continue to show manual upload helper
        }
      }
      
      // If auto-upload failed or no file data, show click-to-upload helper
      createClickToUploadHelper(fieldElement, matchingData, fieldName);
    };

      // Create click-to-upload helper
    const createClickToUploadHelper = (fieldElement, matchingData, fieldName) => {
      // For Google Form upload buttons, try to click them directly
      if (fieldElement.classList.contains('uArJ5e') || fieldElement.classList.contains('cd29Sd')) {
        // Attempting to click Google Form upload button
        try {
          fieldElement.click();
          showNotification(`✅ Nillion Vault: Opened file picker for ${fieldName}`, 'success');
          return;
        } catch (error) {
          console.error('❌ Nillion Vault: Failed to click upload button:', error);
        }
      }
      
      // Create a helper container for click-to-upload
      const helperContainer = document.createElement('div');
      helperContainer.style.cssText = `
        position: relative;
        margin-top: 8px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1));
        border: 2px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        font-size: 14px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 25px rgba(245, 158, 11, 0.15);
        animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      
      helperContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            font-size: 24px; 
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
            border-radius: 8px;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          ">📄</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #92400e; font-size: 15px; margin-bottom: 4px;">
              ⚠️ Manual Upload Required
            </div>
            <div style="color: #b45309; font-size: 13px; font-weight: 500;">
              ${matchingData.fileName} • ${(matchingData.fileSize / 1024 / 1024).toFixed(2)} MB
            </div>
            <div style="color: #a16207; font-size: 12px; margin-top: 4px;">
              Click "Upload" to select your file manually
            </div>
          </div>
          <button type="button" id="nillion-upload-btn" class="nillion-upload-btn" style="
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.3px;
          ">
            📤 Upload
          </button>
        </div>
      `;
      
      // Insert after the file input
      fieldElement.parentNode.insertBefore(helperContainer, fieldElement.nextSibling);
      
      // Add click handler for upload button
      const uploadBtn = helperContainer.querySelector('#nillion-upload-btn');
      uploadBtn.addEventListener('click', function() {
        // Trigger the file input
        fieldElement.click();
        
        // Show instruction
        showNotification(`📄 Click "Choose File" and select your ${matchingData.fileName} from your device`, 'info');
        
        // Remove the helper after interaction
        setTimeout(() => {
          if (helperContainer.parentNode) {
            helperContainer.parentNode.removeChild(helperContainer);
          }
        }, 5000);
      });
      
      // Add click handler to file input
      fieldElement.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
          showNotification(`✅ File uploaded successfully!`, 'success');
          if (helperContainer.parentNode) {
            helperContainer.parentNode.removeChild(helperContainer);
          }
        }
      });
      
      // Auto-remove helper after 30 seconds
      setTimeout(() => {
        if (helperContainer.parentNode) {
          helperContainer.parentNode.removeChild(helperContainer);
        }
      }, 30000);
    };

    // Check if site already has permission
    const checkExistingPermission = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'CHECK_PERMISSION',
          domain: window.location.hostname
        });
        return response && response.hasPermission;
      } catch (error) {
        console.error('Error checking permission:', error);
        return false;
      }
    };

    // Automatically grant permission after successful auto-fill
    const autoGrantPermission = async () => {
      try {
        const hasPermission = await checkExistingPermission();
        if (!hasPermission) {
          const response = await chrome.runtime.sendMessage({
            type: 'GRANT_PERMISSION',
            payload: {
              domain: window.location.hostname,
              siteName: getSiteName(window.location.hostname),
              permissions: ['auto-fill'],
              description: 'Auto-fill access granted after successful form completion'
            }
          });
          
          if (response && response.success) {
            console.log('✅ Permission automatically granted to', window.location.hostname);
          }
        }
      } catch (error) {
        console.error('Error auto-granting permission:', error);
      }
    };

    // Auto-fill form fields with stored data
    const autoFillFields = async (matchingFields) => {
      
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

          let filledCount = 0;
          
          matchingFields.forEach((field, index) => {
            try {
              const fieldElement = field.element;
              const fieldName = (field.name || '').toLowerCase();
              const fieldType = field.type;

              // Processing field

              // Find matching data based on field name and type
              let matchingData = null;
              let fillValue = '';

              if (!fieldElement) {
                return;
              }

              // Looking for data matching field
            
            // Match by field name patterns - check both name and content
            if (fieldName.includes('name') || fieldName.includes('fullname') || fieldName.includes('firstname') || fieldName.includes('lastname')) {
              matchingData = storedData.find(d =>
                (d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('name') ||
                  d.name.toLowerCase().includes('personal') ||
                  d.name.toLowerCase().includes('information')
                )) ||
                (d.content && d.content.toLowerCase && (
                  d.content.toLowerCase().includes('name') ||
                  d.content.toLowerCase().includes('personal')
                ))
              );
              fillValue = matchingData ? (matchingData.content || matchingData.name) : '';
            }
            else if (fieldName.includes('phone') || fieldName.includes('mobile') || fieldName.includes('telephone') || fieldName.includes('number')) {
              matchingData = storedData.find(d =>
                (d.content && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(d.content)) ||
                (d.name && d.name.toLowerCase && d.name.toLowerCase().includes('phone')) ||
                (d.content && d.content.toLowerCase && d.content.toLowerCase().includes('phone'))
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('email') || fieldName.includes('e-mail')) {
              matchingData = storedData.find(d =>
                (d.content && d.content.includes('@')) ||
                (d.name && d.name.toLowerCase && d.name.toLowerCase().includes('email')) ||
                (d.content && d.content.toLowerCase && d.content.toLowerCase().includes('email'))
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('address') || fieldName.includes('location')) {
              matchingData = storedData.find(d =>
                (d.name && d.name.toLowerCase && d.name.toLowerCase().includes('address')) ||
                (d.content && d.content.length > 10 && d.content.includes(' '))
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('resume') || fieldName.includes('cv') || fieldName.includes('curriculum') || fieldName.includes('upload') || fieldName.includes('file') || fieldName.includes('document')) {
              matchingData = storedData.find(d =>
                (d.fileInfo && d.fileInfo.name && d.fileInfo.name.toLowerCase && (
                  d.fileInfo.name.toLowerCase().includes('resume') ||
                  d.fileInfo.name.toLowerCase().includes('cv') ||
                  d.fileInfo.name.toLowerCase().includes('document') ||
                  d.fileInfo.name.toLowerCase().includes('pdf') ||
                  d.fileInfo.name.toLowerCase().includes('doc')
                )) ||
                (d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('resume') ||
                  d.name.toLowerCase().includes('cv') ||
                  d.name.toLowerCase().includes('document')
                )) ||
                (d.content && d.content.toLowerCase && (
                  d.content.toLowerCase().includes('resume') ||
                  d.content.toLowerCase().includes('cv') ||
                  d.content.toLowerCase().includes('document')
                ))
              );
              // File field match result
            }
            else if (fieldName.includes('description') || fieldName.includes('bio') || fieldName.includes('about') || fieldName.includes('summary')) {
              matchingData = storedData.find(d => 
                d.type === 'text' && 
                d.content && 
                d.content.length > 20 &&
                (d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('description') || 
                  d.name.toLowerCase().includes('bio') ||
                  d.name.toLowerCase().includes('about')
                ))
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('experience') || fieldName.includes('work') || fieldName.includes('employment')) {
              matchingData = storedData.find(d => 
                d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('experience') ||
                  d.name.toLowerCase().includes('work') ||
                  d.name.toLowerCase().includes('employment')
                )
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('education') || fieldName.includes('degree') || fieldName.includes('university')) {
              matchingData = storedData.find(d => 
                d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('education') ||
                  d.name.toLowerCase().includes('degree') ||
                  d.name.toLowerCase().includes('university')
                )
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            else if (fieldName.includes('skills') || fieldName.includes('competencies')) {
              matchingData = storedData.find(d => 
                d.name && d.name.toLowerCase && (
                  d.name.toLowerCase().includes('skills') ||
                  d.name.toLowerCase().includes('competencies')
                )
              );
              fillValue = matchingData ? matchingData.content : '';
            }
            
            // Handle file uploads
            if ((fieldElement.type === 'file' || 
                 fieldElement.getAttribute('accept') || 
                 fieldElement.getAttribute('data-testid')?.includes('file') || 
                 fieldName.toLowerCase().includes('resume') || 
                 fieldName.toLowerCase().includes('cv') || 
                 fieldName.toLowerCase().includes('document') || 
                 fieldName.toLowerCase().includes('upload') ||
                 fieldName.toLowerCase().includes('file') ||
                 fieldElement.closest('[role="button"]') ||
                 fieldElement.closest('.freebirdFormviewerComponentsQuestionFileuploadInput') ||
                 fieldElement.classList.contains('uArJ5e') ||
                 fieldElement.classList.contains('cd29Sd')) && matchingData && (matchingData.fileInfo || matchingData.fileName)) {
              // File field detected

              // Create a file upload helper
              createFileUploadHelper(fieldElement, matchingData, fieldName);
              filledCount++;
            }
            // Handle text inputs
            else if (fillValue && (fieldElement.type === 'text' || fieldElement.type === 'email' || fieldElement.type === 'tel' || fieldElement.type === 'url' || fieldElement.tagName === 'TEXTAREA')) {
              
              // Set the value
              fieldElement.value = fillValue;
              
              // Add visual feedback class
              fieldElement.classList.add('nillion-field-filled');
              
              // Trigger change event for form validation
              fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
              fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Show field notification
              showFieldNotification(fieldElement, `✅ Auto-filled with: ${matchingData.name}`);
              filledCount++;
            }
            else if (!matchingData) {
              
              // Fallback: try to find any suitable data for this field type
              let fallbackData = null;
              if (fieldName.includes('name') || fieldName.includes('fullname')) {
                fallbackData = storedData.find(d => d.name && d.name.toLowerCase && d.name.toLowerCase().includes('personal'));
              } else if (fieldName.includes('email')) {
                fallbackData = storedData.find(d => d.content && d.content.includes('@'));
              } else if (fieldName.includes('phone')) {
                fallbackData = storedData.find(d => d.content && /\d/.test(d.content));
              } else if (fieldName.includes('address')) {
                fallbackData = storedData.find(d => d.content && d.content.length > 10);
              }
              
              if (fallbackData && fallbackData.content && (fieldElement.type === 'text' || fieldElement.type === 'email' || fieldElement.type === 'tel' || fieldElement.type === 'url' || fieldElement.tagName === 'TEXTAREA')) {
                fieldElement.value = fallbackData.content;
                fieldElement.classList.add('nillion-field-filled');
                fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
                fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
                showFieldNotification(fieldElement, `✅ Auto-filled with fallback: ${fallbackData.name}`);
                filledCount++;
              }
            }
            } catch (error) {
              console.error('❌ Error processing field:', fieldName, error);
              // Continue with next field instead of failing completely
            }
          });

          // Show summary notification
          if (filledCount > 0) {
            showNotification(`✅ Nillion Vault auto-filled ${filledCount} fields with your data`, 'success');
            
            // Automatically grant permission to this site if auto-fill was successful
            await autoGrantPermission();
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
    
    // Show notification with enhanced design
    const showNotification = (message, type = 'info') => {
      const notification = document.createElement('div');
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
      
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, 
          ${type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 
            type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 
            type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 
            'rgba(59, 130, 246, 0.95)'}, 
          ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
            type === 'error' ? 'rgba(220, 38, 38, 0.95)' : 
            type === 'warning' ? 'rgba(251, 191, 36, 0.95)' : 
            'rgba(37, 99, 235, 0.95)'});
        backdrop-filter: blur(20px);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        box-shadow: 
          0 20px 40px rgba(0,0,0,0.15),
          0 0 0 1px rgba(255,255,255,0.1);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
      `;
      
      notification.innerHTML = `
        <div style="font-size: 20px; flex-shrink: 0;">${icon}</div>
        <div style="flex: 1; line-height: 1.4;">${message}</div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 6 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 6000);
    };
    
    // Enhanced detection for upload areas and buttons
    const detectUploadAreas = () => {
      let uploadAreas;
      
      if (isGoogleForms) {
        // Google Forms specific upload selectors
        uploadAreas = document.querySelectorAll(`
          .freebirdFormviewerComponentsQuestionFileuploadInput,
          .freebirdFormviewerComponentsQuestionFileuploadDropzone,
          .quantumWizFileuploadPaperuploadInput,
          .quantumWizFileuploadPaperuploadDropzone,
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
        // Found Google Forms upload areas
      } else {
        // Standard upload area detection
        uploadAreas = document.querySelectorAll(`
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
        // Found standard upload areas
      }
      
      const uploadFields = [];
      uploadAreas.forEach(area => {
        const text = (area.textContent || area.innerText || '').toLowerCase();
        const className = (typeof area.className === 'string' ? area.className : (area.className && area.className.toString ? area.className.toString() : '') || '').toLowerCase();
        const id = (area.id || '').toLowerCase();
        
        // For Google Forms, also check for question text
        let areaName = area.id || area.className || 'upload-area';
        if (isGoogleForms) {
          const questionElement = area.closest('.freebirdFormviewerComponentsQuestionBaseRoot') || 
                                 area.closest('.quantumWizFileuploadPaperuploadRoot');
          
          if (questionElement) {
            const labelElement = questionElement.querySelector(`
              .freebirdFormviewerComponentsQuestionBaseTitle,
              .quantumWizFileuploadPaperuploadLabel,
              .freebirdFormviewerComponentsQuestionBaseTitleText,
              [role="heading"]
            `);
            if (labelElement) {
              areaName = labelElement.textContent.trim() || areaName;
            }
          }
        }
        
        // Check if this looks like an upload area
        if (text.includes('upload') || text.includes('resume') || text.includes('cv') || 
            text.includes('document') || text.includes('file') || text.includes('drop') ||
            className.includes('upload') || className.includes('drop') || className.includes('file') ||
            id.includes('upload') || id.includes('file') || id.includes('resume') || id.includes('cv')) {
          
          // Upload area found
          
          uploadFields.push({
            element: area,
            name: areaName,
            type: 'upload-area',
            relevance: 8,
            isGoogleForm: isGoogleForms
          });
        }
      });
      
      return uploadFields;
    };
    
    // Track if permission dialog has been shown for this page
    let permissionDialogShown = false;
    let dialogShownForCurrentPage = false;
    
    // Monitor for form changes and new fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const matchingFields = detectMatchingFields();
          const uploadAreas = detectUploadAreas();
          const allFields = [...matchingFields, ...uploadAreas];

          if (allFields.length > 0 && !dialogShownForCurrentPage) {
            dialogShownForCurrentPage = true;
            setTimeout(() => {
              showPDMPermissionDialog(allFields);
            }, 1000); // Small delay to let page load
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

      // Initial detection complete

      if (allFields.length > 0 && !dialogShownForCurrentPage) {
        dialogShownForCurrentPage = true;
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
  
  // Nillion Vault API injected into page
  
  // Start smart field detection with error handling
  try {
    smartFieldDetection();
  } catch (error) {
    console.error('❌ Error in smart field detection:', error);
    // Continue execution even if field detection fails
  }
  
  // Note: Nillion API loading removed to prevent CSP violations
  // The API functionality is handled through the background script and message passing
})();
