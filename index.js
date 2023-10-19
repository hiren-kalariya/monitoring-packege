const { io } = require("socket.io-client");
const os = require("os");
const {
  getCPUInformation,
  getMemoryInformation,
  getFrequency,
} = require("./functions");
let i = true; // first time socket connect`
let IntervalID = {};

function joinRoom(token, serviceToken) {
  const socket = io("https://monitoring.tstpro.online/api/v11");

  const stopMonitoring = () => {
    clearInterval(IntervalID?.id);
    delete IntervalID?.id;
  };
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
  socket.on("disconnect", () => {
    stopMonitoring();
  }); // Join the room when connected initially

  socket.on("startTracing", () => {
    if (Object.keys(IntervalID).length > 0) return;
    const intervalIndex = setInterval(async () => {
      let usageData = {};
      const CPU_DATA = await getCPUInformation();
      const memoryUsage = await getMemoryInformation();
      usageData["CPU"] = {
        ...CPU_DATA,
        ...getFrequency(),
        hardware: `${os.cpus()[0].model} (${os.arch()})`,
        core: os.cpus()?.length,
      };
      usageData["Memory"] = { ...memoryUsage };

      socket.emit("usageData", {
        token,
        serviceToken,
        usageData,
      });
    }, 1000);

    IntervalID = {
      id: intervalIndex,
    };
  });

  socket.on("stopTracing", () => {
    if (IntervalID?.id) stopMonitoring();
  });

  socket.on("log", (details) => {
    // After running your code, you can check the connection status
    console.log(details);
  });
}

module.exports = joinRoom;
