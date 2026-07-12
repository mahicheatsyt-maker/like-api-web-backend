const axios = require('axios');

/**
 * Service to call the external Like API
 * Endpoint: https://like-khaki-seven.vercel.app/like?uid=${uid}&region=${region}
 */
const sendLikeRequest = async (uid, region = 'IND') => {
  const url = `https://bhuwan-like-api-p.vercel.app/like?uid=${uid}&region=${region}`;
  const headers = {
    'X-API-KEY': 'key_cwuc0em02bosl20k',
    'X-API-SECRET':'sec_e4wutohjzpn7jeob',
    'X-CLIENT-ID': 'cli_aimguard_01F8MECHZX3TBDSZ7XRADM79XE',
    'User-Agent': 'Aimguard/1.0.0',
    'X-REQUEST-TYPE': 'redefine-like'
  };

  try {
    console.log(`[LikeService] Sending likes to UID: ${uid}, Region: ${region}`);
    const response = await axios.get(url, { headers, timeout: 60000 }); // 60s timeout for like bot response
    const data = response.data;

    if (!data) {
      return { success: false, status: 0, message: 'Empty response received from Like API.' };
    }

    if (data.status === 2) {
      return {
        success: false,
        status: 2,
        message: 'Max likes reached. You have already reached the daily like limit for this UID today.'
      };
    }

    if (data.status !== 1) {
      return {
        success: false,
        status: data.status || 0,
        message: data.message || 'Something went wrong with the like operation.'
      };
    }

    // Success response
    const before = data.likes?.before || 0;
    const added = data.likes?.added_by_api || 0;
    const after = data.likes?.after || 0;
    const player = data.player || {};
    const nickname = player.nickname || 'Unknown';
    const playerRegion = player.region || region;

    return {
      success: true,
      status: 1,
      likesBefore: before,
      likesAdded: added,
      likesAfter: after,
      nickname,
      region: playerRegion,
      uid: player.uid || uid,
      message: 'Likes added successfully!'
    };
  } catch (error) {
    console.error('[LikeService] Connection or Execution Error:', error.message);
    return {
      success: false,
      status: -1,
      message: error.response?.data?.message || error.message || 'Failed to connect to the Like API server.'
    };
  }
};

module.exports = {
  sendLikeRequest
};
