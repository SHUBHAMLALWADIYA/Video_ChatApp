const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", () => {
    // Assign a partner or wait
    const availableUser = Object.keys(users).find((id) => id !== socket.id && users[id] === null);
    if (availableUser) {
      users[availableUser] = socket.id;
      users[socket.id] = availableUser;

      io.to(socket.id).emit("partner-found", availableUser);
      io.to(availableUser).emit("partner-found", socket.id);
    } else {
      users[socket.id] = null;
    }
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    const partnerId = users[socket.id];
    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
      users[partnerId] = null;
    }
    delete users[socket.id];
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
