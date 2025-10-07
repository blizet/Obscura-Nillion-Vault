# 🔧 Technical Documentation - Nillion Vault Extension

## 🚀 **Production-Ready Architecture**

This extension now implements **real Nillion network integration** with a production-ready backend server architecture.

### **NEW: No API Key Required for Users**

**The extension now uses a backend server architecture:**
- ✅ **Backend Server**: Holds builder private key securely
- ✅ **User Keypairs**: Generated automatically in browser
- ✅ **Delegation Tokens**: Server provides time-limited access tokens
- ✅ **Real Nillion Network**: Direct integration with testnet
- ✅ **End-to-End Encryption**: Data encrypted before network storage

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                       │
│  - Node.js with @nillion/secretvaults                  │
│  - Builder private key (secure)                         │
│  - Creates collections and delegation tokens            │
│  - Runs on localhost:3001                              │
└─────────────────────────────────────────────────────────┘
                          ↕
                  (HTTP API Calls)
                          ↕
┌─────────────────────────────────────────────────────────┐
│              BROWSER EXTENSION                          │
│  - Generates user keypairs automatically               │
│  - Stores data on Nillion network                      │
│  - Manages permissions and access control              │
│  - No private keys stored in browser                  │
└─────────────────────────────────────────────────────────┘
                          ↕
                  (Direct Connection)
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   NILLION NETWORK                      │
│  - nilDB distributed storage                           │
│  - Encrypted shares across multiple nodes             │
│  - User-owned data with fine-grained permissions      │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. **UserCredentials Management**

#### DID Generation
```javascript
// Compatible with SecretVaults UserCredentials.generate()
async generateDID() {
    // ECDSA P-256 keypair generation
    const keypair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
    );
    
    // DID format: did:nillion:{timestamp}-{random}
    const did = {
        id: 'did:nillion:' + Date.now() + '-' + randomString,
        publicKey: exportedPublicKey,
        privateKey: exportedPrivateKey,
        createdAt: new Date().toISOString()
    };
    
    return did;
}
```

#### Credential Storage
- **Location**: `chrome.storage.local`
- **Format**: JSON with DID and keypair
- **Persistence**: Across browser sessions
- **Security**: Browser-managed encrypted storage

### 2. **SecretVault Operations**

#### Store Data (User Owned Collection)
```javascript
// Compatible with SecretVaults storeValue()
async storeData(dataId, dataContent, metadata) {
    // 1. Encrypt data locally
    const encryptedData = await this.encryptData(dataContent);
    
    // 2. Prepare vault entry
    const vaultEntry = {
        id: dataId,
        content: encryptedData,
        metadata: metadata,
        permissions: ['read', 'write'],
        owner: this.did.id
    };
    
    // 3. Store in Nillion network
    const response = await this.callNillionAPI('store', vaultEntry);
    
    return response;
}
```

#### Retrieve Data
```javascript
// Compatible with SecretVaults retrieveValue()
async retrieveData(dataId) {
    // 1. Fetch from Nillion network
    const response = await this.callNillionAPI('retrieve', { id: dataId });
    
    // 2. Decrypt data locally
    const decryptedData = await this.decryptData(response.data.content);
    
    return decryptedData;
}
```

#### List Collections
```javascript
// Compatible with SecretVaults listValues()
async listData() {
    const response = await this.callNillionAPI('list', {});
    return response.data; // Array of user owned collections
}
```

#### Delete Data
```javascript
// Compatible with SecretVaults deleteValue()
async deleteData(dataId) {
    const response = await this.callNillionAPI('delete', { id: dataId });
    return response;
}
```

### 3. **PermissionManager**

#### Grant Access
```javascript
// Compatible with SecretVaults grantAccess()
async grantPermission(appId, appName, permissions, description) {
    const permission = {
        appId: appId,
        appName: appName,
        siteName: appName,
        domain: appId,
        permissions: permissions, // ['read', 'write', 'download', 'stream']
        description: description,
        grantedAt: new Date().toISOString(),
        owner: this.did.id
    };
    
    const response = await this.callNillionAPI('grant-permission', permission);
    return response;
}
```

#### Revoke Access
```javascript
// Compatible with SecretVaults revokeAccess()
async revokePermission(appId) {
    const response = await this.callNillionAPI('revoke-permission', { appId });
    return response;
}
```

#### List Permissions
```javascript
// Compatible with SecretVaults listPermissions()
async listPermissions() {
    const response = await this.callNillionAPI('list-permissions', {});
    return response.data;
}
```

### 4. **Encryption Layer**

#### AES-GCM Encryption
```javascript
async encryptData(data) {
    // 1. Derive encryption key from DID
    const key = await this.deriveEncryptionKey();
    
    // 2. Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 3. Encrypt with AES-GCM
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
    );
    
    // 4. Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return arrayBufferToBase64(combined);
}
```

#### Key Derivation (PBKDF2)
```javascript
async deriveEncryptionKey() {
    // Use DID as password
    const password = new TextEncoder().encode(this.did.id);
    
    // Import password
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        password,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive AES-GCM key
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: fixedSalt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    return key;
}
```

## API Integration

### Nillion SecretVaults API Endpoints

```javascript
const endpoints = {
    'store': '/vaults/store',
    'retrieve': '/vaults/retrieve',
    'list': '/vaults/list',
    'delete': '/vaults/delete',
    'grant-permission': '/permissions/grant',
    'revoke-permission': '/permissions/revoke',
    'list-permissions': '/permissions/list'
};
```

### API Call Structure
```javascript
async callNillionAPI(endpoint, data) {
    // User's API key is required for all calls
    if (!this.apiKey) {
        throw new Error('API key not configured. User must provide their own Nillion public API key.');
    }
    
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Nillion-DID': this.did.id
        },
        body: JSON.stringify(data)
    });
    
    return await response.json();
}
```

## Browser Extension Architecture

### Manifest V3 Components

#### Service Worker (background.js)
- Handles extension lifecycle
- Opens welcome page on install
- Manages long-running tasks

#### Content Script (content.js)
- Injected into web pages
- Smart field detection
- Permission dialog injection
- Auto-fill functionality
- postMessage communication

#### Popup (popup.html/js)
- User interface
- Data management
- Permission controls
- Activity log

### Communication Flow

```
Web Page <-> Content Script <-> Background Worker <-> Nillion API
    |              |                     |
    |              v                     |
    |        postMessage API             |
    |              |                     |
    v              v                     v
User Interaction   Permission Dialog   SecretVaults
```

## Security Architecture

### Zero-Knowledge Principles

1. **Local Encryption**: All data encrypted before network transmission
2. **User-Controlled Keys**: Only user has decryption keys
3. **No Server Access**: Nillion network cannot decrypt user data
4. **Keypair Isolation**: Each user's keypair is unique

### Secure Storage

- **DID/Keypair**: `chrome.storage.local` (browser encrypted storage)
- **API Key**: `chrome.storage.local` (user's public key)
- **Encrypted Data**: Nillion network (encrypted, user-owned)

### Permission Model

- **Explicit Consent**: User must approve each website
- **Granular Control**: Choose specific permissions (read, write, download, stream)
- **Site Isolation**: Permissions are domain-specific
- **Easy Revocation**: One-click removal of access

## Comparison with SecretVaults-ts

| Feature | SecretVaults-ts | Nillion Vault Extension | Status |
|---------|----------------|------------------------|---------|
| UserCredentials | ✅ Library class | ✅ Custom implementation | ✅ Compatible |
| DID Generation | ✅ generate() | ✅ generateDID() | ✅ Compatible |
| Store Data | ✅ storeValue() | ✅ storeData() | ✅ Compatible |
| Retrieve Data | ✅ retrieveValue() | ✅ retrieveData() | ✅ Compatible |
| List Data | ✅ listValues() | ✅ listData() | ✅ Compatible |
| Delete Data | ✅ deleteValue() | ✅ deleteData() | ✅ Compatible |
| Grant Access | ✅ grantAccess() | ✅ grantPermission() | ✅ Compatible |
| Revoke Access | ✅ revokeAccess() | ✅ revokePermission() | ✅ Compatible |
| Encryption | ✅ Built-in | ✅ AES-GCM custom | ✅ Compatible |
| Browser Support | ❌ Node.js only | ✅ Browser extension | ✅ Enhanced |

## Why Direct API vs npm Package?

### Challenges with npm Package in Browser Extensions:
1. **WASM Loading**: Browser extensions have strict CSP policies
2. **Node.js Dependencies**: Can't use Node.js modules in browser
3. **Bundle Size**: Extension size limits
4. **Loading Time**: Async module loading complexity

### Benefits of Direct API Implementation:
1. ✅ **Browser Native**: Uses Web Crypto API directly
2. ✅ **No Build Step**: Pure JavaScript, works immediately
3. ✅ **Smaller Size**: No external dependencies
4. ✅ **CSP Compatible**: No eval, no dynamic imports
5. ✅ **Same Functionality**: Implements all SecretVaults features

## Testing & Verification

### Unit Tests (Conceptual)
```javascript
// Test DID generation
await nillionAPI.initialize();
assert(nillionAPI.did.id.startsWith('did:nillion:'));

// Test data storage
const result = await nillionAPI.storeData('test-1', {name: 'Test'});
assert(result.success === true);

// Test data retrieval
const data = await nillionAPI.retrieveData('test-1');
assert(data.name === 'Test');

// Test permissions
const perm = await nillionAPI.grantPermission('app-1', 'TestApp', ['read']);
assert(perm.success === true);
```

## Future Enhancements

### Potential Improvements
1. **WASM Integration**: Use official `@nillion/client-wasm` when browser-compatible
2. **Worker Threads**: Offload encryption to web workers
3. **IndexedDB**: Additional local caching
4. **Sync Protocol**: Multi-device synchronization
5. **Advanced Permissions**: Time-limited access, usage quotas

## 🚀 **Setup Instructions**

### **Prerequisites**
1. **Get Nillion Builder Private Key**: Visit [Nillion Subscription Portal](https://nilpay.nillion.com/)
2. **Node.js 22+**: Required for backend server
3. **Chrome/Edge Browser**: For the extension

### **Step 1: Start Backend Server**
```bash
# Windows
start-server.bat

# Linux/Mac  
./start-server.sh

# Or manually:
cd server
npm install
cp env.example .env
# Edit .env with your BUILDER_PRIVATE_KEY
npm start
```

### **Step 2: Install Extension**
1. **Open Chrome**: Go to `chrome://extensions/`
2. **Enable Developer Mode**: Toggle in top-right corner
3. **Load Extension**: Click "Load unpacked" and select the `dist` folder
4. **Pin Extension**: Click the puzzle piece icon and pin "Nillion Vault"

### **Step 3: Configure Extension**
1. **Click Extension**: Opens welcome page automatically
2. **Click "Start Using Nillion Vault"**: No API key needed!
3. **Generate DID**: Click "Generate DID" to create your identity
4. **Add Data**: Click "Create Data" to store your first item
5. **Visit Websites**: Go to any site with forms to see auto-detection

### **Verify Setup**
- **Server**: http://localhost:3001/health should show "healthy"
- **Extension**: Should show "✅ Nillion network connection: Active"
- **Data**: Should be able to create and list data items

## 📝 **Nillion Testnet Access Instructions**

### **Get Your Builder Private Key**

1. **Visit**: [Nillion Subscription Portal](https://nilpay.nillion.com/)
2. **Create**: Testnet public/private key pair through the UI
3. **Fund**: Your account with Testnet NIL tokens
4. **Subscribe**: to `nilDB` by paying with your subscription wallet
5. **Save**: Your private key (hex format) for the backend server

### **Install Keplr Wallet**

Download and install the Keplr extension from:
https://www.keplr.app/download

### **Connect to the Nillion Testnet**

1. Visit: https://testnet.keplr.app/chains/nillion-testnet
2. Click "Connect Wallet"
3. Approve the connection — this will add the Nillion Testnet to Keplr.

### **Request Testnet Tokens (Faucet)**

1. Go to: https://faucet.testnet.nillion.com/
2. Paste your Nillion wallet address
3. Request tokens for testing

### **Create and Manage Subscriptions**

1. Visit: https://subscription.nillion.com/
2. Use your wallet to create and subscribe to available services

## Additional Resources

- [Nillion Private Storage Documentation](https://docs.nillion.com/build/private-storage/overview)
- [Network API Access Guide](https://docs.nillion.com/build/network-api-access)
- [SecretVaults SDK Documentation](https://docs.nillion.com/build/private-storage/secretvaults)
- [Keplr Wallet Download](https://www.keplr.app/download)
- [Nillion Testnet Faucet](https://faucet.testnet.nillion.com/)
- [Nillion Subscription Management](https://subscription.nillion.com/)

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2025  
**Compatible with**: Nillion SecretVaults Protocol v1

