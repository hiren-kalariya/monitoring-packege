const { io } = require("socket.io-client");
const os = require("os");
const {
  getCPUInformation,
  getMemoryInformation,
  getFrequency,
} = require("./functions");
let i = true; // first time socket connect`
let isSendData = false; // first time socket connect`
let IntervalID = {};
let maxCPUUsageUser = 0;
let maxCPUUsageSystem = 0;
let maxMemoryUsage = 0;
let maxSwapMemoryUsage = 0;

const socket = io("https://monitoring.tstpro.online");

const RecordData = (usageData = {}) => {
  if (
    !("CPU" in usageData) ||
    !("user" in usageData?.CPU) ||
    !("System" in usageData?.CPU)
  )
    return;
  if (
    !("Memory" in usageData) ||
    !("used" in usageData?.Memory) ||
    !("swapused" in usageData?.Memory)
  )
    return;

  if (maxCPUUsageUser < usageData?.CPU?.user) {
    maxCPUUsageUser = usageData?.CPU?.user;
  }
  if (maxCPUUsageSystem < usageData?.CPU?.System) {
    maxCPUUsageSystem = usageData?.CPU?.System;
  }
  if (maxMemoryUsage < usageData?.Memory?.used) {
    maxMemoryUsage = +(usageData?.Memory?.used / (1024 * 1024 * 1024)).toFixed(
      2
    );
  }
  if (maxSwapMemoryUsage < usageData?.Memory?.swapused) {
    maxSwapMemoryUsage = +(
      usageData?.Memory?.swapused /
      (1024 * 1024 * 1024)
    ).toFixed(2);
  }
};

function init(token, serviceToken) {
  const stopMonitoring = () => {
    clearInterval(IntervalID?.id);
    clearInterval(IntervalID?.usageIntervalIndex);
    delete IntervalID?.id;
  };
  const startMonitoring = () => {
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

      RecordData(usageData);
      if (isSendData) {
        socket.emit("usageData", {
          token,
          serviceToken,
          usageData,
        });
      }
    }, 1000);

    const usageIntervalIndex = setInterval(async () => {
      socket.emit("updateUsage", {
        token,
        serviceToken,
        maxCPUUsageUser,
        maxCPUUsageSystem,
        maxMemoryUsage,
        maxSwapMemoryUsage,
      });
      maxCPUUsageUser = 0;
      maxCPUUsageSystem = 0;
      maxMemoryUsage = 0;
      maxSwapMemoryUsage = 0;
    }, 30 * 60 * 1000);

    IntervalID = {
      id: intervalIndex,
      usageIntervalIndex,
    };
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
    startMonitoring();
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
    isSendData = true;
  });

  socket.on("stopTracing", () => {
    isSendData = false;
  });

  socket.on("log", (details) => {
    // After running your code, you can check the connection status
    console.log(details);
  });
}

module.exports = init;

const alert = (name = " ", message = " ") => {
  socket.emit("alert", "Name : " + name + "\nMessage : " + message);
};

module.exports.alert = alert;