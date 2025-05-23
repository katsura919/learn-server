// socket.js
const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // Example category logic
    socket.on("create_category", (data) => {
      // In real use, you’d interact with DB here
      const newCategory = {
        id: Date.now().toString(),
        name: data.name,
      };

      socket.emit("category_created", newCategory);
      socket.broadcast.emit("new_category", newCategory);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};


const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
