// Background script for Nillion Vault extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nillion Vault extension installed/updated');

  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.local.set({
      settings: {
        autoLock: true,
        lockTimeout: 15, // minutes
        biometricAuth: false,
        passphraseAuth: true,
        auditLogging: true,
        granularPermissions: true,
        offlineMode: true,
        autoSync: true
      },
      activityLogs: [],
      userIdentities: [],
      permissions: [],
      offlineCache: [],
      syncQueue: []
    });

    // Open welcome page for API key configuration
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Offline mode and caching
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CACHE_DATA':
      // Cache data for offline access
      chrome.storage.local.get(['offlineCache'], (result) => {
        const cache = result.offlineCache || [];
        cache.push({
          id: request.data.id,
          type: request.data.type,
          data: request.data.data,
          timestamp: Date.now(),
          synced: false
        });
        
        // Keep only last 1000 cached items
        if (cache.length > 1000) {
          cache.splice(0, cache.length - 1000);
        }
        
        chrome.storage.local.set({ offlineCache: cache });
        sendResponse({ success: true });
      });
      return true;

    case 'GET_CACHED_DATA':
      // Retrieve cached data
      chrome.storage.local.get(['offlineCache'], (result) => {
        const cache = result.offlineCache || [];
        const filtered = cache.filter(item => 
          !request.filters || 
          (request.filters.type ? item.type === request.filters.type : true)
        );
        sendResponse({ success: true, data: filtered });
      });
      return true;

    case 'SYNC_QUEUE':
      // Add item to sync queue for when online
      chrome.storage.local.get(['syncQueue'], (result) => {
        const queue = result.syncQueue || [];
        queue.push({
          action: request.action,
          data: request.data,
          timestamp: Date.now()
        });
        chrome.storage.local.set({ syncQueue: queue });
        sendResponse({ success: true });
      });
      return true;
  }
});

// Handle extension icon click - redirect to welcome page if not initialized
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if vault is initialized
    const result = await chrome.storage.local.get(['vault_initialized']);

    if (!result.vault_initialized) {
      // Vault not initialized - redirect to welcome page for setup
      chrome.tabs.create({
        url: chrome.runtime.getURL('welcome.html')
      });
    }
    // If vault is initialized, the default popup will open
  } catch (error) {
    console.error('Error checking vault initialization:', error);
    // On error, redirect to welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Background received message
  
  switch (request.type) {
    case 'GET_EXTENSION_INFO':
      sendResponse({
        success: true,
        data: {
          version: chrome.runtime.getManifest().version,
          name: chrome.runtime.getManifest().name,
          id: chrome.runtime.id
        }
      });
      break;
      
    case 'FORWARD_TO_POPUP':
      // Forward message to popup for processing
      chrome.runtime.sendMessage(request.originalMessage, (response) => {
        if (response) {
          sendResponse(response);
        } else {
          sendResponse({ success: false, error: 'No response from popup' });
        }
      });
      break;
      
    case 'PDM_REQUEST_PERMISSION':
      // Handle permission requests
      // Permission request received
      sendResponse({
        success: true,
        data: {
          appId: request.payload.appId,
          appName: request.payload.appName,
          permissions: request.payload.permissions,
          granted: true,
          message: 'Permission granted for demo'
        }
      });
      break;
      
    case 'PDM_GET_DID':
      // Handle DID requests
      // DID request received
      sendResponse({
        success: true,
        data: {
          id: 'did:nillion:demo-' + Date.now(),
          publicKey: 'demo-public-key',
          privateKey: 'demo-private-key',
          createdAt: new Date().toISOString()
        }
      });
      break;
      
    case 'PDM_GET_DATA':
      // Handle get data requests
      // Get data request
      sendResponse({
        success: true,
        data: {
          id: request.payload.dataId,
          content: { message: 'Demo data from Nillion network' },
          type: 'document',
          createdAt: new Date().toISOString()
        }
      });
      break;
      
    case 'PDM_SET_DATA':
      // Handle set data requests
      // Set data request
      sendResponse({
        success: true,
        data: {
          id: request.payload.dataId,
          stored: true,
          encrypted: true,
          timestamp: new Date().toISOString()
        }
      });
      break;
      
    case 'PDM_DELETE_DATA':
      // Handle delete data requests
      // Delete data request
      sendResponse({
        success: true,
        data: {
          id: request.payload.dataId,
          deleted: true,
          timestamp: new Date().toISOString()
        }
      });
      break;
      
    case 'PDM_LIST_DATA':
    case 'LIST_DATA':
      // Handle list data requests - get real data from storage
      // List data request received
      chrome.storage.local.get(['nillion_data'], (result) => {
        const storedData = result.nillion_data || [];
        sendResponse({
          success: true,
          data: storedData
        });
      });
      return true; // Indicate async response
      
    case 'CHECK_PERMISSION':
      // Check if a domain already has permission
      // Checking permission for domain
      chrome.storage.local.get(['permissions'], (result) => {
        const permissions = result.permissions || [];
        const hasPermission = permissions.some(perm => 
          perm.domain === request.domain || perm.siteName === request.domain
        );
        sendResponse({
          hasPermission: hasPermission
        });
      });
      return true; // Indicate async response
      
    case 'GRANT_PERMISSION':
      // Grant permission for a website
      // GRANT_PERMISSION received
      const { appId: grantAppId, siteName: grantSiteName, domain: grantDomain, permissions: grantPermissions, description: grantDescription } = request.payload;
      
      // Store permission in local storage
      chrome.storage.local.get(['permissions'], (result) => {
        const permissionsList = result.permissions || [];
        const newPermission = {
          id: grantAppId,
          siteName: grantSiteName,
          domain: grantDomain,
          permissions: grantPermissions,
          description: grantDescription,
          grantedAt: new Date().toISOString()
        };
        
        // Remove existing permission for this domain
        const filteredPermissions = permissionsList.filter(p => p.domain !== grantDomain);
        filteredPermissions.push(newPermission);
        
        chrome.storage.local.set({ permissions: filteredPermissions }, () => {
          sendResponse({ success: true, permission: newPermission });
        });
      });
      return true; // Indicate async response
      
    case 'NOTIFY_PERMISSION_REQUEST':
      // Show notification for permission requests
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Permission Request',
        message: `${request.appName} is requesting access to your private data`
      });
      break;
      
    case 'LOG_ACTIVITY':
      // Log activity for audit trail
      // Activity logged

      // Store in activity logs
      chrome.storage.local.get(['activityLogs'], (result) => {
        const logs = result.activityLogs || [];
        logs.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: request.data.type || 'unknown',
          action: request.data.action,
          details: request.data.details,
          userAgent: navigator.userAgent,
          url: request.data.url || 'unknown'
        });

        // Keep only last 1000 entries
        if (logs.length > 1000) {
          logs.splice(1000);
        }

        chrome.storage.local.set({ activityLogs: logs });
      });
      break;

    case 'BIOMETRIC_AUTH':
      // Handle biometric authentication requests
      // Biometric auth requested
      try {
        // Check if WebAuthn is available
        if (!navigator.credentials || !navigator.credentials.get) {
          sendResponse({ success: false, error: 'Biometric authentication not supported' });
          return;
        }

        // This would be implemented with actual WebAuthn
        sendResponse({ success: false, error: 'Biometric authentication not yet implemented' });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'PASSWORD_AUTH':
      // Handle password authentication
      // Password auth requested
      chrome.storage.local.get(['vault_password'], (result) => {
        const storedPassword = result.vault_password;
        const providedPassword = request.password;

        if (storedPassword && storedPassword === providedPassword) {
          sendResponse({ success: true, authenticated: true });
        } else {
          sendResponse({ success: false, error: 'Invalid password' });
        }
      });
      return true;
      break;

    case 'SET_PASSWORD':
      // Set new password (hash it for security)
      // Setting new password
      // In a real implementation, you would hash the password
      // For demo purposes, we'll store it as-is but this should be hashed
      chrome.storage.local.set({ vault_password: request.password });
      sendResponse({ success: true });
      break;

    case 'GET_IDENTITIES':
      // Get user identities
      chrome.storage.local.get(['userIdentities'], (result) => {
        sendResponse({ success: true, identities: result.userIdentities || [] });
      });
      return true;
      break;

    case 'CREATE_IDENTITY':
      // Create new identity
      // Creating new identity
      const newIdentity = {
        id: 'did:nillion:' + Date.now(),
        name: request.name,
        createdAt: new Date().toISOString(),
        active: true
      };

      chrome.storage.local.get(['userIdentities'], (result) => {
        const identities = result.userIdentities || [];
        identities.push(newIdentity);
        chrome.storage.local.set({ userIdentities: identities });

        // Log activity
        chrome.runtime.sendMessage({
          type: 'LOG_ACTIVITY',
          data: {
            type: 'identity',
            action: 'create',
            details: `Created identity: ${newIdentity.name}`
          }
        });

        sendResponse({ success: true, identity: newIdentity });
      });
      return true;
      break;

    case 'GET_PERMISSIONS':
      // Get granular permissions
      chrome.storage.local.get(['permissions'], (result) => {
        sendResponse({ success: true, permissions: result.permissions || [] });
      });
      return true;
      break;

    case 'GRANT_PERMISSION':
      // Grant granular permission
      // GRANT_PERMISSION received
      const { appId: granularAppId, siteName: granularSiteName, domain: granularDomain, permissions: granularPermissions, description: granularDescription, documentId } = request.payload;

      chrome.storage.local.get(['permissions'], (result) => {
        const permissionsList = result.permissions || [];
        const newPermission = {
          id: Date.now(),
          appId: granularAppId,
          siteName: granularSiteName,
          domain: granularDomain,
          permissions: granularPermissions,
          description: granularDescription,
          documentId: documentId,
          grantedAt: new Date().toISOString(),
          status: 'active'
        };

        permissionsList.push(newPermission);
        chrome.storage.local.set({ permissions: permissionsList });

        // Log activity
        chrome.runtime.sendMessage({
          type: 'LOG_ACTIVITY',
          data: {
            type: 'permission',
            action: 'grant',
            details: `Granted ${granularPermissions.join(', ')} to ${granularSiteName} for ${documentId || 'all documents'}`
          }
        });

        sendResponse({ success: true, permission: newPermission });
      });
      return true;
      break;

    case 'REVOKE_PERMISSION':
      // Revoke granular permission
      // REVOKE_PERMISSION received

      chrome.storage.local.get(['permissions'], (result) => {
        const permissionsList = result.permissions || [];
        const updatedPermissions = permissionsList.map(p => {
          if (p.id === request.permissionId) {
            return { ...p, status: 'revoked', revokedAt: new Date().toISOString() };
          }
          return p;
        });

        chrome.storage.local.set({ permissions: updatedPermissions });

        // Log activity
        chrome.runtime.sendMessage({
          type: 'LOG_ACTIVITY',
          data: {
            type: 'permission',
            action: 'revoke',
            details: `Revoked permission ${request.permissionId}`
          }
        });

        sendResponse({ success: true });
      });
      return true;
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Inject content script on all pages
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Ignore errors for chrome:// pages and other restricted URLs
      // Could not inject content script
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this is handled by manifest action)
  // Extension icon clicked
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Storage changed
  
  // Sync changes across extension components
  if (changes.settings) {
    // Notify popup of settings changes
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      data: changes.settings.newValue
    }).catch(() => {
      // Ignore if no listeners
    });
  }
});

// Handle alarms for auto-lock
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'auto-lock') {
    // Lock the extension
    chrome.storage.local.set({ locked: true, lockTime: Date.now() });
    
    // Notify popup to show lock screen
    chrome.runtime.sendMessage({
      type: 'AUTO_LOCK'
    }).catch(() => {
      // Ignore if no listeners
    });
  }
});

// Set up auto-lock alarm
function setupAutoLock(timeoutMinutes) {
  chrome.alarms.clear('auto-lock');
  if (timeoutMinutes > 0) {
    chrome.alarms.create('auto-lock', {
      delayInMinutes: timeoutMinutes
    });
  }
}

// Listen for settings changes to update auto-lock
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    const settings = changes.settings.newValue;
    if (settings.autoLock && settings.lockTimeout) {
      setupAutoLock(settings.lockTimeout);
    }
  }
});

// Initialize auto-lock on startup
chrome.storage.local.get(['settings'], (result) => {
  if (result.settings && result.settings.autoLock && result.settings.lockTimeout) {
    setupAutoLock(result.settings.lockTimeout);
  }
});

// Nillion Vault background script loaded
