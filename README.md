# 🔒 Nillion Vault Extension

A browser extension for secure private data management powered by **Nillion SecretVaults**. Store, manage, and auto-fill your personal data across websites with complete privacy and control.

## 🚀 Quick Start

### Prerequisites
- **Nillion Builder Private Key**: Get from [Nillion Subscription Portal](https://nilpay.nillion.com/)
- **Node.js 22+**: For backend server
- **Chrome/Edge Browser**: For the extension

### 1. Start Backend Server
```bash
# Windows
start-server.bat

# Linux/Mac  
./start-server.sh

# Manual setup
cd server
npm install
cp env.example .env
# Edit .env with your BUILDER_PRIVATE_KEY
npm start
```

### 2. Install Extension
1. Open Chrome → `chrome://extensions/`
2. Enable Developer Mode (top-right toggle)
3. Click "Load unpacked" → Select `dist` folder
4. Pin "Nillion Vault" extension

### 3. Configure Extension
1. Click extension → Opens welcome page
2. Click "🚀 Start Using Nillion Vault"
3. Click "Generate DID" to create identity
4. Click "Create Data" to store first item
5. Visit any website with forms to see auto-detection

## 🏗️ Architecture

### Production-Ready Setup
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │    │   Backend Server │    │  Nillion Network│
│   Extension     │◄──►│   (Node.js)      │◄──►│   (Testnet)     │
│                 │    │                  │    │                 │
│ • User Keypair  │    │ • Builder Key    │    │ • Encrypted Data│
│ • DID Generation│    │ • Delegation     │    │ • Collections   │
│ • Data Encryption│   │ • Token Management│   │ • Private Storage│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components
- **Extension**: User interface, data encryption, form detection
- **Backend Server**: Builder private key, delegation tokens, Nillion API
- **Nillion Network**: Encrypted data storage, user collections

### Data Flow
1. **User generates keypair** in browser (no private key storage)
2. **Server provides delegation tokens** for Nillion operations
3. **Data encrypted locally** using Web Crypto API
4. **Encrypted data stored** on Nillion's private network
5. **Only user can decrypt** with their local keypair

## ✨ Features

### 🔐 Secure Data Storage
- End-to-end encryption with Web Crypto API
- Data stored on Nillion's decentralized network
- Zero-knowledge architecture (only you can access data)

### 🎯 Smart Form Detection
- Automatically detects relevant form fields
- Intelligent matching for resumes, personal info, contact forms
- Relevance scoring (1-10 scale) for field importance

### 🚀 Auto-Fill System
- One-click form population with stored data
- Smart data type matching
- Visual feedback with green borders and notifications

### 🔑 Permission Management
- Site-specific permissions (grant/revoke per website)
- Granular controls (Read, Write, Download, Stream)
- Permission history and easy revocation

### 📊 Supported Data Types
- **📝 Plain Text**: Notes, descriptions, bio text
- **📄 Documents**: PDFs, Word docs, text files  
- **🖼️ Images**: Photos, graphics, screenshots
- **🎥 Videos**: Video files and recordings
- **🎵 Audio**: Music, voice recordings
- **📦 Archives**: ZIP, RAR, compressed files

## 🌐 Supported Websites

Works on **any website** with forms:
- **Job Sites**: LinkedIn, Indeed, Glassdoor, company career pages
- **Social Media**: Facebook, Twitter, Instagram profile forms
- **E-commerce**: Amazon, eBay, checkout processes
- **Professional**: Resume builders, portfolio sites, freelance platforms

**Excluded Sites**: YouTube, Netflix, social media feeds (no interference)

## 🔧 Core Functionality

### Data Management
- **Create Data**: Store items with name, type, content, files
- **List Data**: View all stored items with details
- **Delete Data**: Remove individual items or clear all
- **File Upload**: Drag-and-drop or click to upload

### Permission System
- **Grant Permissions**: Allow websites to access specific data
- **Revoke Permissions**: Remove access from current website
- **List Permissions**: View all granted permissions by site
- **Test Permissions**: Check current website's access level

### Smart Detection
- **Form Fields**: Detects name, email, phone, address fields
- **File Uploads**: Identifies resume, document, image upload areas
- **Dynamic Content**: Works with JavaScript-loaded forms
- **Relevance Scoring**: Prioritizes important fields

## 🔒 Privacy & Security

### Your Data, Your Control
- **Local Encryption**: Data encrypted before leaving browser
- **Zero-Knowledge**: Nillion network cannot see your data
- **User Ownership**: You control all permissions and access
- **No Tracking**: Extension doesn't track browsing

### Permission Model
- **Explicit Consent**: Always asks before accessing data
- **Granular Control**: Choose exactly what to share
- **Easy Revocation**: Remove access anytime
- **Site Isolation**: Permissions are website-specific

## 🛠️ Technical Details

### Extension Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background script for API calls
- **Content Scripts**: Injected into web pages for detection
- **Web Crypto API**: Browser-native encryption

### Nillion Integration
- **SecretVaults Protocol**: User Owned Collections API
- **UserCredentials**: DID + Keypair management
- **SecretVault Operations**: Store, retrieve, list, delete encrypted data
- **PermissionManager**: Grant/revoke access control
- **Network Storage**: Data stored on Nillion's private network

### Browser Compatibility
- **Chrome**: Full support (primary target)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Compatible with minor modifications

## 🚨 Troubleshooting

### Common Issues
1. **Extension Not Loading**: Check Chrome extensions page
2. **No Field Detection**: Refresh page and wait for detection
3. **Permission Denied**: Check extension permissions
4. **Data Not Saving**: Verify server connection and builder key

### Debug Mode
- Open browser console (F12) for detailed logs
- Check extension popup for status messages
- Verify server health at `http://localhost:3001/health`

## 📱 User Interface

### Extension Popup
- **Quick Actions**: Generate DID, create data, check status
- **Data Management**: List, create, delete data items
- **Permissions**: Manage website access
- **Activity Log**: Real-time feedback with copy functionality

### Permission Dialog
- **Site Information**: Current website details
- **Detected Fields**: Relevant form fields with scores
- **Permission Options**: Checkboxes for access levels
- **Description Field**: Optional usage notes

### Auto-Fill Feedback
- **Visual Indicators**: Green borders on filled fields
- **Notifications**: Success/error messages
- **File Ready**: Alerts when files are available
- **Status Updates**: Real-time progress indicators

## 🔧 Configuration

### Environment Variables (Server)
```bash
# server/.env
BUILDER_PRIVATE_KEY=your_nillion_builder_private_key
NILLION_NETWORK_URL=https://testnet.nillion.com
PORT=3001
```

### Extension Settings
- **API Key**: Automatically configured (no user input needed)
- **Storage**: Uses Chrome storage for settings and permissions
- **Encryption**: Web Crypto API for local data encryption

## 📈 Future Enhancements

### Planned Features
- **Data Categories**: Organize by type (personal, professional)
- **Export/Import**: Backup and restore data
- **Team Sharing**: Share data with trusted contacts
- **Advanced Encryption**: Additional security options

### Integration Opportunities
- **Password Managers**: Integrate with existing tools
- **Cloud Storage**: Sync with personal cloud accounts
- **API Access**: Third-party app integration

## 🤝 Support

### Getting Help
- **Documentation**: Check this README for common questions
- **Console Logs**: Use browser developer tools for debugging
- **Extension Status**: Check popup for error messages

### Contributing
Built for Nillion's ecosystem, demonstrating private data management with SecretVaults technology.

---

## 🎉 Ready to Use!

Your Nillion Vault extension is ready to protect and manage private data across the web. Start by generating your DID and adding data, then visit any website with forms to see auto-detection in action!

**Powered by Nillion SecretVaults** 🔒