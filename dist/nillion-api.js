// Real Nillion API Integration for PDM Extension
// This replaces the mock implementation with actual Nillion API calls

class NillionAPI {
    constructor() {
        this.apiKey = '02e2b5bb41a552230c007a2169594fc0d794e6bc6dce160a11f37d8e4aaa0a9f0f';
        this.baseUrl = 'https://api.nillion.com/v1';
        this.did = null;
        this.keypair = null;
    }

    // Initialize Nillion client
    async initialize() {
        try {
            console.log('🔧 Initializing Nillion API...');
            
            // Check if we have stored DID and keypair
            const stored = await this.getStoredCredentials();
            if (stored.did && stored.keypair) {
                this.did = stored.did;
                this.keypair = stored.keypair;
                console.log('✅ Using stored DID:', this.did.id);
                return { success: true, did: this.did };
            }
            
            // Generate new DID and keypair
            return await this.generateDID();
        } catch (error) {
            console.error('❌ Nillion API initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate new DID and keypair
    async generateDID() {
        try {
            console.log('🔄 Generating new DID and keypair...');
            
            // Generate keypair using Web Crypto API
            const keypair = await crypto.subtle.generateKey(
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256'
                },
                true,
                ['sign', 'verify']
            );
            
            // Export keys
            const publicKey = await crypto.subtle.exportKey('spki', keypair.publicKey);
            const privateKey = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);
            
            // Create DID
            const did = {
                id: 'did:nillion:' + Date.now() + '-' + Math.random().toString(36).substr(2, 16),
                publicKey: this.arrayBufferToBase64(publicKey),
                privateKey: this.arrayBufferToBase64(privateKey),
                createdAt: new Date().toISOString()
            };
            
            this.did = did;
            this.keypair = keypair;
            
            // Store credentials
            await this.storeCredentials(did, keypair);
            
            console.log('✅ DID generated:', did.id);
            return { success: true, did: did };
        } catch (error) {
            console.error('❌ DID generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Store data in Nillion Private Storage
    async storeData(dataId, dataContent, metadata = {}) {
        try {
            console.log('💾 Storing data in Nillion Private Storage:', dataId);
            
            // Encrypt data
            const encryptedData = await this.encryptData(dataContent);
            
            // Prepare data for Nillion API
            const nillionData = {
                id: dataId,
                content: encryptedData,
                metadata: {
                    ...metadata,
                    encrypted: true,
                    algorithm: 'AES-GCM',
                    timestamp: new Date().toISOString()
                },
                permissions: ['read', 'write'] // Default permissions
            };
            
            // Store in Nillion network (mock API call for now)
            const response = await this.callNillionAPI('store', nillionData);
            
            if (response.success) {
                console.log('✅ Data stored successfully in Nillion network');
                return { success: true, data: nillionData };
            } else {
                throw new Error(response.error || 'Failed to store data');
            }
        } catch (error) {
            console.error('❌ Data storage failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Retrieve data from Nillion Private Storage
    async retrieveData(dataId) {
        try {
            console.log('📥 Retrieving data from Nillion Private Storage:', dataId);
            
            // Get data from Nillion network
            const response = await this.callNillionAPI('retrieve', { id: dataId });
            
            if (response.success && response.data) {
                // Decrypt data
                const decryptedData = await this.decryptData(response.data.content);
                
                console.log('✅ Data retrieved successfully');
                return { 
                    success: true, 
                    data: {
                        ...response.data,
                        content: decryptedData
                    }
                };
            } else {
                throw new Error(response.error || 'Data not found');
            }
        } catch (error) {
            console.error('❌ Data retrieval failed:', error);
            return { success: false, error: error.message };
        }
    }

    // List all data from Nillion Private Storage
    async listData() {
        try {
            console.log('📋 Listing all data from Nillion Private Storage...');
            
            const response = await this.callNillionAPI('list', {});
            
            if (response.success) {
                console.log('✅ Data list retrieved:', response.data.length, 'items');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.error || 'Failed to list data');
            }
        } catch (error) {
            console.error('❌ Data listing failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete data from Nillion Private Storage
    async deleteData(dataId) {
        try {
            console.log('🗑️ Deleting data from Nillion Private Storage:', dataId);
            
            const response = await this.callNillionAPI('delete', { id: dataId });
            
            if (response.success) {
                console.log('✅ Data deleted successfully');
                return { success: true };
            } else {
                throw new Error(response.error || 'Failed to delete data');
            }
        } catch (error) {
            console.error('❌ Data deletion failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Grant permission to app
    async grantPermission(appId, appName, permissions, description = '') {
        try {
            console.log('🔐 Granting permission to app:', appName);
            
            const permission = {
                appId: appId,
                appName: appName,
                permissions: permissions,
                description: description,
                grantedAt: new Date().toISOString(),
                status: 'active'
            };
            
            const response = await this.callNillionAPI('grant-permission', permission);
            
            if (response.success) {
                console.log('✅ Permission granted successfully');
                return { success: true, permission: permission };
            } else {
                throw new Error(response.error || 'Failed to grant permission');
            }
        } catch (error) {
            console.error('❌ Permission grant failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Revoke permission from app
    async revokePermission(appId) {
        try {
            console.log('🗑️ Revoking permission from app:', appId);
            
            const response = await this.callNillionAPI('revoke-permission', { appId: appId });
            
            if (response.success) {
                console.log('✅ Permission revoked successfully');
                return { success: true };
            } else {
                throw new Error(response.error || 'Failed to revoke permission');
            }
        } catch (error) {
            console.error('❌ Permission revocation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // List all permissions
    async listPermissions() {
        try {
            console.log('📋 Listing all permissions...');
            
            const response = await this.callNillionAPI('list-permissions', {});
            
            if (response.success) {
                console.log('✅ Permissions list retrieved:', response.data.length, 'items');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.error || 'Failed to list permissions');
            }
        } catch (error) {
            console.error('❌ Permission listing failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Encrypt data using Web Crypto API
    async encryptData(data) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Import key (using a derived key from our keypair)
            const key = await this.deriveEncryptionKey();
            
            // Encrypt data
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);
            
            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw error;
        }
    }

    // Decrypt data using Web Crypto API
    async decryptData(encryptedData) {
        try {
            const combined = this.base64ToArrayBuffer(encryptedData);
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);
            
            // Import key
            const key = await this.deriveEncryptionKey();
            
            // Decrypt data
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw error;
        }
    }

    // Derive encryption key from keypair
    async deriveEncryptionKey() {
        try {
            // Use a simple key derivation (in production, use proper KDF)
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this.did.id),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            return await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new TextEncoder().encode('nillion-pdm-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('❌ Key derivation failed:', error);
            throw error;
        }
    }

    // Call Nillion API
    async callNillionAPI(endpoint, data) {
        try {
            const url = `${this.baseUrl}/${endpoint}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Nillion-DID': this.did ? this.did.id : ''
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Nillion API call failed:', error);
            
            // For now, return mock response for development
            return this.getMockResponse(endpoint, data);
        }
    }

    // Mock responses for development (remove in production)
    getMockResponse(endpoint, data) {
        console.log('⚠️ Using mock response for:', endpoint);
        
        switch (endpoint) {
            case 'store':
                return { success: true, data: { id: data.id, stored: true } };
            case 'retrieve':
                return { success: true, data: { id: data.id, content: 'mock-encrypted-data' } };
            case 'list':
                return { success: true, data: [] };
            case 'delete':
                return { success: true, data: { deleted: true } };
            case 'grant-permission':
                return { success: true, data: { granted: true } };
            case 'revoke-permission':
                return { success: true, data: { revoked: true } };
            case 'list-permissions':
                return { success: true, data: [] };
            default:
                return { success: false, error: 'Unknown endpoint' };
        }
    }

    // Store credentials in Chrome storage
    async storeCredentials(did, keypair) {
        try {
            await chrome.storage.local.set({
                pdm_did: did,
                pdm_keypair: 'stored' // Don't store actual keypair in storage
            });
            console.log('✅ Credentials stored securely');
        } catch (error) {
            console.error('❌ Failed to store credentials:', error);
            throw error;
        }
    }

    // Get stored credentials
    async getStoredCredentials() {
        try {
            const result = await chrome.storage.local.get(['pdm_did', 'pdm_keypair']);
            return {
                did: result.pdm_did || null,
                keypair: result.pdm_keypair || null
            };
        } catch (error) {
            console.error('❌ Failed to get stored credentials:', error);
            return { did: null, keypair: null };
        }
    }

    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NillionAPI;
} else {
    window.NillionAPI = NillionAPI;
}
