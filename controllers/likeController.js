const User = require('../models/User');
const Activity = require('../models/Activity');
const { sendLikeRequest } = require('../services/likeService');

// Submit manual likes
const submitLikes = async (req, res) => {
  const { uid, region } = req.body;
  const userId = req.user._id;

  if (!uid || uid.trim() === '') {
    return res.status(400).json({ message: 'UID is required.' });
  }

  const cleanRegion = (region || 'IND').toUpperCase();
  
  // ✅ YAHAN CHANGE - AG ko active karo
  const validRegions = ['IND', 'AG'];
  if (!validRegions.includes(cleanRegion)) {
    return res.status(400).json({ 
      message: `${cleanRegion} server region is not supported yet. Currently only IND and AG are active.` 
    });
  }

  try {
    const user = await User.findById(userId).populate('subscription.plan');

    // 1. Check active subscription
    if (user.subscription.status !== 'active') {
      return res.status(403).json({ message: 'Active subscription required to submit likes.' });
    }

    const now = new Date();
    if (user.subscription.expiry && now > new Date(user.subscription.expiry)) {
      user.subscription.status = 'expired';
      await user.save();
      return res.status(403).json({ message: 'Your subscription has expired.' });
    }

    const plan = user.subscription.plan;
    if (!plan) {
      return res.status(403).json({ message: 'No plan found linked to your subscription.' });
    }

    // 2. Track / Reset Daily Limit
    const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    if (user.lastRequestDate !== today) {
      user.dailyRequestsUsed = 0;
      user.lastRequestDate = today;
    }

    // 3. Calculate Allowed Requests based on Plan and Autolike Setup
    const isAutolikeActive = user.autolike?.enabled === true && plan.allowAutolike === true;
    const maxManualRequests = isAutolikeActive ? Math.max(1, plan.maxReqsPerDay - 1) : plan.maxReqsPerDay;

    if (user.dailyRequestsUsed >= maxManualRequests) {
      return res.status(400).json({
        message: `Daily manual request limit reached for your plan. You can make maximum ${maxManualRequests} manual request(s) per day.`,
        limit: maxManualRequests,
        used: user.dailyRequestsUsed
      });
    }

    // 4. Call Like API
    const result = await sendLikeRequest(uid.trim(), cleanRegion);

    if (result.success) {
      user.dailyRequestsUsed += 1;
      await user.save();

      // Log activity
      const activity = await Activity.create({
        user: userId,
        uid: uid.trim(),
        nickname: result.nickname,
        region: result.region,
        likesBefore: result.likesBefore,
        likesAdded: result.likesAdded,
        likesAfter: result.likesAfter,
        status: 'success',
        message: result.message,
        type: 'manual'
      });

      return res.json({
        success: true,
        message: 'Likes added successfully!',
        activity
      });
    } else {
      // Log failed/limit_reached activity
      const logStatus = result.status === 2 ? 'limit_reached' : 'failed';
      
      const activity = await Activity.create({
        user: userId,
        uid: uid.trim(),
        nickname: 'Unknown',
        region: cleanRegion,
        likesBefore: 0,
        likesAdded: 0,
        likesAfter: 0,
        status: logStatus,
        message: result.message,
        type: 'manual'
      });

      return res.status(400).json({
        message: result.message,
        activity
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Run Free Trial request
const runFreeTrial = async (req, res) => {
  const { uid, region } = req.body;
  const userId = req.user._id;

  if (!uid || uid.trim() === '') {
    return res.status(400).json({ message: 'UID is required.' });
  }

  const cleanRegion = (region || 'IND').toUpperCase();
  
  // ✅ YAHAN CHANGE - AG ko active karo
  const validRegions = ['IND', 'AG'];
  if (!validRegions.includes(cleanRegion)) {
    return res.status(400).json({ 
      message: `${cleanRegion} server region is not supported yet. Currently only IND and AG are active.` 
    });
  }

  try {
    const user = await User.findById(userId);

    // 1. Verify Free Trial eligibility
    if (!user.freeTrial?.approved) {
      return res.status(403).json({ message: 'Your Free Trial has not been activated by the administrator yet.' });
    }

    if (user.freeTrial.used) {
      return res.status(403).json({ message: 'You have already used your Free Trial.' });
    }

    // 2. Call Like API
    const result = await sendLikeRequest(uid.trim(), cleanRegion);

    if (result.success) {
      user.freeTrial.used = true;
      user.freeTrial.usedAt = new Date();
      await user.save();

      // Log activity
      const activity = await Activity.create({
        user: userId,
        uid: uid.trim(),
        nickname: result.nickname,
        region: result.region,
        likesBefore: result.likesBefore,
        likesAdded: result.likesAdded,
        likesAfter: result.likesAfter,
        status: 'success',
        message: 'Free Trial likes added!',
        type: 'free_trial'
      });

      return res.json({
        success: true,
        message: 'Free Trial likes added successfully!',
        activity
      });
    } else {
      // If UID is full/limit reached today, let them try another UID without burning their trial
      if (result.status === 2) {
        return res.status(400).json({
          message: 'Likes limit reached for this UID today. Please try a different UID for your free trial.'
        });
      }

      return res.status(400).json({
        message: result.message || 'Free trial request failed.'
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Set up or disable Autolike
const setupAutolike = async (req, res) => {
  const { enabled, uid, region } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).populate('subscription.plan');

    // 1. Check active subscription
    if (user.subscription.status !== 'active') {
      return res.status(403).json({ message: 'Active subscription required to set up Autolike.' });
    }

    const plan = user.subscription.plan;
    if (!plan || !plan.allowAutolike) {
      return res.status(403).json({ message: 'Your current plan does not support automatic daily likes.' });
    }

    if (enabled) {
      if (!uid || uid.trim() === '') {
        return res.status(400).json({ message: 'UID is required to enable Autolike.' });
      }
      const cleanRegion = (region || 'IND').toUpperCase();
      
      // ✅ YAHAN CHANGE - AG ko active karo
      const validRegions = ['IND', 'AG'];
      if (!validRegions.includes(cleanRegion)) {
        return res.status(400).json({ 
          message: `${cleanRegion} server region is not supported yet. Currently only IND and AG are active.` 
        });
      }

      user.autolike = {
        enabled: true,
        uid: uid.trim(),
        region: cleanRegion,
        nickname: user.autolike?.nickname || '',
        lastSentAt: user.autolike?.lastSentAt || null
      };
    } else {
      user.autolike.enabled = false;
      user.autolike.uid = '';
      user.autolike.region = '';
      user.autolike.nickname = '';
    }

    await user.save();

    res.json({
      message: enabled ? 'Autolike setup saved and activated.' : 'Autolike service disabled.',
      autolike: user.autolike
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Get User's Activity History
const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const total = await Activity.countDocuments({ user: req.user._id });
    const activities = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      activities,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve activity logs: ' + error.message });
  }
};

module.exports = {
  submitLikes,
  runFreeTrial,
  setupAutolike,
  getHistory
};
