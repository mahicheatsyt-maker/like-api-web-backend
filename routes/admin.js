const express = require('express');
const router = express.Router();
const { 
  getUsers, createUser, updateUser, deleteUser, getAllActivity, 
  getApiKeys, createApiKey, deleteApiKey,
  getConfigs, updateConfig, deleteConfig 
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Mount routes under /api/admin, fully protected by token and admin role checks
router.get('/users', protect, admin, getUsers);
router.post('/users', protect, admin, createUser);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);
router.get('/activity', protect, admin, getAllActivity);

// API Keys Management Routes
router.get('/apikeys', protect, admin, getApiKeys);
router.post('/apikeys', protect, admin, createApiKey);
router.delete('/apikeys/:id', protect, admin, deleteApiKey);

// Global System Configurations Routes
router.get('/config', protect, admin, getConfigs);
router.put('/config', protect, admin, updateConfig);
router.delete('/config/:id', protect, admin, deleteConfig);

module.exports = router;
