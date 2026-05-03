const nodemailer = require("nodemailer");
const { env, smtpConfigured } = require("../config/env");
const { Listing } = require("../models/Listing");
const { Notification } = require("../models/Notification");
const { User } = require("../models/User");

function getTransporter() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: Number(env.smtp.port || 587),
    secure: Number(env.smtp.port) === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
}

function htmlEmail({ title, message, actionUrl }) {
  const safeTitle = String(title || "Rent Anything Anywhere");
  const safeMessage = String(message || "");
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <div style="width:44px;height:44px;border-radius:999px;background:linear-gradient(135deg,#111111,#8f7864);color:#fff;display:grid;place-items:center;font-weight:800;font-size:22px;margin-bottom:16px">R</div>
      <h2 style="margin:0 0 16px;color:#171717">Rent Anything Anywhere</h2>
      <h3 style="margin:0 0 12px">${safeTitle}</h3>
      <p style="line-height:1.6;margin:0 0 20px">${safeMessage}</p>
      ${actionUrl ? `<a href="${actionUrl}" style="display:inline-block;background:#171717;color:white;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">Open in app</a>` : ""}
      <p style="margin-top:24px;color:#64748b;font-size:13px">Rent Anything Anywhere</p>
    </div>
  `;
}

async function resolveUser(user) {
  if (!user) return null;
  if (user.email) return user;
  return User.findById(user).select("name email");
}

async function sendNotificationEmail({ user, title, message, actionUrl, subject }) {
  const recipient = await resolveUser(user);
  const transporter = getTransporter();
  if (!transporter || !recipient?.email) return;

  try {
    await transporter.sendMail({
      from: env.smtp.from || env.smtp.user,
      to: recipient.email,
      subject: subject || title,
      text: `${message}\n\n${actionUrl || ""}\n\nYou can manage notifications in your profile settings.`,
      html: htmlEmail({ title, message, actionUrl })
    });
  } catch (error) {
    console.error("Notification email failed:", error.message);
  }
}

async function createNotification({ user, type, title, message, body, data = {}, email = true, actionUrl, subject }) {
  if (!user) return null;

  const notification = await Notification.create({
    user,
    type,
    title,
    message: message || body || "",
    data
  });
  if (email) {
    await sendNotificationEmail({
      user,
      title,
      subject,
      message: message || body || "",
      actionUrl: actionUrl || data.actionUrl
    });
  }
  return notification;
}

async function notifyMany(users, notification) {
  const uniqueUsers = [...new Set(users.filter(Boolean).map((user) => user.toString()))];

  return Promise.all(
    uniqueUsers.map((user) =>
      createNotification({
        ...notification,
        user
      })
    )
  );
}

async function notifyExpiringListings() {
  const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const listings = await Listing.find({
    status: "active",
    expiresAt: { $gte: start, $lt: end },
    "expirationNotice.day25Sent": { $ne: true }
  }).populate("owner", "name email");

  for (const listing of listings) {
    await createNotification({
      user: listing.owner,
      type: "price_drop",
      title: "Listing expiring soon",
      message: `${listing.title} expires in about 5 days.`,
      data: { listingId: listing._id, actionUrl: `${env.clientUrl}/listings/${listing._id}` }
    });
    listing.expirationNotice = { day25Sent: true, sentAt: new Date() };
    await listing.save();
  }
}

module.exports = { createNotification, notifyMany, notifyExpiringListings };
