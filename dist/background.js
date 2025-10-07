// Background script for Nillion Vault extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Nillion Vault extension installed/updated');
  
  if (details.reason === 'install') {
    // Open welcome page or show onboarding
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
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
      console.log('Permission request received:', request.payload);
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
      console.log('DID request received');
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
      console.log('Get data request:', request.payload);
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
      console.log('Set data request:', request.payload);
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
      console.log('Delete data request:', request.payload);
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
      // Handle list data requests
      console.log('List data request received');
      sendResponse({
        success: true,
        data: [
          {
            id: 'demo-data-1',
            name: 'Demo Document',
            type: 'document',
            createdAt: new Date().toISOString()
          },
          {
            id: 'demo-data-2',
            name: 'Demo Image',
            type: 'image',
            createdAt: new Date().toISOString()
          }
        ]
      });
      break;
      
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
      console.log('Activity logged:', request.data);
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
      console.log('Could not inject content script:', err);
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this is handled by manifest action)
  console.log('Extension icon clicked');
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes, namespace);
  
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

console.log('Nillion Vault background script loaded');
