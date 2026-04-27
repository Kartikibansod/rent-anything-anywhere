const setupSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("send-message", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("receive-message", payload);
    });

    socket.on("join-chat", ({ conversationId }) => {
      if (conversationId) socket.join(`chat:${conversationId}`);
    });

    socket.on("leave-chat", ({ conversationId }) => {
      if (conversationId) socket.leave(`chat:${conversationId}`);
    });

    socket.on("call-request", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-request", payload);
    });

    socket.on("call-accept", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-accept", payload);
    });

    socket.on("call-reject", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-reject", payload);
    });

    socket.on("ice-candidate", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("ice-candidate", payload);
    });

    socket.on("call-offer", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-offer", payload);
    });

    socket.on("call-answer", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-answer", payload);
    });

    socket.on("call-end", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("call-end", payload);
    });

    socket.on("price-drop-notification", (payload) => {
      io.to(`user:${payload.receiverId}`).emit("price-drop-notification", payload);
    });
  });
};

module.exports = setupSocket;