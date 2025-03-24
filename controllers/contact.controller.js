const db = require('../models');
const nodemailer = require('nodemailer');

// Debug: Log the db object to see what's available
console.log('db in contact.controller.js:', Object.keys(db));

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message, userType } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message || !userType) {
      return res.status(400).send({ message: 'All fields are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send({ message: 'Invalid email address' });
    }

    // Validate userType
    const validUserTypes = ['general', 'client', 'engineer', 'partner'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).send({ message: 'Invalid user type' });
    }

    // Store the message in the database
    const contactMessage = await db.contact_messages.create({
      name,
      email,
      subject,
      message,
      user_type: userType,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Send email notification to support team (optional)
    if (process.env.SUPPORT_EMAIL) {
      const supportMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.SUPPORT_EMAIL,
        subject: `New Contact Message: ${subject}`,
        text: `
          You have received a new message from the LevKonnect Contact Form.

          Name: ${name}
          Email: ${email}
          User Type: ${userType}
          Subject: ${subject}
          Message: ${message}

          Sent on: ${new Date().toLocaleString()}
        `,
        html: `
          <h2>New Contact Message</h2>
          <p>You have received a new message from the LevKonnect Contact Form.</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>User Type:</strong> ${userType}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Sent on:</strong> ${new Date().toLocaleString()}</p>
        `,
      };

      console.log('Sending email to support with options:', supportMailOptions);

      await transporter.sendMail(supportMailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email to support:', error.message);
        } else {
          console.log('Email to support sent successfully:', info.response);
        }
      });
    } else {
      console.warn('SUPPORT_EMAIL not defined; skipping support email notification');
    }

    // Send thank-you email to the sender
    const thankYouMailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // Use the sender's email from the form
      subject: 'Thank You for Contacting LevKonnect',
      text: `
        Dear ${name},

        Thank you for reaching out to us through the LevKonnect Contact Form! We have received your message and will get back to you as soon as possible.

        Here are the details of your submission:
        Name: ${name}
        Email: ${email}
        User Type: ${userType}
        Subject: ${subject}
        Message: ${message}

        If you have any further questions, feel free to reply to this email.

        Best regards,
        The LevKonnect Team
        Sent on: ${new Date().toLocaleString()}
      `,
      html: `
        <h2>Thank You for Contacting LevKonnect</h2>
        <p>Dear ${name},</p>
        <p>Thank you for reaching out to us through the LevKonnect Contact Form! We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Here are the details of your submission:</strong></p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>User Type:</strong> ${userType}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>If you have any further questions, feel free to reply to this email.</p>
        <p>Best regards,<br>The LevKonnect Team</p>
        <p><strong>Sent on:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    console.log('Sending thank-you email to sender with options:', thankYouMailOptions);

    await transporter.sendMail(thankYouMailOptions, (error, info) => {
      if (error) {
        console.error('Error sending thank-you email to sender:', error.message);
      } else {
        console.log('Thank-you email to sender sent successfully:', info.response);
      }
    });

    res.status(200).send({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error submitting contact message:', error.message);
    res.status(500).send({ message: 'Failed to send message', error: error.message });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const messages = await db.contact_messages.findAll({
      order: [['created_at', 'DESC']],
    });
    res.status(200).send(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error.message);
    res.status(500).send({ message: 'Failed to fetch messages', error: error.message });
  }
};