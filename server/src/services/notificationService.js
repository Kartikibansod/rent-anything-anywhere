const { Notification } = require("../models/Notification");

async function createNotification({ user, type, title, message, body, data = {} }) {
  if (!user) return null;

  return Notification.create({
    user,
    type,
    title,
    message: message || body || "",
    data
  });
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

module.exports = { createNotification, notifyMany };