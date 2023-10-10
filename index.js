const { io } = require("socket.io-client");
let i = true; // first time socket connect`
function joinRoom(token, serviceToken) {
  const socket = io("https://dev-monitoring.tstpro.online");

  process.on("uncaughtException", (err) => {
    socket.emit(
      "error",
      "Name : " +
        err.name +
        "\nMessage : " +
        err.message +
        "\nstack : " +
        err.stack
    );
  });

  const joinRoomEvent = () => {
    if (i) {
      i = false;
      socket.emit("join-room", {
        token,
        serviceToken,
      });
    } else {
      socket.emit("re-join-room", {
        token,
        serviceToken,
      });
    }
  };
  socket.on("connect", joinRoomEvent); // Join the room when connected initially

  socket.on("log", (details) => {
    // After running your code, you can check the connection status
    console.log(details);
  });
}

module.exports = joinRoom;
