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

## 🔧 Features

- **🔐 Secure Storage**: Data encrypted on Nillion network
- **🤖 Auto-Fill**: Smart form detection and auto-completion
- **🌐 Cross-Site**: Works on any website with forms
- **👤 Identity Management**: Decentralized identity (DID) support
- **🛡️ Privacy Control**: Granular permissions per website
- **📱 Offline Support**: Works without internet connection

## 📁 Project Structure

```
PDM/
├── dist/                 # Extension files
│   ├── manifest.json    # Extension manifest
│   ├── popup.html       # Main UI
│   ├── popup.js         # UI logic
│   ├── content.js       # Form detection
│   └── background.js    # Background service
├── server/              # Backend server
│   ├── server.js        # Main server
│   └── package.json     # Dependencies
└── README.md           # This file
```

## 🔑 Configuration

1. **Get Nillion Builder Key**:
   - Visit [Nillion Subscription Portal](https://nilpay.nillion.com/)
   - Create account and get your builder private key

2. **Configure Server**:
   ```bash
   cd server
   cp env.example .env
   # Edit .env with your BUILDER_PRIVATE_KEY
   ```

3. **Start Services**:
   ```bash
   # Terminal 1: Start backend
   ./start-server.sh
   
   # Terminal 2: Load extension in Chrome
   # Go to chrome://extensions/ and load dist folder
   ```

## 🎯 Usage

1. **Create Identity**: Generate your decentralized identity (DID)
2. **Store Data**: Add personal information, documents, credentials
3. **Auto-Fill**: Visit websites with forms - extension detects and offers to fill
4. **Manage Permissions**: Control which sites can access your data
5. **Secure Storage**: All data encrypted on Nillion network

## 🛠️ Development

```bash
# Install dependencies
cd server && npm install

# Start development server
npm run dev

# Load extension in Chrome
# Go to chrome://extensions/ and load dist folder
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [Nillion Docs](https://docs.nillion.com/)
- **Community**: [Nillion Discord](https://discord.gg/nillion)