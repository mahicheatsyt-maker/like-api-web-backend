const User = require('../models/User');
const Plan = require('../models/Plan');
const Config = require('../models/Config');
const Activity = require('../models/Activity');
const ApiKey = require('../models/ApiKey');

// GET /api/admin/users - Search, filter, and paginate users
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('subscription.plan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      status: true,
      users,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users: ' + error.message });
  }
};

// POST /api/admin/users - Create a new user profile
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, planId, expiry, freeTrialApproved } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let subscription = {
      plan: null,
      status: 'inactive',
      expiry: null
    };

    if (planId && planId !== 'none') {
      const plan = await Plan.findById(planId);
      if (plan) {
        const exp = expiry ? new Date(expiry) : new Date();
        if (!expiry) {
          exp.setDate(exp.getDate() + plan.durationDays);
        }
        subscription = {
          plan: plan._id,
          status: 'active',
          expiry: exp
        };
      }
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'user',
      subscription,
      freeTrial: {
        approved: freeTrialApproved || false,
        used: false
      }
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user: ' + error.message });
  }
};

// PUT /api/admin/users/:id - Update user details, plans, expiries, free trial approvals, and bans
const updateUser = async (req, res) => {
  try {
    const { name, email, role, planId, status, expiry, freeTrialApproved, freeTrialUsed, isBanned, banReason, dailyRequestsUsed } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (dailyRequestsUsed !== undefined) user.dailyRequestsUsed = parseInt(dailyRequestsUsed, 10);

    // Update free trial configs
    if (user.freeTrial === undefined) {
      user.freeTrial = { approved: false, used: false };
    }
    if (freeTrialApproved !== undefined) user.freeTrial.approved = freeTrialApproved;
    if (freeTrialUsed !== undefined) user.freeTrial.used = freeTrialUsed;

    // Update subscription plan reference, status, and expiry
    if (planId !== undefined) {
      if (planId === 'none') {
        user.subscription = {
          plan: null,
          status: 'inactive',
          expiry: null
        };
      } else {
        const plan = await Plan.findById(planId);
        if (plan) {
          const isNewPlan = !user.subscription?.plan || user.subscription.plan.toString() !== plan._id.toString();
          
          user.subscription.plan = plan._id;
          user.subscription.status = status || 'active';
          
          if (expiry && expiry.trim() !== '') {
            user.subscription.expiry = new Date(expiry);
          } else if (isNewPlan) {
            const exp = new Date();
            exp.setDate(exp.getDate() + plan.durationDays);
            user.subscription.expiry = exp;
          }
        }
      }
    } else if (expiry !== undefined) {
      user.subscription.expiry = (expiry && expiry.trim() !== '') ? new Date(expiry) : null;
      if (status) user.subscription.status = status;
    }

    // Ban / Unban triggers
    if (isBanned !== undefined) {
      user.isBanned = isBanned;
      user.banReason = isBanned ? (banReason || 'Banned by administrator') : '';
    }

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user: ' + error.message });
  }
};

// DELETE /api/admin/users/:id - Delete a user completely
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user: ' + error.message });
  }
};

// GET /api/admin/activity - Retrieve all users' activity logs (Admin Panel)
const getAllActivity = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const total = await Activity.countDocuments({});
    const activities = await Activity.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      status: true,
      activities,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve activity history: ' + error.message });
  }
};

// GET /api/admin/config - Get all global configurations
const getConfigs = async (req, res) => {
  try {
    const configs = await Config.find({}).sort({ key: 1 });
    res.json({
      status: true,
      configs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve configurations: ' + error.message });
  }
};

// PUT /api/admin/config - Upsert / update configuration by key
const updateConfig = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) {
      return res.status(400).json({ message: 'Configuration key is required' });
    }

    const configKey = key.trim().toUpperCase();
    const updatedConfig = await Config.findOneAndUpdate(
      { key: configKey },
      { value: value || '', description: description || '' },
      { upsert: true, new: true }
    );

    res.json({
      status: true,
      message: `Configuration ${configKey} updated successfully`,
      config: updatedConfig
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update configuration: ' + error.message });
  }
};

// DELETE /api/admin/config/:id - Delete custom configuration by ID
const deleteConfig = async (req, res) => {
  try {
    const config = await Config.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }
    res.json({
      status: true,
      message: `Configuration ${config.key} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete configuration: ' + error.message });
  }
};

// GET /api/admin/apikeys - Retrieve all custom API keys
const getApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({}).sort({ createdAt: -1 });
    res.json({
      status: true,
      keys
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve API keys: ' + error.message });
  }
};

// POST /api/admin/apikeys - Create a new API Key/Secret
const createApiKey = async (req, res) => {
  try {
    const { apiKey, apiSecret, allowedRequests, expiryDate } = req.body;

    if (!apiKey || !apiSecret || !expiryDate) {
      return res.status(400).json({ message: 'API Key, API Secret, and Expiry Date are required' });
    }

    const existing = await ApiKey.findOne({ apiKey: apiKey.trim() });
    if (existing) {
      return res.status(400).json({ message: 'API Key already exists' });
    }

    const key = await ApiKey.create({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      allowedRequests: parseInt(allowedRequests, 10) || 0,
      expiryDate: new Date(expiryDate)
    });

    res.status(201).json({
      status: true,
      message: 'API Key created successfully',
      key
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create API Key: ' + error.message });
  }
};

// DELETE /api/admin/apikeys/:id - Delete an API key
const deleteApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) {
      return res.status(404).json({ message: 'API Key not found' });
    }
    res.json({
      status: true,
      message: 'API Key deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete API Key: ' + error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllActivity,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getConfigs,
  updateConfig,
  deleteConfig
};
