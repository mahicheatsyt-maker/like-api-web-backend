const Plan = require('../models/Plan');
const Config = require('../models/Config');

const seedDB = async () => {
  try {
    console.log('[Seeder] Auditing database configuration keys...');

    // Seed maintenance mode config if missing
    const maintenanceConfig = await Config.findOne({ key: 'MAINTENANCE_MODE' });
    if (!maintenanceConfig) {
      await Config.create({
        key: 'MAINTENANCE_MODE',
        value: 'false',
        description: 'Toggle to put the website under maintenance mode'
      });
      console.log('[Seeder] MAINTENANCE_MODE seeded as false');
    }

    const announcementConfig = await Config.findOne({ key: 'ANNOUNCEMENT' });
    if (!announcementConfig) {
      await Config.create({
        key: 'ANNOUNCEMENT',
        value: 'Welcome to Aimguard Like Bot! Active servers: IND and AG. NX server coming soon.',
        description: 'Global notification alert banner displayed on dashboard'
      });
      console.log('[Seeder] ANNOUNCEMENT seeded');
    }

    // Seed plans if the collection is empty
    const plansCount = await Plan.countDocuments();
    if (plansCount === 0) {
      console.log('[Seeder] Plans collection empty. Pre-seeding Like Bot catalog...');
      await Plan.insertMany([
        {
          name: 'Weekly Access',
          durationDays: 7,
          durationLabel: '7 Days',
          price: 299,
          maxReqsPerDay: 1,
          allowAutolike: false,
          features: [
            '1 request per day (any UID)',
            '220 to 300+ likes per request',
            'IND & AG Region Support',
            'NX Server (Coming Soon)',
            'Priority support'
          ],
          isActive: true
        },
        {
          name: 'Monthly Pro',
          durationDays: 30,
          durationLabel: '30 Days',
          price: 999,
          maxReqsPerDay: 2,
          allowAutolike: true,
          features: [
            '2 requests per day (any UID)',
            '220 to 300+ likes per request',
            '24/7 Autolike Setup (automatic daily likes)',
            'Keep 1 manual request available during autolike',
            'IND & AG Region Support',
            'NX Server (Coming Soon)',
            'Priority support'
          ],
          isActive: true
        },
        {
          name: 'Elite Access (Coming Soon)',
          durationDays: 90,
          durationLabel: 'Coming Soon',
          price: 2499,
          maxReqsPerDay: 3,
          allowAutolike: true,
          features: [
            '3 requests per day (any UID)',
            '300+ likes per request',
            '24/7 Autolike Setup included',
            'All region servers (IND, AG, NX) supported',
            'Ultra VIP support'
          ],
          isActive: false // Shown as Coming Soon on landing page
        }
      ]);
      console.log('[Seeder] Pricing plans successfully seeded.');
    } else {
      // If plans exist, update them with AG support
      const existingPlans = await Plan.find({});
      for (const plan of existingPlans) {
        let updated = false;
        
        // Update features to include AG
        if (plan.features && Array.isArray(plan.features)) {
          const newFeatures = plan.features.map(f => {
            if (f.includes('IND Region Supported (AG/NX coming soon)')) {
              return f.replace('IND Region Supported (AG/NX coming soon)', 'IND & AG Region Support');
            }
            if (f.includes('IND Region Supported')) {
              return f.replace('IND Region Supported', 'IND & AG Region Support');
            }
            return f;
          });
          
          // Add AG support if not present
          if (!newFeatures.some(f => f.includes('AG'))) {
            // Find index of IND related feature
            const indIndex = newFeatures.findIndex(f => f.includes('IND'));
            if (indIndex !== -1) {
              newFeatures[indIndex] = newFeatures[indIndex].replace('IND', 'IND & AG');
            }
          }
          
          plan.features = newFeatures;
          updated = true;
        }
        
        // Ensure maxReqsPerDay exists
        if (plan.maxReqsPerDay === undefined) {
          plan.maxReqsPerDay = plan.durationDays === 7 ? 1 : (plan.durationDays === 30 ? 2 : 3);
          updated = true;
        }
        
        // Ensure allowAutolike exists
        if (plan.allowAutolike === undefined) {
          plan.allowAutolike = plan.durationDays !== 7;
          updated = true;
        }
        
        if (updated) {
          await plan.save();
        }
      }
      console.log('[Seeder] Checked and updated existing plans fields with AG support.');
    }

    console.log('[Seeder] Database configuration audit completed successfully.');
  } catch (error) {
    console.error('[Seeder] Database seeding error:', error);
  }
};

module.exports = { seedDB };
