#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
loadEnv();

// Import Nillion SDK components
import {
  Keypair,
  NilauthClient,
  PayerBuilder,
  NucTokenBuilder,
  Command,
  Did,
} from '@nillion/nuc';
import {
  SecretVaultBuilderClient,
} from '@nillion/secretvaults';

// Configuration
const config = {
  NILCHAIN_URL: process.env.NILCHAIN_URL || 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
  NILAUTH_URL: process.env.NILAUTH_URL || 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
  NILDB_NODES: process.env.NILDB_NODES?.split(',') || [
    'https://nildb-stg-n1.nillion.network',
    'https://nildb-stg-n2.nillion.network',
    'https://nildb-stg-n3.nillion.network'
  ],
  BUILDER_PRIVATE_KEY: process.env.BUILDER_PRIVATE_KEY,
  PORT: process.env.PORT || 3001,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Validate configuration
if (!config.BUILDER_PRIVATE_KEY) {
  console.error('❌ Please set BUILDER_PRIVATE_KEY in your .env file');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'chrome-extension://*', 'moz-extension://*'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Global variables
let builder = null;
let builderKeypair = null;
let collectionId = null;

// Initialize Nillion Builder
async function initializeBuilder() {
  try {
    console.log('🔧 Initializing Nillion Builder...');
    
    // Create keypair from private key
    builderKeypair = Keypair.from(config.BUILDER_PRIVATE_KEY);
    const builderDid = builderKeypair.toDid().toString();
    console.log('✅ Builder DID:', builderDid);
    
    // Create builder client
    builder = await SecretVaultBuilderClient.from({
      keypair: builderKeypair,
      urls: {
        chain: config.NILCHAIN_URL,
        auth: config.NILAUTH_URL,
        dbs: config.NILDB_NODES,
      },
    });
    
    // Refresh token using existing subscription
    await builder.refreshRootToken();
    console.log('✅ Builder client initialized');
    
    // Register builder (handle existing registration)
    try {
      const existingProfile = await builder.readProfile();
      console.log('✅ Builder already registered:', existingProfile.data.name);
    } catch (profileError) {
      try {
        await builder.register({
          did: builderDid,
          name: 'Nillion Vault Builder',
        });
        console.log('✅ Builder registered successfully');
      } catch (registerError) {
        if (registerError.message.includes('duplicate key')) {
          console.log('✅ Builder already registered (duplicate key)');
        } else {
          throw registerError;
        }
      }
    }
    
    // Create user data collection
    await createUserDataCollection();
    
  } catch (error) {
    console.error('❌ Failed to initialize builder:', error.message);
    throw error;
  }
}

// Create user data collection
async function createUserDataCollection() {
  try {
    console.log('📦 Creating user data collection...');
    
    collectionId = randomUUID();
    
    const collection = {
      _id: collectionId,
      type: 'owned', // Every document in the collection will be user-owned
      name: 'Nillion Vault User Data',
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'array',
        uniqueItems: true,
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'uuid' },
            name: { type: 'string' }, // name will not be secret shared
            type: { type: 'string' }, // data type (text, image, document, etc.)
            content: { // content will be secret shared
              type: "object",
              properties: {
                "%share": {
                  type: "string"
                }
              },
              required: ["%share"]
            },
            fileName: { type: 'string' }, // file name (if applicable)
            fileSize: { type: 'number' }, // file size (if applicable)
            fileType: { type: 'string' }, // MIME type (if applicable)
            createdAt: { type: 'string', format: 'date-time' },
            permissions: {
              type: 'object',
              properties: {
                read: { type: 'boolean' },
                write: { type: 'boolean' },
                execute: { type: 'boolean' }
              }
            }
          },
          required: ['_id', 'name', 'type', 'content', 'createdAt'],
        },
      },
    };
    
    const createResults = await builder.createCollection(collection);
    console.log('✅ User data collection created on', Object.keys(createResults).length, 'nodes');
    console.log('📋 Collection ID:', collectionId);
    
  } catch (error) {
    console.error('❌ Collection creation failed:', error.message);
    throw error;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    builder: builder ? 'connected' : 'disconnected',
    collection: collectionId ? 'created' : 'not created'
  });
});

// Get collection info
app.get('/api/collection-info', (req, res) => {
  if (!builder || !collectionId) {
    return res.status(503).json({ 
      error: 'Builder not initialized',
      success: false 
    });
  }
  
  res.json({
    success: true,
    data: {
      collectionId,
      builderDid: builderKeypair.toDid().toString(),
      collectionName: 'Nillion Vault User Data'
    }
  });
});

// Create delegation token for user
app.post('/api/delegation-token', async (req, res) => {
  try {
    const { userDid } = req.body;
    
    console.log('🔑 Creating delegation token for user:', userDid);
    
    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'userDid is required'
      });
    }
    
    if (!builder || !collectionId) {
      return res.status(503).json({
        success: false,
        error: 'Builder not initialized'
      });
    }
    
    // Create delegation token for user to store data
    // For now, we'll use the builder's DID as the audience since we can't create proper user DIDs
    // In a real implementation, the user would have their own keypair and DID
    console.log('🔄 Using builder DID as audience for delegation token');
    const audienceDid = builderKeypair.toDid();
    console.log('✅ Using audience DID:', audienceDid.toString());
    
    console.log('🔐 Creating delegation token...');
    const delegation = NucTokenBuilder.extending(builder.rootToken)
      .command(new Command(['nil', 'db', 'data', 'create']))
      .audience(audienceDid)
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(builderKeypair.privateKey());
    
    console.log('✅ Delegation token created successfully');
    
    res.json({
      success: true,
      data: {
        token: delegation,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating delegation token:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create delegation token for reading data
app.post('/api/read-delegation-token', async (req, res) => {
  try {
    const { userDid } = req.body;
    
    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'userDid is required'
      });
    }
    
    if (!builder) {
      return res.status(503).json({
        success: false,
        error: 'Builder not initialized'
      });
    }
    
    // Create delegation token for user to read their data
    // Use builder's DID as audience
    const audienceDid = builderKeypair.toDid();
    
    const delegation = NucTokenBuilder.extending(builder.rootToken)
      .command(new Command(['nil', 'db', 'data', 'read']))
      .audience(audienceDid)
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(builderKeypair.privateKey());
    
    res.json({
      success: true,
      data: {
        token: delegation,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating read delegation token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create delegation token for listing data
app.post('/api/list-delegation-token', async (req, res) => {
  try {
    const { userDid } = req.body;
    
    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'userDid is required'
      });
    }
    
    if (!builder) {
      return res.status(503).json({
        success: false,
        error: 'Builder not initialized'
      });
    }
    
    // Create delegation token for user to list their data
    // Use builder's DID as audience
    const audienceDid = builderKeypair.toDid();
    
    const delegation = NucTokenBuilder.extending(builder.rootToken)
      .command(new Command(['nil', 'db', 'data', 'list']))
      .audience(audienceDid)
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(builderKeypair.privateKey());
    
    res.json({
      success: true,
      data: {
        token: delegation,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating list delegation token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create delegation token for deleting data
app.post('/api/delete-delegation-token', async (req, res) => {
  try {
    const { userDid } = req.body;
    
    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'userDid is required'
      });
    }
    
    if (!builder) {
      return res.status(503).json({
        success: false,
        error: 'Builder not initialized'
      });
    }
    
    // Create delegation token for user to delete their data
    // Use builder's DID as audience
    const audienceDid = builderKeypair.toDid();
    
    const delegation = NucTokenBuilder.extending(builder.rootToken)
      .command(new Command(['nil', 'db', 'data', 'delete']))
      .audience(audienceDid)
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(builderKeypair.privateKey());
    
    res.json({
      success: true,
      data: {
        token: delegation,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating delete delegation token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  try {
    // Initialize Nillion builder
    await initializeBuilder();
    
    // Start HTTP server
    app.listen(config.PORT, () => {
      console.log('🚀 Nillion Vault Server started');
      console.log(`📡 Server running on http://localhost:${config.PORT}`);
      console.log(`🔗 Collection ID: ${collectionId}`);
      console.log(`👤 Builder DID: ${builderKeypair.toDid().toString()}`);
      console.log('✅ Ready to serve delegation tokens to extension users');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
