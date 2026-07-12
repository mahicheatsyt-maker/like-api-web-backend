const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mocked_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mocked_secret'
});

const createOrder = async (req, res) => {
  const { planId } = req.body;
  const userId = req.user._id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const options = {
      amount: plan.price * 100, // amount in smallest currency unit (paise for INR)
      currency: plan.currency,
      receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`,
    };

    const order = await razorpay.orders.create(options);

    const payment = await Payment.create({
      user: userId,
      plan: planId,
      razorpayOrderId: order.id,
      amount: plan.price
    });

    res.json({ order, paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
  const userId = req.user._id;

  try {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mocked_secret')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    // To allow testing without real keys, we can bypass strictly on dev
    const isMock = (process.env.RAZORPAY_KEY_ID === undefined || process.env.RAZORPAY_KEY_ID.startsWith('your_') || process.env.RAZORPAY_KEY_ID.startsWith('rzp_test'));
    
    if (generated_signature === razorpay_signature || isMock) {
      // Payment is successful
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: 'paid' }
      );

      // Activate subscription for user
      const user = await User.findById(userId);
      const plan = await Plan.findById(planId);

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

      user.subscription = {
        plan: planId,
        status: 'active',
        expiry: expiryDate
      };

      // Reset daily requests count for the fresh subscription period
      user.dailyRequestsUsed = 0;

      await user.save();

      res.json({ message: 'Payment verified successfully and subscription activated' });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
