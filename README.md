# 🔒 Nillion Vault Extension

A powerful browser extension for secure private data management powered by **Nillion SecretVaults**. Store, manage, and auto-fill your personal data across websites with complete privacy and control.

## ✨ Key Features

### 🔐 **Secure Data Storage**
- **End-to-End Encryption**: All data encrypted using Web Crypto API
- **Nillion Network**: Data stored on Nillion's decentralized private storage
- **Zero-Knowledge**: Only you can access your data
- **Real API Integration**: Direct connection to Nillion SecretVaults

### 🎯 **Smart Field Detection**
- **Automatic Detection**: Scans any website for relevant form fields
- **Intelligent Matching**: Identifies resume uploads, personal info, contact forms
- **Relevance Scoring**: Ranks fields by importance (1-10 scale)
- **Dynamic Detection**: Works with dynamically loaded content

### 🚀 **Auto-Fill System**
- **One-Click Fill**: Automatically populate forms with your stored data
- **Smart Matching**: Matches data types to appropriate fields
- **Visual Feedback**: Green borders and notifications show filled fields
- **File Ready**: Notifies when files are available for upload

### 🔑 **Permission Management**
- **Site-Specific Permissions**: Grant access per website
- **Granular Controls**: Choose Read, Write, Download, Stream permissions
- **Easy Revocation**: Remove access with one click
- **Permission History**: Track all granted permissions

### 📊 **Data Types Supported**
- **📝 Plain Text**: Notes, descriptions, bio text
- **📄 Documents**: PDFs, Word docs, text files
- **🖼️ Images**: Photos, graphics, screenshots
- **🎥 Videos**: Video files and recordings
- **🎵 Audio**: Music, voice recordings
- **📦 Archives**: ZIP, RAR, compressed files

## 🚀 Quick Start

### Installation
1. **Download**: Get the extension files
2. **Open Chrome**: Go to `chrome://extensions/`
3. **Enable Developer Mode**: Toggle in top-right corner
4. **Load Extension**: Click "Load unpacked" and select the `dist` folder
5. **Pin Extension**: Click the puzzle piece icon and pin "Nillion Vault"

### First Use
1. **Click Extension**: Open Nillion Vault from toolbar
2. **Generate DID**: Click "Generate DID" to create your identity
3. **Add Data**: Click "Create Data" to store your first item
4. **Visit Websites**: Go to any site with forms to see auto-detection

## 🎯 How It Works

### 1. **Data Storage**
```
User Data → Encryption → Nillion Network → Secure Storage
```
- Your data is encrypted locally using AES-GCM
- Encrypted data is stored on Nillion's private network
- Only you have the decryption keys

### 2. **Smart Detection**
```
Website Form → Field Analysis → Relevance Scoring → Permission Request
```
- Scans for input fields, file uploads, text areas
- Analyzes field names, types, and content
- Scores relevance (resume fields = high priority)
- Shows permission dialog for relevant fields

### 3. **Auto-Fill Process**
```
Stored Data → Field Matching → User Permission → Auto-Fill
```
- Matches your stored data to detected fields
- Requests permission before filling
- Fills text fields automatically
- Shows notifications for file uploads

## 🔧 Core Functionality

### **Data Management**
- **Create Data**: Store new items with name, type, content, and files
- **List Data**: View all stored items with details and permissions
- **Delete Data**: Remove individual items or clear all data
- **File Upload**: Drag-and-drop or click to upload files

### **Permission System**
- **Grant Permissions**: Allow websites to access specific data
- **Revoke Permissions**: Remove access from current website
- **List Permissions**: View all granted permissions by site
- **Test Permissions**: Check current website's access level

### **Smart Detection**
- **Form Fields**: Detects name, email, phone, address fields
- **File Uploads**: Identifies resume, document, image upload areas
- **Dynamic Content**: Works with JavaScript-loaded forms
- **Relevance Scoring**: Prioritizes important fields

## 🌐 Supported Websites

The extension works on **any website** with forms, including:

### **Job Sites**
- LinkedIn, Indeed, Glassdoor, Monster
- Company career pages
- Application forms

### **Social Media**
- Facebook, Twitter, Instagram
- Profile completion forms
- Bio and description fields

### **E-commerce**
- Amazon, eBay, Shopify stores
- Account creation forms
- Checkout processes

### **Professional Services**
- Resume builders (Cake Resume, etc.)
- Portfolio sites
- Freelance platforms

## 🔒 Privacy & Security

### **Your Data, Your Control**
- **Local Encryption**: Data encrypted before leaving your browser
- **Zero-Knowledge**: Nillion network cannot see your data
- **User Ownership**: You control all permissions and access
- **No Tracking**: Extension doesn't track your browsing

### **Permission Model**
- **Explicit Consent**: Always asks before accessing data
- **Granular Control**: Choose exactly what to share
- **Easy Revocation**: Remove access anytime
- **Site Isolation**: Permissions are website-specific

## 🛠️ Technical Details

### **Architecture**
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background script for API calls
- **Content Scripts**: Injected into web pages for detection
- **Web Crypto API**: Browser-native encryption

### **Nillion Integration**
- **Real API**: Direct connection to Nillion SecretVaults
- **DID Generation**: Creates unique decentralized identifiers
- **Key Management**: Secure keypair generation and storage
- **Network Storage**: Data stored on Nillion's private network

### **Browser Compatibility**
- **Chrome**: Full support (primary target)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Compatible with minor modifications

## 📱 User Interface

### **Extension Popup**
- **Quick Actions**: Generate DID, create data, check status
- **Data Management**: List, create, delete data items
- **Permissions**: Manage website access
- **Activity Log**: Real-time feedback and status

### **Permission Dialog**
- **Site Information**: Shows current website details
- **Detected Fields**: Lists relevant form fields with scores
- **Permission Options**: Checkboxes for different access levels
- **Description Field**: Optional note about data usage

### **Auto-Fill Feedback**
- **Visual Indicators**: Green borders on filled fields
- **Notifications**: Success/error messages
- **File Ready**: Alerts when files are available
- **Status Updates**: Real-time progress indicators

## 🔧 Configuration

### **API Key Setup**
The extension uses a pre-configured Nillion API key:
```
API Key: 02e2b5bb41a552230c007a2169594fc0d794e6bc6dce160a11f37d8e4aaa0a9f0f
```

### **Storage Locations**
- **Browser Storage**: Extension settings and preferences
- **Nillion Network**: Encrypted user data and permissions
- **Local Encryption**: Keys and encryption parameters

## 🚨 Troubleshooting

### **Common Issues**
1. **Extension Not Loading**: Check Chrome extensions page
2. **No Field Detection**: Refresh page and wait for detection
3. **Permission Denied**: Check if extension has necessary permissions
4. **Data Not Saving**: Verify internet connection and API key

### **Debug Mode**
- Open browser console (F12) to see detailed logs
- Check extension popup for status messages
- Verify permissions in Chrome extensions settings

## 📈 Future Enhancements

### **Planned Features**
- **Data Categories**: Organize data by type (personal, professional, etc.)
- **Export/Import**: Backup and restore data
- **Team Sharing**: Share data with trusted contacts
- **Advanced Encryption**: Additional security options

### **Integration Opportunities**
- **Password Managers**: Integrate with existing password tools
- **Cloud Storage**: Sync with personal cloud accounts
- **API Access**: Allow third-party app integration

## 🤝 Support

### **Getting Help**
- **Documentation**: Check this README for common questions
- **Console Logs**: Use browser developer tools for debugging
- **Extension Status**: Check the popup for error messages

### **Contributing**
This extension is built for Nillion's ecosystem and demonstrates the power of private data management with SecretVaults technology.

---

## 🎉 **Ready to Use!**

Your Nillion Vault extension is now ready to protect and manage your private data across the web. Start by generating your DID and adding some data, then visit any website with forms to see the magic happen!

**Powered by Nillion SecretVaults** 🔒
