const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomList = document.getElementById("rooms");
const userList = document.getElementById("users");

const { chatType, username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit("registerUser", { username });

// Get room and users
socket.on("roomUsers", ({ rooms, users }) => {
  outputRooms(rooms);
  outputUsers(users);
});

// Message from server
socket.on("message", (message) => {
  console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  sendMessage(msg);

  // Clear input
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

function sendMessage(msg) {
  // Emit message to server
  socket.emit("chatMessage", { chatType, room, msg });
}

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement("p");
  para.classList.add("text");
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector(".chat-messages").appendChild(div);
}

// Add rooms to DOM
function outputRooms(rooms) {
  roomList.innerHTML = "";
  rooms.forEach((rm) => {
    const li = document.createElement("li");
    li.innerText = rm;
    li.addEventListener("click", () => {
      li.style.backgroundColor = "lightblue";
      window.location = `chat.html?chatType=group&username=${username}&room=${rm}`;
      socket.emit("joinRoom", { username, room: rm });
    });
    roomList.appendChild(li);
  });
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.innerText = user.username;
    li.addEventListener("click", () => {
      li.style.backgroundColor = "lightblue";
      window.location = `chat.html?chatType=private&username=${username}&room=${user.username}`;
    });
    userList.appendChild(li);
  });
}

// Update users list
socket.on("newUserRegistered", (newUsername) => {
  const li = document.createElement("li");
  li.innerText = newUsername;
  li.addEventListener("click", () => {
    li.style.backgroundColor = "lightblue";
    window.location = `chat.html?chatType=private&username=${username}&room=${newUsername}`;
  });
  userList.appendChild(li);
});

// // Join room
// roomList.addEventListener("click", (e) => {
//   if (e.target.tagName === "LI") {
//     window.location = `chat.html?chatType=${group}&username=${username}&room=${e.target.innerText}`;
//     socket.emit("joinRoom", { username, room: e.target.innerText });
//   }
// });

//Prompt the user before leave chat room
document.getElementById("leave-btn").addEventListener("click", () => {
  const leaveRoom = confirm("Are you sure you want to leave the chatroom?");
  if (leaveRoom) {
    window.location = "../index.html";
  } else {
  }
});
