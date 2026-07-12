const nodemailer = require('nodemailer');

const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Aimguard Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Aimguard - Elevated Gaming Experience',
      text: `Hello ${name},\n\nWelcome to Aimguard! Your account has been registered successfully.\n\nLogin to your dashboard to manage your subscription, link your game UID, download our premium launcher client, and configure your cheat feature flags.\n\nBest Regards,\nThe Aimguard Team`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
};

module.exports = { sendWelcomeEmail };
