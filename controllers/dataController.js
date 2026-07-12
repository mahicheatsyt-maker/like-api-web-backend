const Plan = require('../models/Plan');
const Content = require('../models/Content');

const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const getTutorials = async (req, res) => {
  try {
    const tutorials = await Content.find({ type: 'tutorial', isActive: true });
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Basic admin seeding capability if it's empty
const seedData = async (req, res) => {
  try {
    const plansCount = await Plan.countDocuments();
    if (plansCount === 0) {
      await Plan.insertMany([
        { name: 'Weekly Access', durationDays: 7, durationLabel: '1 Week', price: 299, maxUidUpdates: 1, features: ['External Panel + AI Aimbot', 'All Emulators Supported', 'Wall Chams & Box ESP', '1 UID change + 2 HWID Resets'] },
        { name: 'Monthly Pro', durationDays: 30, durationLabel: '1 Month', price: 999, maxUidUpdates: 2, features: ['External Panel + AI Aimbot Pro', 'AI Sniper Scope & Fast Switch', 'All Emulators Supported', '2 UID changes + 2 HWID Resets'] },
        { name: 'Lifetime Ultimate', durationDays: 36500, durationLabel: 'Lifetime', price: 4999, maxUidUpdates: -1, features: ['External Panel + AI Aimbot Elite', 'AI Sniper Scope & Fast Switch', 'All Emulators Supported', 'Unlimited UID changes + 2 HWID Resets'] }
      ]);
    }
    res.json({ message: 'Data seeded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Admin CRUD functions
const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(plan);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plan removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createContent = async (req, res) => {
  try {
    const content = await Content.create(req.body);
    res.status(201).json(content);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(content);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteContent = async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ message: 'Content removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  getAllPlans,
  getTutorials,
  seedData,
  createPlan, updatePlan, deletePlan,
  createContent, updateContent, deleteContent
};
