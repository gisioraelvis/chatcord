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

io.socketsJoin("general");

// Run when client connects
io.on("connection", (socket) => {
  // console.log(io.of("/").adapter);

  socket.on("registerUser", ({ username }) => {
    const user = userJoin(socket.id, username, "general");
    socket.join(user.rooms[0]);
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));
    // Send users and room info
    io.to(socket.id).emit("roomUsers", { rooms: ["General", ...rooms], users });

    // Except to the newly registered user, broadcast the username to all other connected users
    socket.broadcast.except(socket.id).emit("newUserRegistered", user.username);
  });

  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    const currentRoom = user.rooms.find((r) => r === room);
    socket.join(currentRoom);

    // Broadcast when a user connects
    socket.broadcast
      .to(currentRoom)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );
  });

  // Listen for chat messages
  socket.on("chatMessage", ({ chatType, room, msg }) => {
    if (chatType === "private") {
      const username = users.find((user) => user.id === socket.id).username;
      const recipientUser = users.find((user) => user.username === room);
      io.to([socket.id, recipientUser.id]).emit(
        "message",
        formatMessage(username ?? recipientUser, msg)
      );
    } else {
      const user = getCurrentUser(socket.id);
      const currentRoom = user.rooms.find((r) => r === room);
      io.to(currentRoom).emit("message", formatMessage(user.username, msg));
    }
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
