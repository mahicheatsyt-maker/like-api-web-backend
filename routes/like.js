const express = require('express');
const router = express.Router();
const { submitLikes, runFreeTrial, setupAutolike, getHistory } = require('../controllers/likeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/submit', protect, submitLikes);
router.post('/free-trial', protect, runFreeTrial);
router.post('/autolike/setup', protect, setupAutolike);
router.get('/history', protect, getHistory);

module.exports = router;
