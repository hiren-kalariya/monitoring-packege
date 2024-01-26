"use strict";

const os = require("os");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;

const util = require("./util");

let _platform = process.platform;
console.log(_platform);

const _linux = _platform === "linux" || _platform === "android";
const _darwin = _platform === "darwin";
const _windows = _platform === "win32";
const _freebsd = _platform === "freebsd";
const _openbsd = _platform === "openbsd";
const _netbsd = _platform === "netbsd";
const _sunos = _platform === "sunos";

const _processes_cpu = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {},
};

const _winStatusValues = {
  0: "unknown",
  1: "other",
  2: "ready",
  3: "running",
  4: "blocked",
  5: "suspended blocked",
  6: "suspended ready",
  7: "terminated",
  8: "stopped",
  9: "growing",
};

function parseProcStat(line) {
  let parts = line.replace(/ +/g, " ").split(" ");
  let user = parts.length >= 2 ? parseInt(parts[1]) : 0;
  let nice = parts.length >= 3 ? parseInt(parts[2]) : 0;
  let system = parts.length >= 4 ? parseInt(parts[3]) : 0;
  let idle = parts.length >= 5 ? parseInt(parts[4]) : 0;
  let iowait = parts.length >= 6 ? parseInt(parts[5]) : 0;
  let irq = parts.length >= 7 ? parseInt(parts[6]) : 0;
  let softirq = parts.length >= 8 ? parseInt(parts[7]) : 0;
  let steal = parts.length >= 9 ? parseInt(parts[8]) : 0;
  let guest = parts.length >= 10 ? parseInt(parts[9]) : 0;
  let guest_nice = parts.length >= 11 ? parseInt(parts[10]) : 0;
  return (
    user +
    nice +
    system +
    idle +
    iowait +
    irq +
    softirq +
    steal +
    guest +
    guest_nice
  );
}

function calcProcStatLinux(line, all, _cpu_old) {
  let statparts = line.replace(/ +/g, " ").split(")");
  if (statparts.length >= 2) {
    let parts = statparts[1].split(" ");
    if (parts.length >= 16) {
      let pid = parseInt(statparts[0].split(" ")[0]);
      let utime = parseInt(parts[12]);
      let stime = parseInt(parts[13]);
      let cutime = parseInt(parts[14]);
      let cstime = parseInt(parts[15]);

      // calc
      let cpuu = 0;
      let cpus = 0;
      if (_cpu_old.all > 0 && _cpu_old.list[pid]) {
        cpuu =
          ((utime +
            cutime -
            _cpu_old.list[pid].utime -
            _cpu_old.list[pid].cutime) /
            (all - _cpu_old.all)) *
          100; // user
        cpus =
          ((stime +
            cstime -
            _cpu_old.list[pid].stime -
            _cpu_old.list[pid].cstime) /
            (all - _cpu_old.all)) *
          100; // system
      } else {
        cpuu = ((utime + cutime) / all) * 100; // user
        cpus = ((stime + cstime) / all) * 100; // system
      }
      return {
        pid: pid,
        utime: utime,
        stime: stime,
        cutime: cutime,
        cstime: cstime,
        cpuu: cpuu,
        cpus: cpus,
      };
    } else {
      return {
        pid: 0,
        utime: 0,
        stime: 0,
        cutime: 0,
        cstime: 0,
        cpuu: 0,
        cpus: 0,
      };
    }
  } else {
    return {
      pid: 0,
      utime: 0,
      stime: 0,
      cutime: 0,
      cstime: 0,
      cpuu: 0,
      cpus: 0,
    };
  }
}

function calcProcStatWin(procStat, all, _cpu_old) {
  // calc
  let cpuu = 0;
  let cpus = 0;
  if (_cpu_old.all > 0 && _cpu_old.list[procStat.pid]) {
    cpuu =
      ((procStat.utime - _cpu_old.list[procStat.pid].utime) /
        (all - _cpu_old.all)) *
      100; // user
    cpus =
      ((procStat.stime - _cpu_old.list[procStat.pid].stime) /
        (all - _cpu_old.all)) *
      100; // system
  } else {
    cpuu = (procStat.utime / all) * 100; // user
    cpus = (procStat.stime / all) * 100; // system
  }
  return {
    pid: procStat.pid,
    utime: procStat.utime,
    stime: procStat.stime,
    cpuu: cpuu > 0 ? cpuu : 0,
    cpus: cpus > 0 ? cpus : 0,
  };
}

// --------------------------
// running processes

function processes(processID, callback) {
  let parsedhead = [];

  function getName(command) {
    command = command || "";
    let result = command.split(" ")[0];
    if (result.substr(-1) === ":") {
      result = result.substr(0, result.length - 1);
    }
    if (result.substr(0, 1) !== "[") {
      let parts = result.split("/");
      if (isNaN(parseInt(parts[parts.length - 1]))) {
        result = parts[parts.length - 1];
      } else {
        result = parts[0];
      }
    }
    return result;
  }

  function parseLine(line) {
    let offset = 0;
    let offset2 = 0;

    // function checkColumn(i) {
    //   offset = offset2;
    //   if (parsedhead[i]) {
    //     offset2 = line.substring(parsedhead[i].to + offset, 10000).indexOf(" ");
    //   } else {
    //     offset2 = 10000;
    //   }
    // }

    // checkColumn(0);
    // const pid = parseInt(
    //   line.substring(parsedhead[0].from + offset, parsedhead[0].to + offset2)
    // );
    // checkColumn(1);
    // const ppid = parseInt(
    //   line.substring(parsedhead[1].from + offset, parsedhead[1].to + offset2)
    // );
    // checkColumn(2);
    // const cpu = parseFloat(
    //   line
    //     .substring(parsedhead[2].from + offset, parsedhead[2].to + offset2)
    //     .replace(/,/g, ".")
    // );
    // checkColumn(3);
    // const mem = parseFloat(
    //   line
    //     .substring(parsedhead[3].from + offset, parsedhead[3].to + offset2)
    //     .replace(/,/g, ".")
    // );
    // checkColumn(4);
    // const priority = parseInt(
    //   line.substring(parsedhead[4].from + offset, parsedhead[4].to + offset2)
    // );
    // checkColumn(5);
    // const vsz = parseInt(
    //   line.substring(parsedhead[5].from + offset, parsedhead[5].to + offset2)
    // );
    // checkColumn(6);
    // const rss = parseInt(
    //   line.substring(parsedhead[6].from + offset, parsedhead[6].to + offset2)
    // );
    // checkColumn(7);
    // const nice =
    //   parseInt(
    //     line.substring(parsedhead[7].from + offset, parsedhead[7].to + offset2)
    //   ) || 0;
    // checkColumn(8);
    // const started = !_sunos
    //   ? parseElapsedTime(
    //       line
    //         .substring(parsedhead[8].from + offset, parsedhead[8].to + offset2)
    //         .trim()
    //     )
    //   : parseTimeUnix(
    //       line
    //         .substring(parsedhead[8].from + offset, parsedhead[8].to + offset2)
    //         .trim()
    //     );
    // checkColumn(9);
    // let state = line
    //   .substring(parsedhead[9].from + offset, parsedhead[9].to + offset2)
    //   .trim();
    // state =
    //   state[0] === "R"
    //     ? "running"
    //     : state[0] === "S"
    //     ? "sleeping"
    //     : state[0] === "T"
    //     ? "stopped"
    //     : state[0] === "W"
    //     ? "paging"
    //     : state[0] === "X"
    //     ? "dead"
    //     : state[0] === "Z"
    //     ? "zombie"
    //     : state[0] === "D" || state[0] === "U"
    //     ? "blocked"
    //     : "unknown";
    // checkColumn(10);
    // let tty = line
    //   .substring(parsedhead[10].from + offset, parsedhead[10].to + offset2)
    //   .trim();
    // if (tty === "?" || tty === "??") {
    //   tty = "";
    // }
    // checkColumn(11);
    // const user = line
    //   .substring(parsedhead[11].from + offset, parsedhead[11].to + offset2)
    //   .trim();
    // checkColumn(12);
    // let cmdPath = "";
    // let command = "";
    // let params = "";
    // let fullcommand = line
    //   .substring(parsedhead[12].from + offset, parsedhead[12].to + offset2)
    //   .trim();
    // if (fullcommand.substr(fullcommand.length - 1) === "]") {
    //   fullcommand = fullcommand.slice(0, -1);
    // }
    // if (fullcommand.substr(0, 1) === "[") {
    //   command = fullcommand.substring(1);
    // } else {
    //   const p1 = fullcommand.indexOf("(");
    //   const p2 = fullcommand.indexOf(")");
    //   const p3 = fullcommand.indexOf("/");
    //   const p4 = fullcommand.indexOf(":");
    //   if (p1 < p2 && p1 < p3 && p3 < p2) {
    //     command = fullcommand.split(" ")[0];
    //     command = command.replace(/:/g, "");
    //   } else {
    //     if (p4 > 0 && (p3 === -1 || p3 > 3)) {
    //       command = fullcommand.split(" ")[0];
    //       command = command.replace(/:/g, "");
    //     } else {
    //       // try to figure out where parameter starts
    //       let firstParamPos = fullcommand.indexOf(" -");
    //       let firstParamPathPos = fullcommand.indexOf(" /");
    //       firstParamPos = firstParamPos >= 0 ? firstParamPos : 10000;
    //       firstParamPathPos =
    //         firstParamPathPos >= 0 ? firstParamPathPos : 10000;
    //       const firstPos = Math.min(firstParamPos, firstParamPathPos);
    //       let tmpCommand = fullcommand.substr(0, firstPos);
    //       const tmpParams = fullcommand.substr(firstPos);
    //       const lastSlashPos = tmpCommand.lastIndexOf("/");
    //       if (lastSlashPos >= 0) {
    //         cmdPath = tmpCommand.substr(0, lastSlashPos);
    //         tmpCommand = tmpCommand.substr(lastSlashPos + 1);
    //       }

    //       if (firstPos === 10000 && tmpCommand.indexOf(" ") > -1) {
    //         const parts = tmpCommand.split(" ");
    //         if (fs.existsSync(path.join(cmdPath, parts[0]))) {
    //           command = parts.shift();
    //           params = (parts.join(" ") + " " + tmpParams).trim();
    //         } else {
    //           command = tmpCommand.trim();
    //           params = tmpParams.trim();
    //         }
    //       } else {
    //         command = tmpCommand.trim();
    //         params = tmpParams.trim();
    //       }
    //     }
    //   }
    // }

    // return {
    //   pid: pid,
    //   parentPid: ppid,
    //   name: _linux ? getName(command) : command,
    //   cpu: cpu,
    //   cpuu: 0,
    //   cpus: 0,
    //   mem: mem,
    //   priority: priority,
    //   memVsz: vsz,
    //   memRss: rss,
    //   nice: nice,
    //   started: started,
    //   state: state,
    //   tty: tty,
    //   user: user,
    //   command: command,
    //   params: params,
    //   path: cmdPath,
    // };

    const columns = line.trim().split(/\s+/);

    return {
      pid: parseInt(columns?.[0] || "0") || 0,
      parentPid: parseInt(columns?.[1] || "0") || 0,
      name: _linux ? getName(columns?.[12] || "0") || 0 : columns?.[12 || ""],
      cpu: +columns?.[2] || 0,
      cpuu: 0,
      cpus: 0,
      mem: +columns?.[3] || 0,
      priority: +columns?.[4] || 0,
      memVsz: +columns?.[5] || 0,
      memRss: +columns?.[6] || 0,
      nice: +columns?.[7] || 0,
      started: columns?.[8] || "",
      state: columns?.[9] || "",
      tty: columns?.[10 || ""],
      user: columns?.[11 || ""],
      command: columns?.[12 || ""],
    };
  }

  function parseProcesses(lines) {
    let result = [];
    if (lines.length > 1) {
      let head = lines[0];
      parsedhead = util.parseHead(head, 8);
      lines.forEach(function (line) {
        if (line.trim() !== "") {
          // console.log(parseLine(line));
          result.push(parseLine(line));
        }
      });
    }

    return result;
  }

  function parseProcesses2(lines) {
    function formatDateTime(time) {
      const month = ("0" + (time.getMonth() + 1).toString()).slice(-2);
      const year = time.getFullYear().toString();
      const day = ("0" + time.getDate().toString()).slice(-2);
      const hours = ("0" + time.getHours().toString()).slice(-2);
      const mins = ("0" + time.getMinutes().toString()).slice(-2);
      const secs = ("0" + time.getSeconds().toString()).slice(-2);

      return (
        year + "-" + month + "-" + day + " " + hours + ":" + mins + ":" + secs
      );
    }

    function parseElapsed(etime) {
      let started = "";
      if (etime.indexOf("d") >= 0) {
        const elapsed_parts = etime.split("d");
        started = formatDateTime(
          new Date(
            Date.now() -
              (elapsed_parts[0] * 24 + elapsed_parts[1] * 1) * 60 * 60 * 1000
          )
        );
      } else if (etime.indexOf("h") >= 0) {
        const elapsed_parts = etime.split("h");
        started = formatDateTime(
          new Date(
            Date.now() -
              (elapsed_parts[0] * 60 + elapsed_parts[1] * 1) * 60 * 1000
          )
        );
      } else if (etime.indexOf(":") >= 0) {
        const elapsed_parts = etime.split(":");
        started = formatDateTime(
          new Date(
            Date.now() -
              (elapsed_parts.length > 1
                ? (elapsed_parts[0] * 60 + elapsed_parts[1]) * 1000
                : elapsed_parts[0] * 1000)
          )
        );
      }
      return started;
    }

    let result = [];
    lines.forEach(function (line) {
      if (line.trim() !== "") {
        line = line.trim().replace(/ +/g, " ").replace(/,+/g, ".");
        const parts = line.split(" ");
        const command = parts.slice(9).join(" ");
        const pmem = parseFloat(
          ((1.0 * parseInt(parts[3]) * 1024) / os.totalmem()).toFixed(1)
        );
        const started = parseElapsed(parts[5]);

        result.push({
          pid: parseInt(parts[0]),
          parentPid: parseInt(parts[1]),
          name: getName(command),
          cpu: 0,
          cpuu: 0,
          cpus: 0,
          mem: pmem,
          priority: 0,
          memVsz: parseInt(parts[2]),
          memRss: parseInt(parts[3]),
          nice: parseInt(parts[4]),
          started: started,
          state:
            parts[6] === "R"
              ? "running"
              : parts[6] === "S"
              ? "sleeping"
              : parts[6] === "T"
              ? "stopped"
              : parts[6] === "W"
              ? "paging"
              : parts[6] === "X"
              ? "dead"
              : parts[6] === "Z"
              ? "zombie"
              : parts[6] === "D" || parts[6] === "U"
              ? "blocked"
              : "unknown",
          tty: parts[7],
          user: parts[8],
          command: command,
        });
      }
    });
    return result;
  }

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = {
        all: 0,
        running: 0,
        blocked: 0,
        sleeping: 0,
        unknown: 0,
        list: [],
      };

      let cmd = "";

      if (
        (_processes_cpu.ms && Date.now() - _processes_cpu.ms >= 500) ||
        _processes_cpu.ms === 0
      ) {
        if (_linux || _freebsd || _openbsd || _netbsd || _darwin || _sunos) {
          if (_linux) {
            cmd = `export LC_ALL=C; ps -axo pid:11,ppid:11,pcpu:6,pmem:6,pri:5,vsz:11,rss:11,ni:5,etime:30,state:5,tty:15,user:20,command | grep ' ${processID} '; unset LC_ALL`;
          }
          if (_freebsd || _openbsd || _netbsd) {
            cmd = `export LC_ALL=C; ps -axo pid,ppid,pcpu,pmem,pri,vsz,rss,ni,etime,state,tty,user,command | grep ' ${processID} '; unset LC_ALL`;
          }
          if (_darwin) {
            cmd = `ps -axo pid,ppid,pcpu,pmem,pri,vsz=temp_title_1,rss=temp_title_2,nice,etime=temp_title_3,state,tty,user,command -r | grep ' ${processID} '`;
          }
          if (_sunos) {
            cmd = `ps -Ao pid,ppid,pcpu,pmem,pri,vsz,rss,nice,stime,s,tty,user,comm | grep ' ${processID} '`;
          }
          exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
            if (!error && stdout.toString().trim()) {
              result.list = parseProcesses(
                stdout?.toString()?.trim()?.split("\n")
              ).slice();

              result.all = result.list.length;

              if (_linux) {
                // calc process_cpu - ps is not accurate in linux!
                cmd = 'cat /proc/stat | grep "cpu "';
                result.list.forEach((element) => {
                  cmd += ";cat /proc/" + element.pid + "/stat";
                });
                exec(
                  cmd,
                  { maxBuffer: 1024 * 20000 },
                  function (error, stdout) {
                    let curr_processes = stdout.toString().split("\n");

                    // first line (all - /proc/stat)
                    let all = parseProcStat(curr_processes.shift());

                    // process
                    let list_new = {};
                    let resultProcess = {};
                    curr_processes.forEach((element) => {
                      resultProcess = calcProcStatLinux(
                        element,
                        all,
                        _processes_cpu
                      );

                      if (resultProcess.pid) {
                        // store pcpu in outer array
                        let listPos = result.list
                          .map(function (e) {
                            return e.pid;
                          })
                          .indexOf(resultProcess.pid);
                        if (listPos >= 0) {
                          result.list[listPos].cpu =
                            resultProcess.cpuu + resultProcess.cpus;
                          result.list[listPos].cpuu = resultProcess.cpuu;
                          result.list[listPos].cpus = resultProcess.cpus;
                        }

                        // save new values
                        list_new[resultProcess.pid] = {
                          cpuu: resultProcess.cpuu,
                          cpus: resultProcess.cpus,
                          utime: resultProcess.utime,
                          stime: resultProcess.stime,
                          cutime: resultProcess.cutime,
                          cstime: resultProcess.cstime,
                        };
                      }
                    });

                    // store old values
                    _processes_cpu.all = all;
                    _processes_cpu.list = Object.assign({}, list_new);
                    _processes_cpu.ms = Date.now() - _processes_cpu.ms;
                    _processes_cpu.result = Object.assign({}, result);
                    if (callback) {
                      callback(result);
                    }
                    resolve(result);
                  }
                );
              } else {
                if (callback) {
                  callback(result);
                }
                resolve(result);
              }
            } else {
              cmd = "ps -o pid,ppid,vsz,rss,nice,etime,stat,tty,user,comm";
              if (_sunos) {
                cmd = "ps -o pid,ppid,vsz,rss,nice,etime,s,tty,user,comm";
              }
              exec(cmd, { maxBuffer: 1024 * 20000 }, function (error, stdout) {
                if (!error) {
                  let lines = stdout.toString().split("\n");
                  lines.shift();

                  result.list = parseProcesses2(lines).slice();
                  result.all = result.list.length;
                  result.running = result.list.filter(function (e) {
                    return e.state === "running";
                  }).length;
                  result.blocked = result.list.filter(function (e) {
                    return e.state === "blocked";
                  }).length;
                  result.sleeping = result.list.filter(function (e) {
                    return e.state === "sleeping";
                  }).length;
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                } else {
                  if (callback) {
                    callback(result);
                  }
                  resolve(result);
                }
              });
            }
          });
        } else if (_windows) {
          try {
            util
              .powerShell(
                `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${processID} } | select-Object ProcessId,ParentProcessId,ExecutionState,Caption,CommandLine,ExecutablePath,UserModeTime,KernelModeTime,WorkingSetSize,Priority,PageFileUsage, @{n="CreationDate";e={$_.CreationDate.ToString("yyyy-MM-dd HH:mm:ss")}} | fl`
              )
              .then((stdout, error) => {
                if (!error) {
                  let processSections = stdout.split(/\n\s*\n/);
                  let procs = [];
                  let procStats = [];
                  let list_new = {};
                  let allcpuu = 0;
                  let allcpus = 0;
                  processSections.forEach((element) => {
                    if (element.trim() !== "") {
                      let lines = element.trim().split("\r\n");
                      let pid = parseInt(
                        util.getValue(lines, "ProcessId", ":", true),
                        10
                      );
                      let parentPid = parseInt(
                        util.getValue(lines, "ParentProcessId", ":", true),
                        10
                      );
                      let statusValue = util.getValue(
                        lines,
                        "ExecutionState",
                        ":"
                      );
                      let name = util.getValue(lines, "Caption", ":", true);
                      let commandLine = util.getValue(
                        lines,
                        "CommandLine",
                        ":",
                        true
                      );
                      // get additional command line data
                      let additionalCommand = false;
                      lines.forEach((line) => {
                        if (
                          additionalCommand &&
                          line.toLowerCase().startsWith(" ")
                        ) {
                          commandLine += " " + line.trim();
                        } else {
                          additionalCommand = false;
                        }
                        if (line.toLowerCase().startsWith("commandline")) {
                          additionalCommand = true;
                        }
                      });
                      let commandPath = util.getValue(
                        lines,
                        "ExecutablePath",
                        ":",
                        true
                      );
                      let utime = parseInt(
                        util.getValue(lines, "UserModeTime", ":", true),
                        10
                      );
                      let stime = parseInt(
                        util.getValue(lines, "KernelModeTime", ":", true),
                        10
                      );
                      let memw = parseInt(
                        util.getValue(lines, "WorkingSetSize", ":", true),
                        10
                      );
                      allcpuu = allcpuu + utime;
                      allcpus = allcpus + stime;
                      result.all++;
                      if (!statusValue) {
                        result.unknown++;
                      }
                      if (statusValue === "3") {
                        result.running++;
                      }
                      if (statusValue === "4" || statusValue === "5") {
                        result.blocked++;
                      }

                      procStats.push({
                        pid: pid,
                        utime: utime,
                        stime: stime,
                        cpu: 0,
                        cpuu: 0,
                        cpus: 0,
                      });
                      procs.push({
                        pid: pid,
                        parentPid: parentPid,
                        name: name,
                        cpu: 0,
                        cpuu: 0,
                        cpus: 0,
                        mem: (memw / os.totalmem()) * 100,
                        priority: parseInt(
                          util.getValue(lines, "Priority", ":", true),
                          10
                        ),
                        memVsz: parseInt(
                          util.getValue(lines, "PageFileUsage", ":", true),
                          10
                        ),
                        memRss: Math.floor(
                          parseInt(
                            util.getValue(lines, "WorkingSetSize", ":", true),
                            10
                          ) / 1024
                        ),
                        nice: 0,
                        started: util.getValue(
                          lines,
                          "CreationDate",
                          ":",
                          true
                        ),
                        state: !statusValue
                          ? _winStatusValues[0]
                          : _winStatusValues[statusValue],
                        tty: "",
                        user: "",
                        command: commandLine || name,
                        path: commandPath,
                        params: "",
                      });
                    }
                  });

                  result.sleeping =
                    result.all -
                    result.running -
                    result.blocked -
                    result.unknown;
                  result.list = procs;
                  procStats.forEach((element) => {
                    let resultProcess = calcProcStatWin(
                      element,
                      allcpuu + allcpus,
                      _processes_cpu
                    );

                    // store pcpu in outer array
                    let listPos = result.list
                      .map(function (e) {
                        return e.pid;
                      })
                      .indexOf(resultProcess.pid);
                    if (listPos >= 0) {
                      result.list[listPos].cpu =
                        resultProcess.cpuu + resultProcess.cpus;
                      result.list[listPos].cpuu = resultProcess.cpuu;
                      result.list[listPos].cpus = resultProcess.cpus;
                    }

                    // save new values
                    list_new[resultProcess.pid] = {
                      cpuu: resultProcess.cpuu,
                      cpus: resultProcess.cpus,
                      utime: resultProcess.utime,
                      stime: resultProcess.stime,
                    };
                  });

                  // store old values
                  _processes_cpu.all = allcpuu + allcpus;
                  _processes_cpu.all_utime = allcpuu;
                  _processes_cpu.all_stime = allcpus;
                  _processes_cpu.list = Object.assign({}, list_new);
                  _processes_cpu.ms = Date.now() - _processes_cpu.ms;
                  _processes_cpu.result = Object.assign({}, result);
                }
                if (callback) {
                  callback(result);
                }
                resolve(result);
              });
          } catch (e) {
            if (callback) {
              callback(result);
            }
            resolve(result);
          }
        } else {
          if (callback) {
            callback(result);
          }
          resolve(result);
        }
      } else {
        if (callback) {
          callback(_processes_cpu.result);
        }
        resolve(_processes_cpu.result);
      }
    });
  });
}

exports.processes = processes;
