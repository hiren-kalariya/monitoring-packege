const { io } = require("socket.io-client");
const os = require("os");
const cluster = require("cluster");
const {
  getCPUInformation,
  getMemoryInformation,
  getFrequency,
} = require("./functions");
const { processes } = require("./proccess");
let i = true; // first time socket connect`
let isSendData = false; // first time socket connect`
let IntervalID = {};

let maxCPUUsageUser = 0;
let maxCPUUsageSystem = 0;
let maxMemoryUsage = 0;
let maxSwapMemoryUsage = 0;
let totalMemory = 0;

let maxProcessCPUUsage = 0;
let maxProcessMemoryUsage = 0;

let disConnectTime = new Date().toUTCString();

const socket = io("https://dev-monitoring.tstpro.online");

const RecordData = (usageData = {}) => {
  if (
    !("CPU" in usageData) ||
    !("user" in usageData?.CPU) ||
    !("System" in usageData?.CPU) ||
    !("Memory" in usageData) ||
    !("used" in usageData?.Memory) ||
    !("swapused" in usageData?.Memory) ||
    !("Process" in usageData)
  )
    return;

  totalMemory = +(
    (usageData?.Memory?.total + usageData?.Memory?.swaptotal) /
    (1024 * 1024 * 1024)
  ).toFixed(2);

  const NODE_CPU_LOADD = usageData?.Process?.[process.pid]?.reduce(
    (total, currant) => {
      return [total[0] + currant?.cpu, total[1] + currant?.mem];
    },
    [0, 0]
  );

  if (
    maxCPUUsageUser + maxCPUUsageSystem <
    usageData?.CPU?.user + usageData?.CPU?.System
  ) {
    maxCPUUsageUser = usageData?.CPU?.user;
    maxCPUUsageSystem = usageData?.CPU?.System;
  }

  if (NODE_CPU_LOADD[0] > 100) {
    socket.emit(
      "error",
      "process : " +
        JSON.stringify(usageData?.Process) +
        "\nprocessID : " +
        process.pid +
        "\nNODE_CPU_LOADD : " +
        NODE_CPU_LOADD[0],
      "\nNODE_MEMORU_LOADD : " + NODE_CPU_LOADD[1]
    );
  }

  if (maxProcessCPUUsage < NODE_CPU_LOADD[0]) {
    maxProcessCPUUsage = NODE_CPU_LOADD[0];
  }

  if (maxProcessMemoryUsage < NODE_CPU_LOADD[1]) {
    maxProcessMemoryUsage = NODE_CPU_LOADD[1];
  }

  if (
    maxMemoryUsage + maxSwapMemoryUsage <
    usageData?.Memory?.used + usageData?.Memory?.swapused
  ) {
    maxMemoryUsage = +(usageData?.Memory?.used / (1024 * 1024 * 1024)).toFixed(
      2
    );
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
      const data = await processes();
      const runningProcess = data.list.filter(
        (el) => el.parentPid == process.ppid
      );

      usageData["CPU"] = {
        ...CPU_DATA,
        ...getFrequency(),
        hardware: `${os.cpus()[0].model} (${os.arch()})`,
        core: os.cpus()?.length,
      };
      usageData["Memory"] = { ...memoryUsage };
      usageData["Process"] = { [process.pid]: runningProcess };
      RecordData(usageData);
      if (isSendData) {
        socket.emit("usageData", {
          token,
          serviceToken,
          pid: process.pid,
          ppid: process.ppid,
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
        totalMemory,
        maxProcessCPUUsage,
        maxProcessMemoryUsage,
      });
      maxCPUUsageUser = 0;
      maxCPUUsageSystem = 0;
      maxMemoryUsage = 0;
      maxSwapMemoryUsage = 0;
      maxProcessCPUUsage = 0;
      maxProcessMemoryUsage = 0;
      totalMemory = 0;
    }, 10 * 60 * 1000);

    IntervalID = {
      id: intervalIndex,
      usageIntervalIndex,
    };
  };
  process.on("uncaughtException", (err) => {
    console.log(err);
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
        pid: process.pid,
        ppid: process.ppid,
        cluster: {
          isWorker: cluster.isWorker,
          isMaster: cluster.isMaster,
        },
      });
    } else {
      socket.emit("re-join-room", {
        token,
        serviceToken,
        pid: process.pid,
        ppid: process.ppid,
        disConnectTime,
        cluster: {
          isWorker: cluster.isWorker,
          isMaster: cluster.isMaster,
        },
      });
    }
  };

  socket.on("connect", joinRoomEvent); // Join the room when connected initially
  socket.on("disconnect", () => {
    disConnectTime = new Date().toUTCString();
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

const alert = (message = " ") => {
  socket.emit("alert", {
    type: "alert",
    message,
  });
};
const success = (message = " ") => {
  socket.emit("alert", {
    type: "success",
    message,
  });
};

const fail = (message = " ") => {
  socket.emit("alert", {
    type: "fail",
    message,
  });
};

const requestMonitoring = (req, res, next) => {
  const requestReceivedTime = new Date();
  socket.emit("requestStart", {
    method: req.method,
    originalUrl: req.originalUrl,
    requestReceivedTime: requestReceivedTime.toUTCString(),
  });

  // Continue to the next middleware or route handler
  res.on("finish", () => {
    console.log("Stop", requestReceivedTime.toUTCString());
    const responseSentTime = new Date();
    const timeDifference = responseSentTime - requestReceivedTime;

    // Check the response status
    const responseStatus = res.statusCode;

    socket.emit("responseSent", {
      method: req.method,
      originalUrl: req.originalUrl,
      requestReceivedTime: requestReceivedTime.toUTCString(),
      timeDifference,
      responseStatus,
    });
  });

  next();
};

module.exports = {
  init,
  alert,
  success,
  fail,
  requestMonitoring,
};
