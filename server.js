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

io.socketsJoin("General");

// Run when client connects
io.on("connection", (socket) => {
  // console.log(io.of("/").adapter);

  socket.on("registerUser", ({ username }) => {
    const user = userJoin(socket.id, username, "General");
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));
    // Send users and rooms
    io.to(socket.id).emit("roomUsers", { rooms: ["General", ...rooms], users });

    // Broadcast when a user connects
    socket.broadcast.except(socket.id).emit("newUserRegistered", user.username);

    // Broadcast to general room
    socket.broadcast
      .to("General")
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );
  });

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(room);
    // Broadcast when a user connects
    socket.broadcast
      .to(room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );
  });

  socket.on("privateMessage", ({ sender, recipient, message }) => {
    const recipientUser = users.find((user) => user.username === recipient);
    io.to([socket.id, recipientUser.id]).emit(
      "message",
      formatMessage(sender, message)
    );
  });

  socket.on("roomMessage", ({ currentRoom, msg }) => {
    const user = getCurrentUser(socket.id);
    io.to(currentRoom).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
