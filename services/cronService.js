const User = require('../models/User');
const Activity = require('../models/Activity');
const { sendLikeRequest } = require('./likeService');

const runAutolikeJob = async () => {
  console.log('[AutolikeJob] Scanning users for autolike schedules...');
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find active users with autolike enabled who haven't had likes sent in the last 24 hours
    const users = await User.find({
      'subscription.status': 'active',
      'subscription.expiry': { $gt: now },
      'autolike.enabled': true,
      'autolike.uid': { $ne: '' },
      $or: [
        { 'autolike.lastSentAt': null },
        { 'autolike.lastSentAt': { $lte: twentyFourHoursAgo } }
      ]
    }).populate('subscription.plan');

    console.log(`[AutolikeJob] Found ${users.length} user(s) to process.`);

    for (const user of users) {
      const { uid, region } = user.autolike;
      console.log(`[AutolikeJob] Executing autolike for User: ${user.name} (UID: ${uid}, Region: ${region})`);

      const result = await sendLikeRequest(uid, region || 'IND');

      if (result.success) {
        // Success response
        user.autolike.lastSentAt = new Date();
        user.autolike.nickname = result.nickname;
        await user.save();

        await Activity.create({
          user: user._id,
          uid,
          nickname: result.nickname,
          region: result.region,
          likesBefore: result.likesBefore,
          likesAdded: result.likesAdded,
          likesAfter: result.likesAfter,
          status: 'success',
          message: result.message,
          type: 'autolike'
        });
        console.log(`[AutolikeJob] Successfully sent autolikes to ${user.name} (${uid})`);
      } else if (result.status === 2) {
        // Max likes reached today for this UID
        user.autolike.lastSentAt = new Date(); // set lastSentAt to avoid spamming the API
        await user.save();

        await Activity.create({
          user: user._id,
          uid,
          nickname: user.autolike.nickname || 'Unknown',
          region,
          likesBefore: 0,
          likesAdded: 0,
          likesAfter: 0,
          status: 'limit_reached',
          message: result.message,
          type: 'autolike'
        });
        console.log(`[AutolikeJob] Max likes reached for user: ${user.name} (${uid})`);
      } else {
        // API failed or returned other error
        await Activity.create({
          user: user._id,
          uid,
          nickname: user.autolike.nickname || 'Unknown',
          region,
          likesBefore: 0,
          likesAdded: 0,
          likesAfter: 0,
          status: 'failed',
          message: result.message,
          type: 'autolike'
        });
        console.error(`[AutolikeJob] Failed for user: ${user.name} (${uid}). Reason: ${result.message}`);
      }
    }
  } catch (error) {
    console.error('[AutolikeJob] Error in autolike job execution:', error.message);
  }
};

// Start the periodic scheduler (runs every 15 minutes)
const initAutolikeScheduler = () => {
  console.log('[AutolikeScheduler] Initializing periodic scheduler (every 15 minutes)...');
  
  // Run immediately on boot after a short delay (e.g., 10 seconds)
  setTimeout(() => {
    runAutolikeJob();
  }, 10000);

  // Set interval
  setInterval(runAutolikeJob, 15 * 60 * 1000);
};

module.exports = {
  initAutolikeScheduler,
  runAutolikeJob
};
