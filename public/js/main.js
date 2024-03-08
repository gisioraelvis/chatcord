const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomList = document.getElementById("rooms");
const userList = document.getElementById("users");

const { username } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit("registerUser", { username });

// Messages from server
let messages = {};

socket.on("message", (messageObj) => {
  // Add message to messages object
  if (!messages[messageObj.room]) {
    messages[messageObj.room] = [];
  }
  messages[messageObj.room].push(messageObj);

  // If the message's room matches the current room or user, display the message
  if (messageObj.room === currentRoom || messageObj.room === currentUser) {
    outputMessage(messageObj.message);
    // Scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

// Get room and users
socket.on("roomUsers", ({ rooms, users }) => {
  outputRooms(rooms);
  outputUsers(users);
});

let currentRoom = "General";
let currentUser = null;

// Add rooms to DOM
function outputRooms(rooms) {
  roomList.innerHTML = "";
  rooms.forEach((rm) => {
    const li = document.createElement("li");
    li.innerText = rm;
    li.addEventListener("click", () => {
      // Remove 'selected' class from all items
      document
        .querySelectorAll("li")
        .forEach((item) => item.classList.remove("selected"));
      // Add 'selected' class to clicked item
      li.classList.add("selected");
      currentRoom = rm;
      currentUser = null; // Reset selected user

      socket.emit("joinRoom", { username, room: rm });

      // Clear chat messages
      document.querySelector(".chat-messages").innerHTML = "";

      // Display all messages for this room
      if (messages[currentRoom]) {
        messages[currentRoom].forEach((obj) => outputMessage(obj.message));
      }
    });
    roomList.appendChild(li);
  });

  // Select the General room by default
  roomList.firstChild.classList.add("selected");
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = "";

  // Current user to be top of the list, preserve order of other users
  users.sort((a, b) =>
    a.username === username ? -1 : b.username === username ? 1 : 0
  );

  users.forEach((user) => {
    userList.appendChild(createUserLi(user));
  });
}

// Create user list item
function createUserLi(user) {
  const li = document.createElement("li");
  li.innerText = user.username;

  // Add "(Me)" to current user
  if (user.username === username) {
    li.innerText += " (Me)";
  }

  li.addEventListener("click", () => {
    // Remove 'selected' class from all items
    document
      .querySelectorAll("li")
      .forEach((item) => item.classList.remove("selected"));
    // Add 'selected' class to clicked item
    li.classList.add("selected");
    currentUser = user.username;
    currentRoom = null; // Reset selected room

    // Clear chat messages
    document.querySelector(".chat-messages").innerHTML = "";

    // Display all messages for this user
    if (messages[currentUser]) {
      messages[currentUser].forEach((obj) => outputMessage(obj.message));
    }
  });
  return li;
}

// Update users list
socket.on("newUserRegistered", (newUsername) => {
  const li = createUserLi({ username: newUsername });
  userList.appendChild(li);
});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = message.username;
  p.innerHTML += `<span> ${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement("p");
  para.classList.add("text");
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector(".chat-messages").appendChild(div);
}

// Chat form
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;
  msg = msg.trim();
  if (!msg) {
    return false;
  }

  // Check if a user or room is selected
  if (currentUser) {
    // Send private message
    socket.emit("privateMessage", {
      sender: username,
      recipient: currentUser,
      message: msg,
    });

    // Display message
    outputMessage({
      username,
      text: msg,
      // moment().format('h:mm a')
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }),
    });
  } else if (currentRoom) {
    socket.emit("roomMessage", { currentRoom, msg });
  }

  // Clear input
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// Prompt the user before leave chat room
document.getElementById("leave-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to leave?")) {
    socket.disconnect();
    window.location = "../index.html";
  }
});

// Disconnect the user when tab is closed
window.onbeforeunload = () => {
  socket.disconnect();
};

//  catch-all debug listeners
socket.onAnyOutgoing((event, ...args) => {
  console.log(`Outgoing event: ${event}, args:`, args);
});

socket.onAny((event, ...args) => {
  console.log(`Incoming event: ${event}, args:`, args);
});
