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

// Message from server
socket.on("message", (message) => {
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

// Get room and users
socket.on("roomUsers", ({ rooms, users }) => {
  outputRooms(rooms);
  outputUsers(users);
});

let currentUser = null;
let currentRoom = null;

// Add rooms to DOM
function outputRooms(rooms) {
  roomList.innerHTML = "";
  rooms.forEach((rm) => {
    const li = document.createElement("li");
    li.innerText = rm;
    li.addEventListener("click", () => {
      document
        .querySelectorAll("li")
        .forEach((item) => item.classList.remove("selected"));
      li.classList.add("selected");
      currentRoom = rm;
      currentUser = null; // Reset selected user

      socket.emit("joinRoom", { username, room: rm });
    });

    // Set General room as default
    if (rm === "General") {
      li.classList.add("selected");
      currentRoom = rm;
      currentUser = null; // Reset selected user
    }

    roomList.appendChild(li);
  });
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = "";
  // Find the current user
  const currentUserIndex = users.findIndex(
    (user) => user.username === username
  );
  if (currentUserIndex !== -1) {
    const currentUser = users.splice(currentUserIndex, 1)[0];
    const currentUserLi = createUserLi(currentUser);
    userList.appendChild(currentUserLi);
  }
  // Add the rest of the users
  users.forEach((user) => {
    const userLi = createUserLi(user);
    userList.appendChild(userLi);
  });
}

// Create user list item
function createUserLi(user) {
  const li = document.createElement("li");
  li.innerText = user.username;
  li.addEventListener("click", () => {
    document
      .querySelectorAll("li")
      .forEach((item) => item.classList.remove("selected"));
    li.classList.add("selected");
    currentUser = user.username;
    currentRoom = null; // Reset selected room
  });
  return li;
}

// Update users list
socket.on("newUserRegistered", (newUsername) => {
  const li = document.createElement("li");
  li.innerText = newUsername;
  li.addEventListener("click", () => {
    document
      .querySelectorAll("li")
      .forEach((item) => item.classList.remove("selected"));
    li.style.backgroundColor = "lightblue";
    currentRoom = null; // Reset selected room
  });
  userList.appendChild(li);
});

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
  } else if (currentRoom) {
    socket.emit("roomMessage", { currentRoom, msg });
  }

  // Clear input
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// Prompt the user before leave chat room
document.getElementById("leave-btn").addEventListener("click", () => {
  const leaveRoom = confirm("Are you sure you want to leave the chatroom?");
  if (leaveRoom) {
    window.location = "../index.html";
  } else {
  }
});

//  catch-all debug listeners
socket.onAnyOutgoing((event, ...args) => {
  console.log(`Outgoing event: ${event}, args:`, args);
});

socket.onAny((event, ...args) => {
  console.log(`Incoming event: ${event}, args:`, args);
});
