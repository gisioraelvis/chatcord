const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const { instrument, RedisStore } = require("@socket.io/admin-ui");
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  users,
  rooms,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

pubClient = createClient({ url: "redis://127.0.0.1:6379" });

if (process.env.NODE_ENV === "development") {
  instrument(io, {
    store: new RedisStore(createClient),
    auth: false,
  });
}

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatCord Bot";

(async () => {
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Run when client connects
io.on("connection", (socket) => {
  // console.log(io.of("/").adapter);

  // catch all debug listners
  socket.onAny((event, ...args) => {
    console.log(`Incoming event: ${event}, args:`, args);
  });

  socket.onAnyOutgoing((event, ...args) => {
    console.log(`Outgoing event: ${event}, args:`, args);
  });

  socket.on("registerUser", ({ username }) => {
    const user = userJoin(socket.id, username, rooms[0]);
    socket.join(rooms[0]);
    socket.emit("message", {
      room: rooms[0],
      message: formatMessage(botName, "Welcome to ChatCord!"),
    });

    // Send users and rooms
    io.to(socket.id).emit("roomUsers", { rooms, users });

    // Broadcast when a user connects
    socket.broadcast.emit("newUserRegistered", user.username);
    socket.broadcast.emit("message", {
      room: rooms[0],
      message: formatMessage(botName, `${user.username} has joined the chat`),
    });
  });

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(room);
    // Broadcast to room when a user connects
    socket.broadcast.to(room).emit("message", {
      room: room,
      message: formatMessage(botName, `${user.username} has joined the chat`),
    });
  });

  socket.on("privateMessage", ({ sender, recipient, message }) => {
    const recipientUser = users.find((user) => user.username === recipient);
    io.to(recipientUser.id).emit("message", {
      room: sender,
      message: formatMessage(sender, message),
    });
  });

  socket.on("roomMessage", ({ currentRoom, msg }) => {
    const user = getCurrentUser(socket.id);
    io.to(currentRoom).emit("message", {
      room: currentRoom,
      message: formatMessage(user.username, msg),
    });
  });

  // When client leaves
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(rooms[0]).emit("message", {
        room: rooms[0],
        message: formatMessage(botName, `${user.username} has left the chat`),
      });

      // Send users and rooms
      io.emit("roomUsers", { rooms, users });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
