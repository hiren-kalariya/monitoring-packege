const { inetLatency } = require("./internet");
const { mem } = require("./memory");
const { currentLoad } = require("./process");
const os = require("os");

const getCPUInformation = async () => {
  try {
    const cpuData = await currentLoad();
    const latency = await inetLatency();
    return {
      user: +(cpuData?.currentLoad).toFixed(2) || 0,
      System: +(cpuData?.currentLoadSystem).toFixed(2) || 0,
      Idle: +(cpuData?.currentLoadIdle).toFixed(2) || 0,

      Core:
        cpuData?.cpus?.map((item) => ({
          speed: item.speed,
          model: item.model,
          usage: +(100 - +item?.loadIdle).toFixed(2),
        })) || [],
      latency,
    };
  } catch (error) {
    return {};
  }
};

const getMemoryInformation = async () => {
  try {
    const memory = await mem();

    return memory;
  } catch (error) {
    return {};
  }
};

const getFrequency = () => {
  const coreFrequencies = os
    .cpus()
    .map((core) => `${(core.speed / 1000).toFixed(2)} GHz`);

  // Count the number of cores for each unique frequency
  const frequencyCounts = coreFrequencies.reduce((countMap, frequency) => {
    countMap[frequency] = (countMap[frequency] || 0) + 1;
    return countMap;
  }, {});

  // Generate the summary string
  const summary = Object.entries(frequencyCounts)
    .map(([frequency, count]) => `${count} x ${frequency}`)
    .join(", ");

  return {
    frequencyCounts: summary,
  };
};

module.exports = {
  getCPUInformation,
  getMemoryInformation,
  getFrequency,
};
