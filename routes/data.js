const express = require('express');
const router = express.Router();
const { 
  getAllPlans, getDownloads, getTutorials, seedData,
  createPlan, updatePlan, deletePlan,
  createContent, updateContent, deleteContent
} = require('../controllers/dataController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/plans', getAllPlans);
router.get('/tutorials', protect, getTutorials);
router.post('/seed', protect, admin, seedData);

// Admin Routes for Plans
router.post('/plans', protect, admin, createPlan);
router.put('/plans/:id', protect, admin, updatePlan);
router.delete('/plans/:id', protect, admin, deletePlan);

// Admin Routes for Content
router.post('/content', protect, admin, createContent);
router.put('/content/:id', protect, admin, updateContent);
router.delete('/content/:id', protect, admin, deleteContent);

module.exports = router;
