var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/crypto.ts
function generateId() {
  return crypto.randomUUID();
}
__name(generateId, "generateId");
function generateRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateRandomToken, "generateRandomToken");
function generateSalt(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSalt, "generateSalt");
async function hashPin(pin, saltHex, pepperSecret = "timeplus_secure_pepper_seed") {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(pin + pepperSecret);
  const salt = encoder.encode(saltHex);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    baseKey,
    256
  );
  const derivedBytes = new Uint8Array(derivedBits);
  return Array.from(derivedBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPin, "hashPin");
async function verifyPin(pin, storedHashHex, saltHex, pepperSecret = "timeplus_secure_pepper_seed") {
  const calculatedHashHex = await hashPin(pin, saltHex, pepperSecret);
  if (calculatedHashHex.length !== storedHashHex.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < calculatedHashHex.length; i++) {
    diff |= calculatedHashHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
  }
  return diff === 0;
}
__name(verifyPin, "verifyPin");

// src/auth.ts
var SESSION_COOKIE_NAME = "timeplus_session";
var SESSION_DURATION_DAYS = 30;
var MAX_FAILED_ATTEMPTS = 5;
var MAX_IP_FAILED_ATTEMPTS = 20;
var LOCKOUT_WINDOW_MINUTES = 15;
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...value] = part.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(value.join("="));
    }
  }
  return cookies;
}
__name(parseCookies, "parseCookies");
function createSessionCookie(token, maxAgeDays = SESSION_DURATION_DAYS) {
  const maxAgeSec = maxAgeDays * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
__name(createSessionCookie, "createSessionCookie");
function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
__name(clearSessionCookie, "clearSessionCookie");
async function checkRateLimit(db, ipAddress, targetId) {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1e3).toISOString();
  const targetRow = await db.prepare(
    `SELECT COUNT(*) as failures FROM login_attempts 
       WHERE ip_address = ? AND target_id = ?
       AND success = 0 
       AND attempted_at >= ?`
  ).bind(ipAddress, targetId, windowStart).first();
  const ipRow = await db.prepare(
    `SELECT COUNT(*) as failures FROM login_attempts
       WHERE ip_address = ?
       AND success = 0
       AND attempted_at >= ?`
  ).bind(ipAddress, windowStart).first();
  const targetFailures = targetRow?.failures || 0;
  const ipFailures = ipRow?.failures || 0;
  if (targetFailures >= MAX_FAILED_ATTEMPTS || ipFailures >= MAX_IP_FAILED_ATTEMPTS) {
    return { allowed: false, remainingMinutes: LOCKOUT_WINDOW_MINUTES };
  }
  return { allowed: true };
}
__name(checkRateLimit, "checkRateLimit");
async function recordLoginAttempt(db, ipAddress, targetRole, targetId, success) {
  const insertAttempt = db.prepare(
    `INSERT INTO login_attempts (id, ip_address, target_role, target_id, success, attempted_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  ).bind(crypto.randomUUID(), ipAddress, targetRole, targetId, success ? 1 : 0);
  if (!success) {
    await insertAttempt.run();
    return;
  }
  await db.batch([
    insertAttempt,
    db.prepare(
      `DELETE FROM login_attempts
       WHERE ip_address = ? AND target_id = ? AND success = 0`
    ).bind(ipAddress, targetId)
  ]);
}
__name(recordLoginAttempt, "recordLoginAttempt");
async function createSession(db, familyId, role, childId = null) {
  const token = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare(
    `INSERT INTO sessions (id, family_id, role, child_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  ).bind(token, familyId, role, childId, expiresAt).run();
  return { token, expiresAt };
}
__name(createSession, "createSession");
async function getSessionUser(request, db) {
  let token = null;
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  if (cookies[SESSION_COOKIE_NAME]) {
    token = cookies[SESSION_COOKIE_NAME];
  }
  if (!token) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) return null;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const session = await db.prepare(
    `SELECT id, family_id, role, child_id, expires_at 
       FROM sessions 
       WHERE id = ? AND expires_at > ?`
  ).bind(token, nowIso).first();
  if (!session) return null;
  if (session.role === "parent") {
    const family = await db.prepare(`SELECT id, name FROM families WHERE id = ?`).bind(session.family_id).first();
    if (!family) return null;
    return {
      id: "parent",
      name: "\u05D4\u05D5\u05E8\u05D9\u05DD",
      role: "parent",
      familyId: family.id
    };
  } else if (session.role === "child" && session.child_id) {
    const child = await db.prepare(`SELECT id, family_id, name, avatar, color FROM children WHERE id = ? AND family_id = ?`).bind(session.child_id, session.family_id).first();
    if (!child) return null;
    return {
      id: child.id,
      name: child.name,
      role: "child",
      familyId: child.family_id,
      avatar: child.avatar,
      color: child.color
    };
  }
  return null;
}
__name(getSessionUser, "getSessionUser");
async function deleteSession(db, token) {
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(token).run();
}
__name(deleteSession, "deleteSession");

// src/pin-security.ts
function requireActivePepper(env2) {
  if (!env2.PEPPER_SECRET) {
    throw new Error("PEPPER_SECRET is not configured");
  }
  return env2.PEPPER_SECRET;
}
__name(requireActivePepper, "requireActivePepper");
async function verifyPinWithPepperMigration(pin, storedHash, storedSalt, env2) {
  const activePepper = requireActivePepper(env2);
  if (await verifyPin(pin, storedHash, storedSalt, activePepper)) {
    return { valid: true, migrated: false };
  }
  const legacyPepper = env2.LEGACY_PEPPER_SECRET;
  if (!legacyPepper || legacyPepper === activePepper) {
    return { valid: false, migrated: false };
  }
  const legacyValid = await verifyPin(pin, storedHash, storedSalt, legacyPepper);
  if (!legacyValid) {
    return { valid: false, migrated: false };
  }
  const salt = generateSalt(16);
  const hash = await hashPin(pin, salt, activePepper);
  return { valid: true, migrated: true, hash, salt };
}
__name(verifyPinWithPepperMigration, "verifyPinWithPepperMigration");

// src/timezone.ts
var ISRAEL_TIMEZONE = "Asia/Jerusalem";
function getIsraelDateString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
__name(getIsraelDateString, "getIsraelDateString");
function getIsraelDayOfWeek(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TIMEZONE,
    weekday: "short"
  });
  const weekday = formatter.format(date);
  switch (weekday) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}
__name(getIsraelDayOfWeek, "getIsraelDayOfWeek");
function shiftIsoDate(dateStr, daysOffset) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + daysOffset, 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}
__name(shiftIsoDate, "shiftIsoDate");
function getIsraelDateOffset(daysOffset, baseDate = /* @__PURE__ */ new Date()) {
  return shiftIsoDate(getIsraelDateString(baseDate), daysOffset);
}
__name(getIsraelDateOffset, "getIsraelDateOffset");
function getIsraelStartOfWeek(date = /* @__PURE__ */ new Date()) {
  return getIsraelDateOffset(-getIsraelDayOfWeek(date), date);
}
__name(getIsraelStartOfWeek, "getIsraelStartOfWeek");
function getIsraelStartOfMonth(date = /* @__PURE__ */ new Date()) {
  return getIsraelDateString(date).substring(0, 8) + "01";
}
__name(getIsraelStartOfMonth, "getIsraelStartOfMonth");
var israelDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ISRAEL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
function israelLocalMidnightUtcIso(dateStr) {
  const [targetYear, targetMonth, targetDay] = dateStr.split("-").map(Number);
  const targetWallClockAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, 0, 0, 0);
  let guess = targetWallClockAsUtc;
  for (let i = 0; i < 4; i++) {
    const parts = israelDateTimeFormatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observedWallClockAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    const correction = targetWallClockAsUtc - observedWallClockAsUtc;
    guess += correction;
    if (Math.abs(correction) < 1e3) break;
  }
  return new Date(guess).toISOString();
}
__name(israelLocalMidnightUtcIso, "israelLocalMidnightUtcIso");
function getIsraelUtcRange(startDateInclusive, endDateExclusive) {
  return {
    startUtc: israelLocalMidnightUtcIso(startDateInclusive),
    endUtc: israelLocalMidnightUtcIso(endDateExclusive)
  };
}
__name(getIsraelUtcRange, "getIsraelUtcRange");
function getIsraelTimeString(date = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
__name(getIsraelTimeString, "getIsraelTimeString");

// src/gamification.ts
var WIZARD_RANKS = [
  { level: 1, rankTitle: "\u05E9\u05D5\u05DC\u05D9\u05D9\u05EA \u05D4\u05D6\u05DE\u05DF", minXp: 0, maxXp: 100 },
  { level: 2, rankTitle: "\u05DE\u05D7\u05D6\u05D9\u05E7 \u05D4\u05E9\u05E2\u05D5\u05DF", minXp: 100, maxXp: 250 },
  { level: 3, rankTitle: "\u05DE\u05DB\u05D5\u05D5\u05DF \u05D4\u05DB\u05D5\u05DB\u05D1\u05D9\u05DD", minXp: 250, maxXp: 450 },
  { level: 4, rankTitle: "\u05E7\u05D5\u05E1\u05DD \u05E9\u05E2\u05D4", minXp: 450, maxXp: 700 },
  { level: 5, rankTitle: "\u05D0\u05DE\u05DF \u05D4\u05D6\u05DE\u05DF", minXp: 700, maxXp: 1e3 },
  { level: 6, rankTitle: "\u05E9\u05D5\u05DE\u05E8 \u05D4\u05DE\u05DE\u05D3\u05D9\u05DD", minXp: 1e3, maxXp: 1400 },
  { level: 7, rankTitle: "\u05E8\u05D1-\u05DE\u05D2 \u05D4\u05D6\u05DE\u05DF", minXp: 1400, maxXp: 2e3 },
  { level: 8, rankTitle: "\u05E9\u05DC\u05D9\u05D8 \u05D4\u05E0\u05E6\u05D7", minXp: 2e3, maxXp: 999999 }
];
function getRankDetails(xp) {
  let currentRank = WIZARD_RANKS[0];
  for (const rank of WIZARD_RANKS) {
    if (xp >= rank.minXp) {
      currentRank = rank;
    } else {
      break;
    }
  }
  const range = currentRank.maxXp - currentRank.minXp;
  const xpInLevel = Math.max(0, xp - currentRank.minXp);
  const xpNeededForNext = Math.max(0, currentRank.maxXp - xp);
  const progressPercent = Math.min(100, Math.round(xpInLevel / (range || 1) * 100));
  return {
    level: currentRank.level,
    rankTitle: currentRank.rankTitle,
    xpInLevel,
    xpNeededForNext,
    progressPercent
  };
}
__name(getRankDetails, "getRankDetails");
function calculateTaskXp(rewardMinutes, requiresPhoto = false) {
  let xp = Math.max(10, Math.round(rewardMinutes * 1.25));
  if (requiresPhoto) {
    xp += 10;
  }
  return xp;
}
__name(calculateTaskXp, "calculateTaskXp");

// src/tasks.ts
async function ensureDailyTaskInstances(db, familyId, targetDateStr = getIsraelDateString()) {
  const [y, m, d] = targetDateStr.split("-").map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = getIsraelDayOfWeek(targetDate);
  await db.prepare(
    `UPDATE task_instances
     SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE family_id = ?
       AND status IN ('open','rejected')
       AND template_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM task_templates tt
         JOIN task_template_children ttc
           ON ttc.template_id = tt.id AND ttc.child_id = task_instances.child_id
         WHERE tt.id = task_instances.template_id
           AND tt.family_id = task_instances.family_id
           AND tt.is_active = 1
           AND tt.archived_at IS NULL
       )`
  ).bind(familyId).run();
  const { results: templates } = await db.prepare(
    `SELECT * FROM task_templates 
       WHERE family_id = ? AND is_active = 1 AND archived_at IS NULL`
  ).bind(familyId).all();
  let createdCount = 0;
  for (const tpl of templates) {
    let shouldGenerate = false;
    if (tpl.schedule_type === "daily" || tpl.schedule_type === "repeatable") {
      shouldGenerate = true;
    } else if (tpl.schedule_type === "weekly" || tpl.schedule_type === "custom") {
      if (tpl.days_of_week) {
        try {
          const days = JSON.parse(tpl.days_of_week);
          shouldGenerate = Array.isArray(days) && days.some((day) => Number.isInteger(day) && day >= 0 && day <= 6) && days.includes(dayOfWeek);
        } catch {
          shouldGenerate = false;
        }
      }
    } else if (tpl.schedule_type === "one_time") {
      shouldGenerate = !!tpl.one_time_date && tpl.one_time_date === targetDateStr;
    }
    if (!shouldGenerate) continue;
    const { results: assignments } = await db.prepare(`SELECT child_id FROM task_template_children WHERE template_id = ?`).bind(tpl.id).all();
    for (const assignment of assignments) {
      if (tpl.schedule_type === "repeatable") {
        const generationKey2 = `repeatable-open:${tpl.id}:${assignment.child_id}`;
        await db.prepare(
          `UPDATE task_instances
           SET generation_key = ?
           WHERE id = (
             SELECT id FROM task_instances
             WHERE template_id = ? AND child_id = ? AND status = 'open' AND generation_key IS NULL
             ORDER BY created_at DESC, id DESC LIMIT 1
           )
           AND NOT EXISTS (SELECT 1 FROM task_instances WHERE generation_key = ?)`
        ).bind(generationKey2, tpl.id, assignment.child_id, generationKey2).run();
        const instanceId2 = generateId();
        const inserted2 = await db.prepare(
          `INSERT OR IGNORE INTO task_instances (
              id, family_id, template_id, child_id, title, description,
              reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json,
              allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date,
              generation_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
        ).bind(
          instanceId2,
          familyId,
          tpl.id,
          assignment.child_id,
          tpl.title,
          tpl.description,
          tpl.reward_minutes,
          tpl.requires_photo,
          tpl.task_kind || "bonus",
          tpl.verification_mode || "manual",
          tpl.verification_rules_json || null,
          Number(tpl.allow_video_proof || 0),
          Number(tpl.auto_approve_enabled || 0),
          tpl.max_daily_auto_awards ?? null,
          targetDateStr,
          generationKey2
        ).run();
        createdCount += Number(inserted2.meta.changes || 0);
        continue;
      }
      const generationKey = `scheduled:${tpl.id}:${assignment.child_id}:${targetDateStr}`;
      await db.prepare(
        `UPDATE task_instances
         SET generation_key = ?
         WHERE id = (
           SELECT id FROM task_instances
           WHERE template_id = ? AND child_id = ? AND due_date = ? AND generation_key IS NULL
           ORDER BY created_at DESC, id DESC LIMIT 1
         )
         AND NOT EXISTS (SELECT 1 FROM task_instances WHERE generation_key = ?)`
      ).bind(generationKey, tpl.id, assignment.child_id, targetDateStr, generationKey).run();
      const instanceId = generateId();
      const inserted = await db.prepare(
        `INSERT OR IGNORE INTO task_instances (
            id, family_id, template_id, child_id, title, description,
            reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json,
            allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date,
            generation_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
      ).bind(
        instanceId,
        familyId,
        tpl.id,
        assignment.child_id,
        tpl.title,
        tpl.description,
        tpl.reward_minutes,
        tpl.requires_photo,
        tpl.task_kind || "bonus",
        tpl.verification_mode || "manual",
        tpl.verification_rules_json || null,
        Number(tpl.allow_video_proof || 0),
        Number(tpl.auto_approve_enabled || 0),
        tpl.max_daily_auto_awards ?? null,
        targetDateStr,
        generationKey
      ).run();
      createdCount += Number(inserted.meta.changes || 0);
    }
  }
  return createdCount;
}
__name(ensureDailyTaskInstances, "ensureDailyTaskInstances");
async function ensureDailyTaskInstancesOnce(db, familyId, targetDateStr = getIsraelDateString()) {
  const key = `daily-task-generation:${familyId}:${targetDateStr}`;
  const existing = await db.prepare(
    `SELECT 1 AS found FROM idempotency_keys WHERE key = ? AND action = 'daily_task_generation'`
  ).bind(key).first();
  if (existing) return 0;
  const createdCount = await ensureDailyTaskInstances(db, familyId, targetDateStr);
  await db.prepare(
    `INSERT OR IGNORE INTO idempotency_keys (key, action, response_json)
     VALUES (?, 'daily_task_generation', ?)`
  ).bind(key, JSON.stringify({ date: targetDateStr, createdCount })).run();
  return createdCount;
}
__name(ensureDailyTaskInstancesOnce, "ensureDailyTaskInstancesOnce");
async function submitTask(db, instanceId, childId, note = null, photoObjectKey = null) {
  const instance = await db.prepare(`SELECT * FROM task_instances WHERE id = ? AND child_id = ?`).bind(instanceId, childId).first();
  if (!instance) {
    return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  }
  if (instance.status !== "open" && instance.status !== "rejected") {
    return { success: false, error: "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D9\u05E9 \u05DE\u05E9\u05D9\u05DE\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D4\u05D5\u05D2\u05E9\u05D4 \u05D0\u05D5 \u05D0\u05D5\u05E9\u05E8\u05D4" };
  }
  let template = null;
  if (instance.template_id) {
    template = await db.prepare(
      `SELECT schedule_type, title, description, reward_minutes, requires_photo, task_kind,
              verification_mode, verification_rules_json, allow_video_proof, auto_approve_enabled,
              max_daily_auto_awards, time_window_start, time_window_end, is_active, archived_at
       FROM task_templates WHERE id = ?`
    ).bind(instance.template_id).first();
    const nowLocal = getIsraelTimeString();
    if (template?.time_window_start && nowLocal < template.time_window_start) {
      return { success: false, error: `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05E4\u05EA\u05D7\u05EA \u05D1\u05E9\u05E2\u05D4 ${template.time_window_start}` };
    }
    if (template?.time_window_end && nowLocal > template.time_window_end) {
      return { success: false, error: `\u05D7\u05DC\u05D5\u05DF \u05D4\u05D6\u05DE\u05DF \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1\u05E9\u05E2\u05D4 ${template.time_window_end}` };
    }
  }
  const submissionId = generateId();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const submissionOperationId = generateId();
  const isRepeatable = Boolean(
    instance.template_id && template?.schedule_type === "repeatable" && template.is_active === 1 && !template.archived_at
  );
  const closedGenerationKey = `repeatable-closed:${instanceId}`;
  const repeatableOpenKey = isRepeatable && instance.template_id ? `repeatable-open:${instance.template_id}:${childId}` : null;
  const child = await db.prepare(`SELECT name FROM children WHERE id = ?`).bind(childId).first();
  const childName = child?.name || "\u05D4\u05D9\u05DC\u05D3";
  const operationGuard = `EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = ? AND ti.child_id = ? AND ti.status = 'submitted'
      AND ti.submission_operation_id = ?
  )`;
  const submissionStatements = [
    db.prepare(
      `UPDATE task_instances
       SET status = 'submitted', submitted_at = ?, submission_operation_id = ?,
           generation_key = CASE WHEN ? = 1 THEN ? ELSE generation_key END,
           updated_at = ?
       WHERE id = ? AND child_id = ? AND (status = 'open' OR status = 'rejected')`
    ).bind(now, submissionOperationId, isRepeatable ? 1 : 0, closedGenerationKey, now, instanceId, childId),
    db.prepare(
      `INSERT INTO task_submissions (
        id, task_instance_id, child_id, note, photo_object_key, status, submitted_at
      )
      SELECT ?, ?, ?, ?, ?, 'pending', ? WHERE ${operationGuard}`
    ).bind(
      submissionId,
      instanceId,
      childId,
      note,
      photoObjectKey,
      now,
      instanceId,
      childId,
      submissionOperationId
    ),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'parent', NULL, 'task_submitted', ?, ?, 'task_instance', ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      instance.family_id,
      `\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8: ${instance.title}`,
      `${childName} \u05D4\u05D2\u05D9\u05E9/\u05D4 \u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${instance.title}"`,
      instanceId,
      now,
      instanceId,
      childId,
      submissionOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'child', ?, 'task_submitted', 'task_instance', ?, ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      instance.family_id,
      childId,
      instanceId,
      JSON.stringify({ note, hasPhoto: !!photoObjectKey, submissionOperationId }),
      now,
      instanceId,
      childId,
      submissionOperationId
    )
  ];
  if (isRepeatable && instance.template_id && template && repeatableOpenKey) {
    submissionStatements.push(
      db.prepare(
        `UPDATE task_instances
         SET generation_key = ?
         WHERE id = (
           SELECT id FROM task_instances
           WHERE template_id = ? AND child_id = ? AND status = 'open'
             AND id <> ? AND generation_key IS NULL
           ORDER BY created_at DESC, id DESC LIMIT 1
         )
         AND ${operationGuard}
         AND NOT EXISTS (SELECT 1 FROM task_instances WHERE generation_key = ?)`
      ).bind(
        repeatableOpenKey,
        instance.template_id,
        childId,
        instanceId,
        instanceId,
        childId,
        submissionOperationId,
        repeatableOpenKey
      ),
      db.prepare(
        `INSERT OR IGNORE INTO task_instances (
          id, family_id, template_id, child_id, title, description,
          reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json,
          allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date,
          generation_key, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?
        WHERE ${operationGuard}`
      ).bind(
        generateId(),
        instance.family_id,
        instance.template_id,
        childId,
        template.title,
        template.description,
        template.reward_minutes,
        template.requires_photo,
        template.task_kind || "bonus",
        template.verification_mode || "manual",
        template.verification_rules_json || null,
        Number(template.allow_video_proof || 0),
        Number(template.auto_approve_enabled || 0),
        template.max_daily_auto_awards ?? null,
        getIsraelDateString(),
        repeatableOpenKey,
        now,
        now,
        instanceId,
        childId,
        submissionOperationId
      )
    );
  }
  const submissionResults = await db.batch(submissionStatements);
  if (Number(submissionResults[0]?.meta?.changes || 0) === 0) {
    return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DB\u05D1\u05E8 \u05E0\u05DE\u05E6\u05D0\u05EA \u05D1\u05D8\u05D9\u05E4\u05D5\u05DC" };
  }
  return { success: true };
}
__name(submitTask, "submitTask");
async function approveTask(db, instanceId, parentFamilyId, customRewardMinutes, actor = "parent") {
  const instance = await db.prepare(`SELECT * FROM task_instances WHERE id = ? AND family_id = ?`).bind(instanceId, parentFamilyId).first();
  if (!instance) return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  if (instance.status === "approved") return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DB\u05D1\u05E8 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05E2\u05D1\u05E8" };
  if (instance.status !== "submitted") return { success: false, error: "\u05E0\u05D9\u05EA\u05DF \u05DC\u05D0\u05E9\u05E8 \u05E8\u05E7 \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05E9\u05D4\u05D5\u05D2\u05E9\u05D5" };
  if (customRewardMinutes !== void 0 && (!Number.isSafeInteger(customRewardMinutes) || customRewardMinutes < 0)) {
    return { success: false, error: "\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D3\u05E7\u05D5\u05EA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D5\u05DC\u05D0 \u05E9\u05DC\u05D9\u05DC\u05D9" };
  }
  const rewardMinutes = instance.task_kind === "mandatory" ? 0 : customRewardMinutes !== void 0 ? customRewardMinutes : instance.reward_minutes;
  const storedRewardMinutes = instance.task_kind === "mandatory" ? instance.reward_minutes : rewardMinutes;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const todayIsrael = getIsraelDateString();
  const yesterdayIsrael = getIsraelDateOffset(-1);
  const approvalOperationId = generateId();
  const txId = rewardMinutes > 0 ? generateId() : null;
  const xpAwarded = calculateTaskXp(instance.reward_minutes, instance.requires_photo === 1);
  const operationGuard = `EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = ? AND ti.family_id = ? AND ti.status = 'approved'
      AND ti.approval_operation_id = ?
  )`;
  const levelForXp = /* @__PURE__ */ __name((xpExpression) => `CASE
    WHEN ${xpExpression} >= 2000 THEN 8
    WHEN ${xpExpression} >= 1400 THEN 7
    WHEN ${xpExpression} >= 1000 THEN 6
    WHEN ${xpExpression} >= 700 THEN 5
    WHEN ${xpExpression} >= 450 THEN 4
    WHEN ${xpExpression} >= 250 THEN 3
    WHEN ${xpExpression} >= 100 THEN 2
    ELSE 1 END`, "levelForXp");
  const previousLevelSql = levelForXp(`MAX(0, cp.xp - ${Number(xpAwarded)})`);
  const rankTitleSql = `CASE cp.level
    WHEN 8 THEN '\u05E9\u05DC\u05D9\u05D8 \u05D4\u05E0\u05E6\u05D7'
    WHEN 7 THEN '\u05E8\u05D1-\u05DE\u05D2 \u05D4\u05D6\u05DE\u05DF'
    WHEN 6 THEN '\u05E9\u05D5\u05DE\u05E8 \u05D4\u05DE\u05DE\u05D3\u05D9\u05DD'
    WHEN 5 THEN '\u05D0\u05DE\u05DF \u05D4\u05D6\u05DE\u05DF'
    WHEN 4 THEN '\u05E7\u05D5\u05E1\u05DD \u05E9\u05E2\u05D4'
    WHEN 3 THEN '\u05DE\u05DB\u05D5\u05D5\u05DF \u05D4\u05DB\u05D5\u05DB\u05D1\u05D9\u05DD'
    WHEN 2 THEN '\u05DE\u05D7\u05D6\u05D9\u05E7 \u05D4\u05E9\u05E2\u05D5\u05DF'
    ELSE '\u05E9\u05D5\u05DC\u05D9\u05D9\u05EA \u05D4\u05D6\u05DE\u05DF' END`;
  const approvalStatements = [
    db.prepare(
      `UPDATE task_instances
       SET status = 'approved', reward_minutes = ?, reviewed_at = ?, reviewed_by = ?,
           approval_operation_id = ?, updated_at = ?
       WHERE id = ? AND family_id = ? AND status = 'submitted'`
    ).bind(storedRewardMinutes, now, actor, approvalOperationId, now, instanceId, parentFamilyId),
    db.prepare(
      `UPDATE task_submissions
       SET status = 'approved', reviewed_at = ?
       WHERE task_instance_id = ? AND status = 'pending' AND ${operationGuard}`
    ).bind(now, instanceId, instanceId, parentFamilyId, approvalOperationId)
  ];
  if (rewardMinutes > 0 && txId) {
    approvalStatements.push(
      db.prepare(
        `UPDATE children
         SET available_minutes = available_minutes + ?, updated_at = ?
         WHERE id = ? AND family_id = ? AND ${operationGuard}`
      ).bind(rewardMinutes, now, instance.child_id, parentFamilyId, instanceId, parentFamilyId, approvalOperationId),
      db.prepare(
        `INSERT INTO minute_transactions (
          id, family_id, child_id, type, amount, balance_after, reason, task_instance_id, created_by, created_at
        )
        SELECT ?, ?, c.id, 'earn', ?, c.available_minutes, ?, ?, ?, ?
        FROM children c
        WHERE c.id = ? AND c.family_id = ? AND ${operationGuard}`
      ).bind(
        txId,
        parentFamilyId,
        rewardMinutes,
        `\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E9\u05D9\u05DE\u05D4: ${instance.title}`,
        instanceId,
        actor,
        now,
        instance.child_id,
        parentFamilyId,
        instanceId,
        parentFamilyId,
        approvalOperationId
      )
    );
  }
  approvalStatements.push(
    db.prepare(
      `INSERT OR IGNORE INTO child_progress (
        child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at
      )
      SELECT ?, ?, 1, 0, 0, 0, NULL, ? WHERE ${operationGuard}`
    ).bind(instance.child_id, parentFamilyId, now, instanceId, parentFamilyId, approvalOperationId),
    db.prepare(
      `UPDATE child_progress
       SET xp = xp + ?,
           current_streak_days = CASE
             WHEN last_active_date IS NULL THEN 1
             WHEN last_active_date = ? THEN current_streak_days
             WHEN last_active_date = ? THEN current_streak_days + 1
             ELSE 1 END,
           last_active_date = ?,
           updated_at = ?
       WHERE child_id = ? AND family_id = ? AND ${operationGuard}`
    ).bind(
      xpAwarded,
      todayIsrael,
      yesterdayIsrael,
      todayIsrael,
      now,
      instance.child_id,
      parentFamilyId,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `UPDATE child_progress
       SET level = ${levelForXp("xp")},
           best_streak_days = MAX(best_streak_days, current_streak_days),
           updated_at = ?
       WHERE child_id = ? AND family_id = ? AND ${operationGuard}`
    ).bind(now, instance.child_id, parentFamilyId, instanceId, parentFamilyId, approvalOperationId),
    db.prepare(
      `INSERT INTO reward_events (
        id, family_id, child_id, type, title, body, minutes_delta, xp_delta,
        level_before, level_after, streak_days, task_instance_id, seen_at, created_at
      )
      SELECT ?, ?, cp.child_id,
             CASE WHEN cp.level > ${previousLevelSql} THEN 'level_up' ELSE 'task_approved' END,
             CASE WHEN cp.level > ${previousLevelSql}
                  THEN printf('\u05E2\u05DC\u05D9\u05EA \u05DC\u05E8\u05DE\u05D4 %d! %s', cp.level, ${rankTitleSql})
                  ELSE ? END,
             ?, ?, ?, ${previousLevelSql}, cp.level, cp.current_streak_days, ?, NULL, ?
      FROM child_progress cp
      WHERE cp.child_id = ? AND cp.family_id = ? AND ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      `\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3! ${instance.title} \u05D0\u05D5\u05E9\u05E8`,
      rewardMinutes > 0 ? `\u05E7\u05D9\u05D1\u05DC\u05EA ${rewardMinutes} \u05D3\u05E7\u05D5\u05EA \u05DE\u05E1\u05DA \u05D5-${xpAwarded} \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05E1\u05DD!` : `\u05E7\u05D9\u05D1\u05DC\u05EA ${xpAwarded} \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05E1\u05DD \u05E2\u05DC \u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4!`,
      rewardMinutes,
      xpAwarded,
      instanceId,
      now,
      instance.child_id,
      parentFamilyId,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'task_approved', ?, ?, 'task_instance', ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      rewardMinutes > 0 ? `\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! +${rewardMinutes} \u05D3\u05E7'` : "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u2B50",
      rewardMinutes > 0 ? `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${instance.title}" \u05D0\u05D5\u05E9\u05E8\u05D4! \u05E0\u05D5\u05E1\u05E4\u05D5 ${rewardMinutes} \u05D3\u05E7\u05D5\u05EA \u05DC\u05D7\u05E9\u05D1\u05D5\u05E0\u05DA.` : `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${instance.title}" \u05D0\u05D5\u05E9\u05E8\u05D4! \u05E7\u05D9\u05D1\u05DC\u05EA ${xpAwarded} XP.`,
      instanceId,
      now,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      )
      SELECT ?, ?, ?, ?, 'task_approved', 'task_instance', ?, ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      actor === "system" ? "system" : "parent",
      actor === "system" ? "ai_verifier" : "parent",
      instanceId,
      JSON.stringify({ rewardMinutes, xpAwarded, approvalOperationId }),
      now,
      instanceId,
      parentFamilyId,
      approvalOperationId
    )
  );
  const approvalResults = await db.batch(approvalStatements);
  if (Number(approvalResults[0]?.meta?.changes || 0) === 0) {
    return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05DE\u05DE\u05EA\u05D9\u05E0\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D5 \u05E9\u05DB\u05D1\u05E8 \u05D0\u05D5\u05E9\u05E8\u05D4" };
  }
  return { success: true, minutesAwarded: rewardMinutes, xpAwarded };
}
__name(approveTask, "approveTask");
async function rejectTask(db, instanceId, parentFamilyId, reason = null) {
  const instance = await db.prepare(`SELECT * FROM task_instances WHERE id = ? AND family_id = ?`).bind(instanceId, parentFamilyId).first();
  if (!instance) {
    return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  }
  if (instance.status !== "submitted") {
    return { success: false, error: "\u05E0\u05D9\u05EA\u05DF \u05DC\u05D3\u05D7\u05D5\u05EA \u05E8\u05E7 \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05E9\u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8" };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rejectionOperationId = generateId();
  const operationGuard = `EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = ? AND ti.family_id = ? AND ti.status = 'rejected'
      AND ti.rejection_operation_id = ?
  )`;
  const rejectionStatements = [
    db.prepare(
      `UPDATE task_instances
       SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent',
           rejection_operation_id = ?, updated_at = ?
       WHERE id = ? AND family_id = ? AND status = 'submitted'`
    ).bind(now, rejectionOperationId, now, instanceId, parentFamilyId),
    db.prepare(
      `UPDATE task_submissions
       SET status = 'rejected', reviewed_at = ?
       WHERE task_instance_id = ? AND status = 'pending' AND ${operationGuard}`
    ).bind(now, instanceId, instanceId, parentFamilyId, rejectionOperationId),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'task_rejected', ?, ?, 'task_instance', ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4: ${instance.title}`,
      reason || "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05D4\u05D5\u05E8\u05D9\u05DD. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D9\u05E9 \u05E9\u05D5\u05D1.",
      instanceId,
      now,
      instanceId,
      parentFamilyId,
      rejectionOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'task_rejected', 'task_instance', ?, ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      instanceId,
      JSON.stringify({ reason, rejectionOperationId }),
      now,
      instanceId,
      parentFamilyId,
      rejectionOperationId
    )
  ];
  const rejectionResults = await db.batch(rejectionStatements);
  if (Number(rejectionResults[0]?.meta?.changes || 0) === 0) {
    return { success: false, error: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05DE\u05DE\u05EA\u05D9\u05E0\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8" };
  }
  return { success: true };
}
__name(rejectTask, "rejectTask");

// src/init.ts
var PIN_PATTERN = /^\d{4,8}$/;
var SETUP_LEASE_MS = 5 * 60 * 1e3;
var starterTemplates = [
  {
    title: "\u05E1\u05D9\u05D3\u05D5\u05E8 \u05D4\u05D7\u05D3\u05E8 \u05D5\u05D4\u05DE\u05D9\u05D8\u05D4",
    description: "\u05E7\u05D9\u05E4\u05D5\u05DC \u05E9\u05DE\u05D9\u05DB\u05D4, \u05D0\u05D9\u05E1\u05D5\u05E3 \u05D1\u05D2\u05D3\u05D9\u05DD \u05DE\u05D4\u05E8\u05E6\u05E4\u05D4 \u05D5\u05D0\u05E8\u05D2\u05D5\u05DF \u05D4\u05E9\u05D5\u05DC\u05D7\u05DF",
    reward: 15,
    schedule: "daily"
  },
  {
    title: "\u05E7\u05E8\u05D9\u05D0\u05EA \u05E1\u05E4\u05E8 (20 \u05D3\u05E7\u05D5\u05EA)",
    description: "\u05E7\u05E8\u05D9\u05D0\u05D4 \u05E2\u05E6\u05DE\u05D0\u05D9\u05EA \u05D1\u05E1\u05E4\u05E8 \u05D0\u05D4\u05D5\u05D1",
    reward: 20,
    schedule: "daily"
  },
  {
    title: "\u05E2\u05D6\u05E8\u05D4 \u05D1\u05E2\u05E8\u05D9\u05DB\u05EA \u05D0\u05D5 \u05E4\u05D9\u05E0\u05D5\u05D9 \u05E9\u05D5\u05DC\u05D7\u05DF",
    description: "\u05E2\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E9\u05E4\u05D7\u05D4 \u05D1\u05D0\u05E8\u05D5\u05D7\u05D4",
    reward: 10,
    schedule: "daily"
  },
  {
    title: "\u05D4\u05DB\u05E0\u05EA \u05E9\u05D9\u05E2\u05D5\u05E8\u05D9 \u05D1\u05D9\u05EA / \u05EA\u05E8\u05D2\u05D5\u05DC",
    description: "\u05E1\u05D9\u05D5\u05DD \u05DB\u05DC \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05DC\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8",
    reward: 20,
    schedule: "daily"
  }
];
async function isSystemInitialized(db) {
  const family = await db.prepare(`SELECT is_initialized FROM families LIMIT 1`).first();
  return family ? family.is_initialized === 1 : false;
}
__name(isSystemInitialized, "isSystemInitialized");
async function getPublicChildrenList(db) {
  const { results } = await db.prepare(`SELECT id, name, avatar, color FROM children ORDER BY created_at ASC`).all();
  return results || [];
}
__name(getPublicChildrenList, "getPublicChildrenList");
function validateSetupPayload(env2, payload) {
  const allowInsecureInit = env2.ENVIRONMENT !== "production" && env2.ALLOW_INSECURE_INIT === "true";
  if (!env2.INIT_SECRET && !allowInsecureInit) {
    return "\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA (INIT_SECRET \u05D7\u05E1\u05E8)";
  }
  if (env2.INIT_SECRET && payload.setupSecret !== env2.INIT_SECRET) {
    return "\u05E7\u05D5\u05D3 \u05D0\u05EA\u05D7\u05D5\u05DC \u05E8\u05D0\u05E9\u05D5\u05E0\u05D9 \u05E9\u05D2\u05D5\u05D9";
  }
  if (!payload.familyName || payload.familyName.trim() === "") {
    return "\u05E9\u05DD \u05DE\u05E9\u05E4\u05D7\u05D4 \u05E0\u05D3\u05E8\u05E9";
  }
  if (!PIN_PATTERN.test(payload.parentPin || "")) {
    return "\u05E7\u05D5\u05D3 \u05D4\u05D5\u05E8\u05D4 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC 4 \u05E2\u05D3 8 \u05E1\u05E4\u05E8\u05D5\u05EA";
  }
  if (!payload.children || payload.children.length === 0) {
    return "\u05D9\u05E9 \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05D9\u05DC\u05D3 \u05D0\u05D7\u05D3";
  }
  for (const child of payload.children) {
    if (!child.name?.trim()) return "\u05E9\u05DD \u05D9\u05DC\u05D3 \u05E0\u05D3\u05E8\u05E9";
    if (!PIN_PATTERN.test(child.pin || "")) {
      return `\u05E7\u05D5\u05D3 \u05D4\u05DB\u05E0\u05D9\u05E1\u05D4 \u05E9\u05DC ${child.name} \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC 4 \u05E2\u05D3 8 \u05E1\u05E4\u05E8\u05D5\u05EA`;
    }
  }
  return null;
}
__name(validateSetupPayload, "validateSetupPayload");
async function initializeFamily(db, env2, payload) {
  const initialized = await isSystemInitialized(db);
  if (initialized) {
    return { success: false, error: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DB\u05D1\u05E8 \u05D0\u05D5\u05EA\u05D7\u05DC\u05D4 \u05D1\u05E2\u05D1\u05E8" };
  }
  const validationError = validateSetupPayload(env2, payload);
  if (validationError) return { success: false, error: validationError };
  let pepper;
  try {
    pepper = requireActivePepper(env2);
  } catch {
    return { success: false, error: "\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA (PEPPER_SECRET \u05D7\u05E1\u05E8)" };
  }
  const familyId = env2.DEFAULT_FAMILY_ID || "yaniv_family";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const parentSalt = generateSalt(16);
  const parentHash = await hashPin(payload.parentPin, parentSalt, pepper);
  const childRecords = [];
  for (const [index, child] of payload.children.entries()) {
    const childSalt = generateSalt(16);
    childRecords.push({
      id: generateId(),
      name: child.name.trim(),
      pinHash: await hashPin(child.pin, childSalt, pepper),
      pinSalt: childSalt,
      color: child.color || (index % 2 === 0 ? "#4facfe" : "#10b981"),
      avatar: child.avatar || (index % 2 === 0 ? "wand" : "potion")
    });
  }
  const templateRecords = starterTemplates.map((template) => ({
    ...template,
    id: generateId()
  }));
  const existingSetup = await db.prepare(`SELECT is_initialized, updated_at FROM families WHERE id = ?`).bind(familyId).first();
  if (existingSetup?.is_initialized === 1) {
    return { success: false, error: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DB\u05D1\u05E8 \u05D0\u05D5\u05EA\u05D7\u05DC\u05D4 \u05D1\u05E2\u05D1\u05E8" };
  }
  if (existingSetup) {
    const updatedAtMs = Date.parse(existingSetup.updated_at);
    const leaseIsActive = Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs < SETUP_LEASE_MS;
    if (leaseIsActive) {
      return { success: false, error: "\u05D0\u05EA\u05D7\u05D5\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05EA\u05D1\u05E6\u05E2" };
    }
    const cleanup = await db.prepare(`DELETE FROM families WHERE id = ? AND is_initialized = 0 AND updated_at = ?`).bind(familyId, existingSetup.updated_at).run();
    if (Number(cleanup.meta.changes || 0) !== 1) {
      return { success: false, error: "\u05D0\u05EA\u05D7\u05D5\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05EA\u05D1\u05E6\u05E2" };
    }
  }
  const setupStatements = [
    db.prepare(
      `INSERT INTO families (id, name, parent_pin_hash, parent_pin_salt, is_initialized, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind(familyId, payload.familyName.trim(), parentHash, parentSalt, now, now),
    db.prepare(
      `INSERT INTO family_settings (family_id, max_balance_minutes, daily_spend_limit_minutes, warning_debt_threshold, allow_photo_proof, sound_enabled, created_at, updated_at)
       VALUES (?, NULL, NULL, -60, 0, 1, ?, ?)`
    ).bind(familyId, now, now)
  ];
  for (const child of childRecords) {
    setupStatements.push(
      db.prepare(
        `INSERT INTO children (id, family_id, name, pin_hash, pin_salt, avatar, color, available_minutes, debt_limit_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 30, 60, ?, ?)`
      ).bind(child.id, familyId, child.name, child.pinHash, child.pinSalt, child.avatar, child.color, now, now),
      db.prepare(
        `INSERT INTO minute_transactions (id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at)
         VALUES (?, ?, ?, 'earn', 30, 30, '\u05D3\u05E7\u05D5\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4 \u05D1\u05D0\u05E7\u05D3\u05DE\u05D9\u05D9\u05EA \u05D4\u05D6\u05DE\u05DF!', 'system', ?)`
      ).bind(generateId(), familyId, child.id, now),
      db.prepare(
        `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
         VALUES (?, ?, 1, 0, 1, 1, ?, ?)`
      ).bind(child.id, familyId, getIsraelDateString(), now)
    );
  }
  for (const template of templateRecords) {
    setupStatements.push(
      db.prepare(
        `INSERT INTO task_templates (
          id, family_id, title, description, reward_minutes, schedule_type, days_of_week,
          requires_photo, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '[0,1,2,3,4,5,6]', 0, 1, ?, ?)`
      ).bind(template.id, familyId, template.title, template.description, template.reward, template.schedule, now, now)
    );
    for (const child of childRecords) {
      setupStatements.push(
        db.prepare(`INSERT INTO task_template_children (template_id, child_id) VALUES (?, ?)`).bind(template.id, child.id)
      );
    }
  }
  try {
    await db.batch(setupStatements);
  } catch (error3) {
    const competingSetup = await db.prepare(`SELECT is_initialized, updated_at FROM families WHERE id = ?`).bind(familyId).first();
    if (competingSetup) {
      return {
        success: false,
        error: competingSetup.is_initialized === 1 ? "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DB\u05D1\u05E8 \u05D0\u05D5\u05EA\u05D7\u05DC\u05D4 \u05D1\u05E2\u05D1\u05E8" : "\u05D0\u05EA\u05D7\u05D5\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05DB\u05D1\u05E8 \u05DE\u05EA\u05D1\u05E6\u05E2"
      };
    }
    throw error3;
  }
  await ensureDailyTaskInstances(db, familyId);
  const { token } = await createSession(db, familyId, "parent");
  const finalized = await db.prepare(
    `UPDATE families SET is_initialized = 1, updated_at = ?
     WHERE id = ? AND is_initialized = 0`
  ).bind((/* @__PURE__ */ new Date()).toISOString(), familyId).run();
  if (finalized.meta.changes !== 1) {
    return { success: false, error: "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05D4\u05D9\u05D4 \u05DC\u05D4\u05E9\u05DC\u05D9\u05DD \u05D0\u05EA \u05D0\u05EA\u05D7\u05D5\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4" };
  }
  return { success: true, sessionToken: token };
}
__name(initializeFamily, "initializeFamily");

// src/wallet.ts
async function requestScreenTime(db, familyId, childId, minutes, source) {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    return { success: false, error: "\u05DB\u05DE\u05D5\u05EA \u05D4\u05D3\u05E7\u05D5\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D5\u05D2\u05D3\u05D5\u05DC \u05DE\u05D0\u05E4\u05E1" };
  }
  const child = await db.prepare(`SELECT available_minutes, name FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
  if (!child) {
    return { success: false, error: "\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" };
  }
  if (child.available_minutes < minutes) {
    return {
      success: false,
      error: `\u05D0\u05D9\u05DF \u05DE\u05E1\u05E4\u05D9\u05E7 \u05D3\u05E7\u05D5\u05EA \u05D1\u05D0\u05E8\u05E0\u05E7 (\u05D9\u05EA\u05E8\u05D4 \u05E0\u05D5\u05DB\u05D7\u05D9\u05EA: ${child.available_minutes} \u05D3\u05E7\u05D5\u05EA, \u05D4\u05EA\u05D1\u05E7\u05E9: ${minutes} \u05D3\u05E7\u05D5\u05EA)`
    };
  }
  const requestId = generateId();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const requestStatements = [
    db.prepare(
      `INSERT INTO screen_time_requests (
        id, family_id, child_id, requested_minutes, source, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    ).bind(requestId, familyId, childId, minutes, source, now),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'parent', NULL, 'screen_requested', ?, ?, 'screen_request', ?, ?)`
    ).bind(
      generateId(),
      familyId,
      `\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05DE\u05E1\u05DA: ${minutes} \u05D3\u05E7\u05D5\u05EA`,
      `${child.name} \u05DE\u05D1\u05E7\u05E9/\u05EA ${minutes} \u05D3\u05E7\u05D5\u05EA \u05DC-${source}`,
      requestId,
      now
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'child', ?, 'screen_time_requested', 'screen_time_request', ?, ?, ?)`
    ).bind(
      generateId(),
      familyId,
      childId,
      requestId,
      JSON.stringify({ minutes, source }),
      now
    )
  ];
  await db.batch(requestStatements);
  return { success: true, requestId };
}
__name(requestScreenTime, "requestScreenTime");
async function reviewScreenTimeRequest(db, requestId, parentFamilyId, approved, customMinutes) {
  const req = await db.prepare(`SELECT * FROM screen_time_requests WHERE id = ? AND family_id = ?`).bind(requestId, parentFamilyId).first();
  if (!req) return { success: false, error: "\u05D4\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  if (req.status !== "pending") return { success: false, error: "\u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05D8\u05D5\u05E4\u05DC\u05D4 \u05D1\u05E2\u05D1\u05E8" };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const reviewOperationId = generateId();
  if (!approved) {
    const rejectionGuard = `EXISTS (
      SELECT 1 FROM screen_time_requests r
      WHERE r.id = ? AND r.family_id = ? AND r.status = 'rejected'
        AND r.review_operation_id = ?
    )`;
    const rejectionStatements = [
      db.prepare(
        `UPDATE screen_time_requests
         SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent', review_operation_id = ?
         WHERE id = ? AND family_id = ? AND status = 'pending'`
      ).bind(now, reviewOperationId, requestId, parentFamilyId),
      db.prepare(
        `INSERT INTO notifications (
          id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
        )
        SELECT ?, ?, 'child', ?, 'screen_rejected', '\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05DE\u05E1\u05DA \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4',
               '\u05D4\u05D4\u05D5\u05E8\u05D9\u05DD \u05DC\u05D0 \u05D0\u05D9\u05E9\u05E8\u05D5 \u05D0\u05EA \u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05DB\u05E2\u05EA.', 'screen_request', ?, ?
        WHERE ${rejectionGuard}`
      ).bind(
        generateId(),
        parentFamilyId,
        req.child_id,
        requestId,
        now,
        requestId,
        parentFamilyId,
        reviewOperationId
      ),
      db.prepare(
        `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
         SELECT ?, ?, 'parent', 'parent', 'screen_time_rejected', 'screen_time_request', ?, ?, ?
         WHERE ${rejectionGuard}`
      ).bind(
        generateId(),
        parentFamilyId,
        requestId,
        JSON.stringify({ reviewOperationId }),
        now,
        requestId,
        parentFamilyId,
        reviewOperationId
      )
    ];
    const rejectionResults = await db.batch(rejectionStatements);
    if (Number(rejectionResults[0]?.meta?.changes || 0) === 0) {
      return { success: false, error: "\u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05D8\u05D5\u05E4\u05DC\u05D4" };
    }
    return { success: true, deductedMinutes: 0 };
  }
  if (customMinutes !== void 0 && (!Number.isSafeInteger(customMinutes) || customMinutes <= 0)) {
    return { success: false, error: "\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D3\u05E7\u05D5\u05EA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D5\u05D2\u05D3\u05D5\u05DC \u05DE\u05D0\u05E4\u05E1" };
  }
  const finalMinutes = customMinutes !== void 0 ? customMinutes : req.requested_minutes;
  if (!Number.isSafeInteger(finalMinutes) || finalMinutes <= 0) {
    return { success: false, error: "\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D3\u05E7\u05D5\u05EA \u05D1\u05D1\u05E7\u05E9\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF" };
  }
  const usageLogId = generateId();
  const txId = generateId();
  const spendReason = `\u05D6\u05DE\u05DF \u05DE\u05E1\u05DA: ${req.source} (${finalMinutes} \u05D3\u05E7')`;
  const approvalGuard = `EXISTS (
    SELECT 1 FROM screen_time_requests r
    WHERE r.id = ? AND r.family_id = ? AND r.status = 'approved'
      AND r.review_operation_id = ?
  )`;
  const results = await db.batch([
    db.prepare(
      `UPDATE screen_time_requests
       SET status = 'approved', approved_minutes = ?, reviewed_at = ?, reviewed_by = 'parent', review_operation_id = ?
       WHERE id = ? AND family_id = ? AND status = 'pending'
         AND EXISTS (
           SELECT 1 FROM children c
           WHERE c.id = screen_time_requests.child_id AND c.family_id = ?
             AND c.available_minutes >= ?
         )`
    ).bind(finalMinutes, now, reviewOperationId, requestId, parentFamilyId, parentFamilyId, finalMinutes),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes - ?, updated_at = ?
       WHERE id = ? AND family_id = ? AND available_minutes >= ?
         AND ${approvalGuard}`
    ).bind(
      finalMinutes,
      now,
      req.child_id,
      parentFamilyId,
      finalMinutes,
      requestId,
      parentFamilyId,
      reviewOperationId
    ),
    db.prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, '\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05E7\u05E9\u05EA \u05DE\u05E1\u05DA', 'parent', ?
      WHERE ${approvalGuard}`
    ).bind(
      usageLogId,
      parentFamilyId,
      req.child_id,
      requestId,
      req.source,
      finalMinutes,
      now,
      requestId,
      parentFamilyId,
      reviewOperationId
    ),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, screen_time_request_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'spend', ?, c.available_minutes, ?, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ? AND ${approvalGuard}`
    ).bind(
      txId,
      parentFamilyId,
      -finalMinutes,
      spendReason,
      usageLogId,
      requestId,
      now,
      req.child_id,
      parentFamilyId,
      requestId,
      parentFamilyId,
      reviewOperationId
    ),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'screen_approved', ?, ?, 'screen_request', ?, ?
      WHERE ${approvalGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      req.child_id,
      `\u05D6\u05DE\u05DF \u05DE\u05E1\u05DA \u05D0\u05D5\u05E9\u05E8! (${finalMinutes} \u05D3\u05E7\u05D5\u05EA)`,
      `\u05EA\u05D4\u05E0\u05D4! \u05E0\u05D5\u05DB\u05D5 ${finalMinutes} \u05D3\u05E7\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8 ${req.source}.`,
      requestId,
      now,
      requestId,
      parentFamilyId,
      reviewOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'screen_time_approved', 'screen_time_request', ?, ?, ?
       WHERE ${approvalGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      requestId,
      JSON.stringify({ finalMinutes, source: req.source, reviewOperationId }),
      now,
      requestId,
      parentFamilyId,
      reviewOperationId
    )
  ]);
  if (Number(results[0]?.meta?.changes || 0) === 0) {
    const current = await db.prepare(
      `SELECT r.status, c.available_minutes
       FROM screen_time_requests r
       LEFT JOIN children c ON c.id = r.child_id AND c.family_id = r.family_id
       WHERE r.id = ? AND r.family_id = ?`
    ).bind(requestId, parentFamilyId).first();
    if (current?.status === "pending" && Number(current.available_minutes ?? -1) < finalMinutes) {
      return {
        success: false,
        error: `\u05D0\u05D9\u05DF \u05DE\u05E1\u05E4\u05D9\u05E7 \u05D3\u05E7\u05D5\u05EA \u05D1\u05D0\u05E8\u05E0\u05E7 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D1\u05E7\u05E9\u05D4 (\u05D9\u05EA\u05E8\u05D4 \u05E0\u05D5\u05DB\u05D7\u05D9\u05EA: ${Number(current.available_minutes ?? 0)} \u05D3\u05E7\u05D5\u05EA)`
      };
    }
    return { success: false, error: "\u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05D8\u05D5\u05E4\u05DC\u05D4" };
  }
  return { success: true, deductedMinutes: finalMinutes };
}
__name(reviewScreenTimeRequest, "reviewScreenTimeRequest");
async function logManualScreenUsage(db, familyId, childId, minutes, source, reason = null, clientRequestId = null) {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    return { success: false, error: "\u05D4\u05D3\u05E7\u05D5\u05EA \u05DC\u05E0\u05D9\u05E6\u05D5\u05DC \u05D7\u05D9\u05D9\u05D1\u05D5\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D5\u05D7\u05D9\u05D5\u05D1\u05D9" };
  }
  const child = await db.prepare(`SELECT id FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
  if (!child) return { success: false, error: "\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" };
  const settings = await db.prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`).bind(familyId).first();
  const threshold = settings?.warning_debt_threshold ?? -60;
  const requestKey = typeof clientRequestId === "string" ? clientRequestId.trim() : "";
  if (requestKey && !/^[A-Za-z0-9._:-]{8,160}$/.test(requestKey)) {
    return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D1\u05E7\u05E9\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF" };
  }
  if (requestKey) {
    const existingUsageId = `manual-usage:${familyId}:${requestKey}`;
    const existingUsage = await db.prepare(
      `SELECT child_id, source, minutes, COALESCE(reason, '') AS reason
       FROM screen_usage_logs WHERE id = ? AND family_id = ?`
    ).bind(existingUsageId, familyId).first();
    if (existingUsage) {
      const normalizedReason = reason || "";
      const sameRequest = existingUsage.child_id === childId && Number(existingUsage.minutes) === minutes && existingUsage.source === source && existingUsage.reason === normalizedReason;
      if (!sameRequest) {
        return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05E9\u05D9\u05DE\u05E9 \u05DC\u05E8\u05D9\u05E9\u05D5\u05DD \u05E0\u05D9\u05E6\u05D5\u05DC \u05D0\u05D7\u05E8" };
      }
      const existingBalance = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
      const newBalance2 = Number(existingBalance?.available_minutes || 0);
      const warning2 = newBalance2 < threshold ? `\u05E9\u05D9\u05DD \u05DC\u05D1: \u05D4\u05D9\u05EA\u05E8\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4 (${newBalance2} \u05D3\u05E7\u05D5\u05EA) \u05D7\u05D5\u05E8\u05D2\u05EA \u05DE\u05E1\u05E3 \u05D4\u05D0\u05D6\u05D4\u05E8\u05D4 \u05D4\u05DE\u05E9\u05E4\u05D7\u05EA\u05D9 (${threshold} \u05D3\u05E7\u05D5\u05EA)` : void 0;
      return { success: true, warning: warning2, newBalance: newBalance2 };
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const usageLogId = requestKey ? `manual-usage:${familyId}:${requestKey}` : generateId();
  const txId = requestKey ? `manual-usage-tx:${familyId}:${requestKey}` : generateId();
  const auditId = requestKey ? `manual-usage-audit:${familyId}:${requestKey}` : generateId();
  const ledgerReason = reason ? `\u05E0\u05D9\u05E6\u05D5\u05DC \u05DE\u05E1\u05DA \u05D9\u05D3\u05E0\u05D9: ${source} - ${reason}` : `\u05E0\u05D9\u05E6\u05D5\u05DC \u05DE\u05E1\u05DA \u05D9\u05D3\u05E0\u05D9: ${source}`;
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'parent', ?)`
    ).bind(usageLogId, familyId, childId, source, minutes, reason, now),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes - ?, updated_at = ?
       WHERE id = ? AND family_id = ?
         AND NOT EXISTS (SELECT 1 FROM minute_transactions WHERE id = ?)`
    ).bind(minutes, now, childId, familyId, txId),
    db.prepare(
      `INSERT OR IGNORE INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'spend', ?, c.available_minutes, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ?
        AND EXISTS (SELECT 1 FROM screen_usage_logs sul WHERE sul.id = ?)`
    ).bind(txId, familyId, -minutes, ledgerReason, usageLogId, now, childId, familyId, usageLogId),
    db.prepare(
      `INSERT OR IGNORE INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'manual_screen_usage_logged', 'screen_usage_log', ?, ?, ?)`
    ).bind(auditId, familyId, usageLogId, JSON.stringify({ minutes, source, reason, clientRequestId: requestKey || null }), now)
  ]);
  if (requestKey) {
    const persistedUsage = await db.prepare(
      `SELECT child_id, source, minutes, COALESCE(reason, '') AS reason
       FROM screen_usage_logs WHERE id = ? AND family_id = ?`
    ).bind(usageLogId, familyId).first();
    const normalizedReason = reason || "";
    const samePersistedRequest = Boolean(
      persistedUsage && persistedUsage.child_id === childId && Number(persistedUsage.minutes) === minutes && persistedUsage.source === source && persistedUsage.reason === normalizedReason
    );
    if (!samePersistedRequest) {
      return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05E9\u05D9\u05DE\u05E9 \u05DC\u05E8\u05D9\u05E9\u05D5\u05DD \u05E0\u05D9\u05E6\u05D5\u05DC \u05D0\u05D7\u05E8" };
    }
  }
  const updated = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
  const newBalance = Number(updated?.available_minutes || 0);
  const warning = newBalance < threshold ? `\u05E9\u05D9\u05DD \u05DC\u05D1: \u05D4\u05D9\u05EA\u05E8\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4 (${newBalance} \u05D3\u05E7\u05D5\u05EA) \u05D7\u05D5\u05E8\u05D2\u05EA \u05DE\u05E1\u05E3 \u05D4\u05D0\u05D6\u05D4\u05E8\u05D4 \u05D4\u05DE\u05E9\u05E4\u05D7\u05EA\u05D9 (${threshold} \u05D3\u05E7\u05D5\u05EA)` : void 0;
  return { success: true, warning, newBalance };
}
__name(logManualScreenUsage, "logManualScreenUsage");
async function adjustMinutes(db, familyId, childId, minutesDelta, reason, clientRequestId = null) {
  if (!Number.isSafeInteger(minutesDelta) || minutesDelta === 0) {
    return { success: false, error: "\u05E9\u05D9\u05E0\u05D5\u05D9 \u05D4\u05D3\u05E7\u05D5\u05EA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D5\u05E9\u05D5\u05E0\u05D4 \u05DE\u05D0\u05E4\u05E1" };
  }
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  if (minutesDelta < 0 && !normalizedReason) {
    return { success: false, error: "\u05D4\u05E4\u05D7\u05EA\u05EA \u05D3\u05E7\u05D5\u05EA \u05D3\u05D5\u05E8\u05E9\u05EA \u05E6\u05D9\u05D5\u05DF \u05E1\u05D9\u05D1\u05D4" };
  }
  const child = await db.prepare(`SELECT id FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
  if (!child) return { success: false, error: "\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" };
  const settings = await db.prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`).bind(familyId).first();
  const threshold = settings?.warning_debt_threshold ?? -60;
  const ledgerReason = normalizedReason || (minutesDelta > 0 ? "\u05EA\u05D5\u05E1\u05E4\u05EA \u05D3\u05E7\u05D5\u05EA \u05D9\u05D3\u05E0\u05D9\u05EA" : "\u05D4\u05E4\u05D7\u05EA\u05EA \u05D3\u05E7\u05D5\u05EA \u05D9\u05D3\u05E0\u05D9\u05EA");
  const requestKey = typeof clientRequestId === "string" ? clientRequestId.trim() : "";
  if (requestKey && !/^[A-Za-z0-9._:-]{8,160}$/.test(requestKey)) {
    return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D1\u05E7\u05E9\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF" };
  }
  const txId = requestKey ? `manual-adjust:${familyId}:${requestKey}` : generateId();
  const auditId = requestKey ? `manual-adjust-audit:${familyId}:${requestKey}` : generateId();
  const rewardId = requestKey ? `manual-adjust-reward:${familyId}:${requestKey}` : generateId();
  if (requestKey) {
    const existingAdjustment = await db.prepare(
      `SELECT child_id, amount, COALESCE(reason, '') AS reason
       FROM minute_transactions WHERE id = ? AND family_id = ?`
    ).bind(txId, familyId).first();
    if (existingAdjustment) {
      const sameRequest = existingAdjustment.child_id === childId && Number(existingAdjustment.amount) === minutesDelta && existingAdjustment.reason === ledgerReason;
      if (!sameRequest) {
        return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05E9\u05D9\u05DE\u05E9 \u05DC\u05D4\u05EA\u05D0\u05DE\u05EA \u05D3\u05E7\u05D5\u05EA \u05D0\u05D7\u05E8\u05EA" };
      }
      const existingBalance = await db.prepare(
        `SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`
      ).bind(childId, familyId).first();
      const newBalance2 = Number(existingBalance?.available_minutes || 0);
      const warning2 = newBalance2 < threshold ? `\u05E9\u05D9\u05DD \u05DC\u05D1: \u05D4\u05D9\u05EA\u05E8\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4 (${newBalance2} \u05D3\u05E7\u05D5\u05EA) \u05E0\u05DE\u05D5\u05DB\u05D4 \u05DE\u05E1\u05E3 \u05D4\u05D0\u05D6\u05D4\u05E8\u05D4 (${threshold} \u05D3\u05E7\u05D5\u05EA)` : void 0;
      return { success: true, warning: warning2, newBalance: newBalance2, replayed: true };
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const statements = [
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes + ?, updated_at = ?
       WHERE id = ? AND family_id = ?
         AND NOT EXISTS (SELECT 1 FROM minute_transactions WHERE id = ? AND family_id = ?)`
    ).bind(minutesDelta, now, childId, familyId, txId, familyId),
    db.prepare(
      `INSERT OR IGNORE INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at
      )
      SELECT ?, ?, c.id, 'adjustment', ?, c.available_minutes, ?, 'parent', ?
      FROM children c WHERE c.id = ? AND c.family_id = ?`
    ).bind(txId, familyId, minutesDelta, ledgerReason, now, childId, familyId)
  ];
  if (minutesDelta > 0) {
    statements.push(
      db.prepare(
        `INSERT OR IGNORE INTO reward_events (
          id, family_id, child_id, type, title, body, minutes_delta, xp_delta, seen_at, created_at
        )
        SELECT ?, ?, ?, 'manual_bonus', ?, ?, ?, 0, NULL, ?
        WHERE EXISTS (
          SELECT 1 FROM minute_transactions
          WHERE id = ? AND family_id = ? AND child_id = ? AND amount = ? AND reason = ?
        )`
      ).bind(
        rewardId,
        familyId,
        childId,
        "\u05E7\u05D9\u05D1\u05DC\u05EA \u05D1\u05D5\u05E0\u05D5\u05E1 \u05D3\u05E7\u05D5\u05EA!",
        `\u05E0\u05D5\u05E1\u05E4\u05D5 ${minutesDelta} \u05D3\u05E7\u05D5\u05EA: ${normalizedReason}`,
        minutesDelta,
        now,
        txId,
        familyId,
        childId,
        minutesDelta,
        ledgerReason
      )
    );
  }
  statements.push(
    db.prepare(
      `INSERT OR IGNORE INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'manual_minute_adjustment', 'minute_transaction', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM minute_transactions
         WHERE id = ? AND family_id = ? AND child_id = ? AND amount = ? AND reason = ?
       )`
    ).bind(
      auditId,
      familyId,
      txId,
      JSON.stringify({ minutesDelta, reason: normalizedReason, clientRequestId: requestKey || null }),
      now,
      txId,
      familyId,
      childId,
      minutesDelta,
      ledgerReason
    )
  );
  const results = await db.batch(statements);
  const applied = Number(results[0]?.meta?.changes || 0) > 0;
  if (requestKey) {
    const persistedAdjustment = await db.prepare(
      `SELECT child_id, amount, COALESCE(reason, '') AS reason
       FROM minute_transactions WHERE id = ? AND family_id = ?`
    ).bind(txId, familyId).first();
    const sameRequest = Boolean(
      persistedAdjustment && persistedAdjustment.child_id === childId && Number(persistedAdjustment.amount) === minutesDelta && persistedAdjustment.reason === ledgerReason
    );
    if (!sameRequest) {
      return { success: false, error: "\u05DE\u05D6\u05D4\u05D4 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05E9\u05D9\u05DE\u05E9 \u05DC\u05D4\u05EA\u05D0\u05DE\u05EA \u05D3\u05E7\u05D5\u05EA \u05D0\u05D7\u05E8\u05EA" };
    }
  }
  const updated = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`).bind(childId, familyId).first();
  const newBalance = Number(updated?.available_minutes || 0);
  const warning = newBalance < threshold ? `\u05E9\u05D9\u05DD \u05DC\u05D1: \u05D4\u05D9\u05EA\u05E8\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4 (${newBalance} \u05D3\u05E7\u05D5\u05EA) \u05E0\u05DE\u05D5\u05DB\u05D4 \u05DE\u05E1\u05E3 \u05D4\u05D0\u05D6\u05D4\u05E8\u05D4 (${threshold} \u05D3\u05E7\u05D5\u05EA)` : void 0;
  return { success: true, warning, newBalance, replayed: requestKey ? !applied : false };
}
__name(adjustMinutes, "adjustMinutes");
async function correctUsage(db, familyId, usageLogId, correctionReason) {
  const usage = await db.prepare(`SELECT * FROM screen_usage_logs WHERE id = ? AND family_id = ?`).bind(usageLogId, familyId).first();
  if (!usage) return { success: false, error: "\u05E8\u05E9\u05D5\u05DE\u05EA \u05D4\u05E0\u05D9\u05E6\u05D5\u05DC \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const correctionId = generateId();
  const txId = generateId();
  const refundedMinutes = Number(usage.minutes || 0);
  const refundReason = `\u05D6\u05D9\u05DB\u05D5\u05D9 / \u05EA\u05D9\u05E7\u05D5\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD \u05E9\u05D2\u05D5\u05D9: ${correctionReason || "\u05EA\u05D9\u05E7\u05D5\u05DF \u05E0\u05D9\u05E6\u05D5\u05DC \u05DE\u05E1\u05DA"}`;
  const results = await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO screen_usage_corrections (
        id, usage_log_id, family_id, child_id, transaction_id, correction_reason, corrected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(correctionId, usageLogId, familyId, usage.child_id, txId, correctionReason || null, now),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes + ?, updated_at = ?
       WHERE id = ? AND family_id = ?
         AND EXISTS (
           SELECT 1 FROM screen_usage_corrections c
           WHERE c.id = ? AND c.usage_log_id = ?
         )`
    ).bind(refundedMinutes, now, usage.child_id, familyId, correctionId, usageLogId),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'refund', ?, c.available_minutes, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ?
        AND EXISTS (
          SELECT 1 FROM screen_usage_corrections correction
          WHERE correction.id = ? AND correction.usage_log_id = ?
        )`
    ).bind(txId, familyId, refundedMinutes, refundReason, usageLogId, now, usage.child_id, familyId, correctionId, usageLogId),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'usage_corrected_refunded', 'screen_usage_log', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM screen_usage_corrections c WHERE c.id = ? AND c.usage_log_id = ?
       )`
    ).bind(
      generateId(),
      familyId,
      usageLogId,
      JSON.stringify({ refundedMinutes, correctionReason, correctionId }),
      now,
      correctionId,
      usageLogId
    )
  ]);
  if (Number(results[0]?.meta?.changes || 0) === 0) {
    return { success: false, error: "\u05E8\u05E9\u05D5\u05DE\u05EA \u05D4\u05E0\u05D9\u05E6\u05D5\u05DC \u05DB\u05D1\u05E8 \u05EA\u05D5\u05E7\u05E0\u05D4 \u05D1\u05E2\u05D1\u05E8" };
  }
  const child = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`).bind(usage.child_id, familyId).first();
  const newBalance = Number(child?.available_minutes || 0);
  return { success: true, refundedMinutes, newBalance };
}
__name(correctUsage, "correctUsage");
async function getChildWalletSummary(db, childId) {
  const child = await db.prepare(`SELECT available_minutes FROM children WHERE id = ?`).bind(childId).first();
  const availableMinutes = child?.available_minutes || 0;
  const todayIsrael = getIsraelDateString();
  const tomorrowIsrael = getIsraelDateOffset(1);
  const startOfWeek = getIsraelStartOfWeek();
  const startOfMonth = getIsraelStartOfMonth();
  const todayRange = getIsraelUtcRange(todayIsrael, tomorrowIsrael);
  const weekRange = getIsraelUtcRange(startOfWeek, tomorrowIsrael);
  const monthRange = getIsraelUtcRange(startOfMonth, tomorrowIsrael);
  const summarize = /* @__PURE__ */ __name(async (startUtc, endUtc) => db.prepare(
    `SELECT
        COALESCE(SUM(CASE WHEN amount > 0 AND type IN ('earn', 'adjustment') THEN amount ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE
          WHEN type = 'spend' AND amount < 0
            AND (
              screen_usage_log_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM screen_usage_corrections correction
                WHERE correction.usage_log_id = minute_transactions.screen_usage_log_id
              )
            )
          THEN ABS(amount) ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN amount > 0 AND created_by = 'academy_sync' THEN amount ELSE 0 END), 0) as academyEarned,
        COALESCE(SUM(CASE WHEN amount > 0 AND created_by = 'academy_sync' THEN 1 ELSE 0 END), 0) as academyQuestions,
        COALESCE(SUM(CASE WHEN amount > 0 AND created_by <> 'academy_sync' AND type IN ('earn', 'adjustment') THEN amount ELSE 0 END), 0) as taskEarned
       FROM minute_transactions
       WHERE child_id = ? AND created_at >= ? AND created_at < ?`
  ).bind(childId, startUtc, endUtc).first(), "summarize");
  const [todayRow, weekRow, monthRow] = await Promise.all([
    summarize(todayRange.startUtc, todayRange.endUtc),
    summarize(weekRange.startUtc, weekRange.endUtc),
    summarize(monthRange.startUtc, monthRange.endUtc)
  ]);
  return {
    availableMinutes,
    earnedToday: todayRow?.earned || 0,
    academyEarnedToday: todayRow?.academyEarned || 0,
    academyQuestionsToday: todayRow?.academyQuestions || 0,
    taskEarnedToday: todayRow?.taskEarned || 0,
    spentToday: todayRow?.spent || 0,
    earnedThisWeek: weekRow?.earned || 0,
    spentThisWeek: weekRow?.spent || 0,
    earnedThisMonth: monthRow?.earned || 0,
    spentThisMonth: monthRow?.spent || 0
  };
}
__name(getChildWalletSummary, "getChildWalletSummary");

// src/screen-sessions.ts
var SELF_REVIEW_MARKER = "child_self";
function isActiveSessionConflict(error3) {
  const message = error3 instanceof Error ? error3.message : String(error3 || "");
  return /UNIQUE constraint failed: screen_sessions\.child_id|idx_one_active_screen_session_per_child/i.test(message);
}
__name(isActiveSessionConflict, "isActiveSessionConflict");
var ALLOWED_SELF_SOURCES = /* @__PURE__ */ new Set([
  "playstation",
  "vr",
  "tv",
  "computer",
  "tablet",
  "phone",
  "youtube",
  "other"
]);
function remainingNow(row) {
  if (row.status !== "running" || !row.last_resumed_at) return Math.max(0, row.remaining_seconds);
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.last_resumed_at).getTime()) / 1e3));
  return Math.max(0, row.remaining_seconds - elapsed);
}
__name(remainingNow, "remainingNow");
function elapsedNow(row, remaining) {
  return Math.max(0, Math.min(row.allocated_seconds, row.allocated_seconds - remaining));
}
__name(elapsedNow, "elapsedNow");
async function recordSelfUsage(db, row, remaining) {
  if ((row.mode || "approved") !== "self") return { spentMinutes: 0 };
  const usedSeconds = elapsedNow(row, remaining);
  if (usedSeconds <= 0) return { spentMinutes: 0 };
  const requestedCharge = Math.max(1, Math.ceil(usedSeconds / 60));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const usageLogId = generateId();
  const transactionId = generateId();
  await db.batch([
    db.prepare(
      `INSERT INTO screen_usage_logs
        (id,family_id,child_id,screen_time_request_id,source,minutes,reason,created_by,created_at)
       SELECT ?,?,?,NULL,?,MIN(?,MAX(0,available_minutes)),?,'child',?
       FROM children
       WHERE id=? AND family_id=? AND available_minutes>0`
    ).bind(
      usageLogId,
      row.family_id,
      row.child_id,
      row.source,
      requestedCharge,
      "\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E2\u05E6\u05DE\u05D9 \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05D8\u05D9\u05D9\u05DE\u05E8",
      now,
      row.child_id,
      row.family_id
    ),
    db.prepare(
      `INSERT INTO minute_transactions
        (id,family_id,child_id,type,amount,balance_after,reason,screen_usage_log_id,created_by,created_at)
       SELECT ?,?,?,'spend',
              -MIN(?,MAX(0,available_minutes)),
              available_minutes-MIN(?,MAX(0,available_minutes)),
              printf('\u05E0\u05D9\u05E6\u05D5\u05DC \u05D6\u05DE\u05DF \u05E2\u05E6\u05DE\u05D9: %s (%d \u05D3\u05E7\u05D5\u05EA)', ?, MIN(?,MAX(0,available_minutes))),
              ?,'child',?
       FROM children
       WHERE id=? AND family_id=? AND available_minutes>0`
    ).bind(
      transactionId,
      row.family_id,
      row.child_id,
      requestedCharge,
      requestedCharge,
      row.source,
      requestedCharge,
      usageLogId,
      now,
      row.child_id,
      row.family_id
    ),
    db.prepare(
      `INSERT INTO audit_log
        (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
       SELECT ?,?,'child',?,'self_screen_usage_logged','screen_usage_log',?,?,?
       FROM children
       WHERE id=? AND family_id=? AND available_minutes>0`
    ).bind(
      generateId(),
      row.family_id,
      row.child_id,
      usageLogId,
      JSON.stringify({
        source: row.source,
        usedSeconds,
        requestedCharge
      }),
      now,
      row.child_id,
      row.family_id
    ),
    db.prepare(
      `UPDATE children
       SET available_minutes=available_minutes-MIN(?,MAX(0,available_minutes)), updated_at=?
       WHERE id=? AND family_id=? AND available_minutes>0`
    ).bind(requestedCharge, now, row.child_id, row.family_id)
  ]);
  const transaction = await db.prepare(
    `SELECT amount, balance_after FROM minute_transactions WHERE id=?`
  ).bind(transactionId).first();
  if (!transaction) {
    const child = await db.prepare(
      `SELECT available_minutes FROM children WHERE id=? AND family_id=?`
    ).bind(row.child_id, row.family_id).first();
    return { spentMinutes: 0, newBalance: child?.available_minutes };
  }
  return {
    spentMinutes: Math.max(0, -Number(transaction.amount || 0)),
    newBalance: Number(transaction.balance_after)
  };
}
__name(recordSelfUsage, "recordSelfUsage");
async function claimAndFinishExpiredSession(db, row) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const claimed = await db.prepare(
    `UPDATE screen_sessions
     SET status='finished', remaining_seconds=0, ended_at=?, updated_at=?
     WHERE id=? AND status='running'`
  ).bind(now, now, row.id).run();
  const changes = Number(claimed?.meta?.changes || 0);
  if (changes <= 0) return false;
  try {
    await db.prepare(
      `INSERT INTO audit_log
        (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
       VALUES (?,?,'system','screen_timer','screen_session_expired','screen_session',?,?,?)`
    ).bind(
      generateId(),
      row.family_id,
      row.id,
      JSON.stringify({ source: row.source, mode: row.mode || "approved" }),
      now
    ).run();
    await recordSelfUsage(db, row, 0);
    return true;
  } catch (err) {
    await db.prepare(
      `UPDATE screen_sessions
       SET status='running', ended_at=NULL, updated_at=?
       WHERE id=? AND status='finished'`
    ).bind((/* @__PURE__ */ new Date()).toISOString(), row.id).run();
    throw err;
  }
}
__name(claimAndFinishExpiredSession, "claimAndFinishExpiredSession");
async function normalizeExpired(db, row) {
  if (!row) return null;
  const remaining = remainingNow(row);
  const elapsed = elapsedNow(row, remaining);
  if (row.status === "running" && remaining <= 0) {
    const finished = await claimAndFinishExpiredSession(db, row);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      ...row,
      status: "finished",
      remaining_seconds: 0,
      ended_at: finished ? now : row.ended_at,
      remaining_now: 0,
      elapsed_now: row.allocated_seconds
    };
  }
  return { ...row, remaining_now: remaining, elapsed_now: elapsed };
}
__name(normalizeExpired, "normalizeExpired");
async function finalizeExpiredScreenSessions(db) {
  const { results } = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.status='running'`
  ).bind(SELF_REVIEW_MARKER).all();
  for (const row of results || []) {
    if (remainingNow(row) > 0) continue;
    await claimAndFinishExpiredSession(db, row);
  }
  const { results: pendingNotifications } = await db.prepare(
    `SELECT DISTINCT s.id, s.family_id, s.child_id, s.source,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.status='finished'
       AND EXISTS (
         SELECT 1 FROM audit_log a
         WHERE a.entity_type='screen_session'
           AND a.entity_id=s.id
           AND a.action='screen_session_expired'
       )
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.type='screen_time_up'
           AND n.entity_type='screen_session'
           AND n.entity_id=s.id
       )
     ORDER BY s.ended_at ASC
     LIMIT 100`
  ).bind(SELF_REVIEW_MARKER).all();
  return (pendingNotifications || []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    childId: row.child_id,
    source: row.source,
    mode: row.mode || "approved"
  }));
}
__name(finalizeExpiredScreenSessions, "finalizeExpiredScreenSessions");
async function getScreenSessionState(db, familyId, childId) {
  const active = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first();
  const normalized = await normalizeExpired(db, active || null);
  const { results: readyRequests } = await db.prepare(
    `SELECT r.id, r.approved_minutes, r.source, r.reviewed_at
     FROM screen_time_requests r
     LEFT JOIN screen_sessions s ON s.screen_time_request_id = r.id
     WHERE r.family_id=? AND r.child_id=? AND r.status='approved'
       AND r.approved_minutes > 0 AND s.id IS NULL
     ORDER BY r.reviewed_at DESC LIMIT 5`
  ).bind(familyId, childId).all();
  return {
    activeSession: normalized && ["running", "paused"].includes(normalized.status) ? normalized : null,
    readyRequests: readyRequests || [],
    serverNowMs: Date.now()
  };
}
__name(getScreenSessionState, "getScreenSessionState");
async function getFamilyActiveScreenSessions(db, familyId) {
  const { results } = await db.prepare(
    `SELECT s.*, c.name AS child_name, c.color AS child_color,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     JOIN children c ON c.id=s.child_id
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC`
  ).bind(SELF_REVIEW_MARKER, familyId).all();
  const activeSessions = [];
  for (const row of results || []) {
    const normalized = await normalizeExpired(db, row);
    if (normalized && ["running", "paused"].includes(normalized.status)) {
      activeSessions.push({
        ...normalized,
        child_name: row.child_name,
        child_color: row.child_color
      });
    }
  }
  return activeSessions;
}
__name(getFamilyActiveScreenSessions, "getFamilyActiveScreenSessions");
async function startScreenSession(db, familyId, childId, requestId) {
  const existingActive = await db.prepare(
    `SELECT id FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status IN ('running','paused') LIMIT 1`
  ).bind(familyId, childId).first();
  if (existingActive) return { success: false, error: "\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
  const request = await db.prepare(
    `SELECT id, approved_minutes, source FROM screen_time_requests
     WHERE id=? AND family_id=? AND child_id=? AND status='approved' AND approved_minutes > 0`
  ).bind(requestId, familyId, childId).first();
  if (!request) return { success: false, error: "\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05DE\u05E1\u05DA \u05DE\u05D0\u05D5\u05E9\u05E8\u05EA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" };
  const already = await db.prepare(
    `SELECT id FROM screen_sessions WHERE screen_time_request_id=?`
  ).bind(requestId).first();
  if (already) return { success: false, error: "\u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D4\u05D6\u05D4 \u05DB\u05D1\u05E8 \u05D4\u05D5\u05E4\u05E2\u05DC \u05D1\u05E2\u05D1\u05E8" };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const seconds = request.approved_minutes * 60;
  const id = generateId();
  try {
    await db.prepare(
      `INSERT INTO screen_sessions
        (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
    ).bind(id, familyId, childId, requestId, request.source, seconds, seconds, now, now, now, now).run();
  } catch (error3) {
    if (isActiveSessionConflict(error3)) return { success: false, error: "\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
    throw error3;
  }
  return { success: true, id };
}
__name(startScreenSession, "startScreenSession");
async function startSelfScreenSession(db, familyId, childId, source) {
  if (!ALLOWED_SELF_SOURCES.has(source)) {
    return { success: false, error: "\u05DE\u05E7\u05D5\u05E8 \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF" };
  }
  const existingActive = await db.prepare(
    `SELECT id FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status IN ('running','paused') LIMIT 1`
  ).bind(familyId, childId).first();
  if (existingActive) return { success: false, error: "\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
  const child = await db.prepare(
    `SELECT available_minutes FROM children WHERE id=? AND family_id=?`
  ).bind(childId, familyId).first();
  const availableMinutes = Math.max(0, Number(child?.available_minutes || 0));
  if (availableMinutes <= 0) {
    return { success: false, error: "\u05D0\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2 \u05D3\u05E7\u05D5\u05EA \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA \u05DC\u05E0\u05D9\u05E6\u05D5\u05DC" };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const requestId = generateId();
  const sessionId = generateId();
  const seconds = availableMinutes * 60;
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO screen_time_requests
          (id,family_id,child_id,requested_minutes,approved_minutes,source,status,requested_at,reviewed_at,reviewed_by)
         VALUES (?,?,?,0,NULL,?,'cancelled',?,?,?)`
      ).bind(requestId, familyId, childId, source, now, now, SELF_REVIEW_MARKER),
      db.prepare(
        `INSERT INTO screen_sessions
          (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
      ).bind(sessionId, familyId, childId, requestId, source, seconds, seconds, now, now, now, now),
      db.prepare(
        `INSERT INTO audit_log
          (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
         VALUES (?,?,'child',?,'self_screen_usage_started','screen_session',?,?,?)`
      ).bind(
        generateId(),
        familyId,
        childId,
        sessionId,
        JSON.stringify({ source, maxMinutes: availableMinutes }),
        now
      )
    ]);
  } catch (error3) {
    if (isActiveSessionConflict(error3)) return { success: false, error: "\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
    throw error3;
  }
  return { success: true, id: sessionId, maxMinutes: availableMinutes };
}
__name(startSelfScreenSession, "startSelfScreenSession");
async function pauseScreenSession(db, familyId, childId) {
  const row = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status='running'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first();
  if (!row) return { success: false, error: "\u05D0\u05D9\u05DF \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
  const remaining = remainingNow(row);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (remaining <= 0) {
    await claimAndFinishExpiredSession(db, row);
    return { success: true, remainingSeconds: 0, status: "finished", spentMinutes: 0 };
  }
  const paused = await db.prepare(
    `UPDATE screen_sessions
     SET status='paused', remaining_seconds=?, paused_at=?, updated_at=?
     WHERE id=? AND status='running'`
  ).bind(remaining, now, now, row.id).run();
  if (Number(paused?.meta?.changes || 0) <= 0) {
    return { success: false, error: "\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D4\u05E9\u05EA\u05E0\u05D4, \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1" };
  }
  return { success: true, remainingSeconds: remaining, status: "paused", spentMinutes: 0 };
}
__name(pauseScreenSession, "pauseScreenSession");
async function resumeScreenSession(db, familyId, childId) {
  const row = await db.prepare(
    `SELECT * FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status='paused'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first();
  if (!row) return { success: false, error: "\u05D0\u05D9\u05DF \u05D8\u05D9\u05D9\u05DE\u05E8 \u05DE\u05D5\u05E9\u05D4\u05D4" };
  if (row.remaining_seconds <= 0) return { success: false, error: "\u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD" };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `UPDATE screen_sessions
     SET status='running', last_resumed_at=?, paused_at=NULL, updated_at=?
     WHERE id=? AND status='paused'`
  ).bind(now, now, row.id).run();
  return { success: true };
}
__name(resumeScreenSession, "resumeScreenSession");
async function stopScreenSession(db, familyId, childId) {
  const row = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first();
  if (!row) return { success: false, error: "\u05D0\u05D9\u05DF \u05D8\u05D9\u05D9\u05DE\u05E8 \u05E4\u05E2\u05D9\u05DC" };
  const remaining = remainingNow(row);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const stopped = await db.prepare(
    `UPDATE screen_sessions
     SET status='stopped', remaining_seconds=?, ended_at=?, updated_at=?
     WHERE id=? AND status IN ('running','paused')`
  ).bind(remaining, now, now, row.id).run();
  if (Number(stopped?.meta?.changes || 0) <= 0) {
    return { success: false, error: "\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05DB\u05D1\u05E8 \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D0\u05D5 \u05D4\u05E9\u05EA\u05E0\u05D4" };
  }
  try {
    const usage = await recordSelfUsage(db, row, remaining);
    return {
      success: true,
      remainingSeconds: remaining,
      mode: row.mode || "approved",
      spentMinutes: usage.spentMinutes,
      newBalance: usage.newBalance
    };
  } catch (err) {
    await db.prepare(
      `UPDATE screen_sessions
       SET status=?, remaining_seconds=?, ended_at=?, updated_at=?
       WHERE id=? AND status='stopped'`
    ).bind(
      row.status,
      row.remaining_seconds,
      row.ended_at,
      (/* @__PURE__ */ new Date()).toISOString(),
      row.id
    ).run();
    throw err;
  }
}
__name(stopScreenSession, "stopScreenSession");

// src/privacy.ts
function renderPrivacyPolicyHtml() {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time+ | \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA - Privacy Policy</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.8);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.2);
      --accent: #a855f7;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #7c3aed);
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 2rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    section {
      margin-bottom: 2rem;
    }
    h2 {
      font-size: 1.3rem;
      color: var(--primary);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    p, ul {
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }
    ul {
      padding-right: 1.5rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    .highlight-box {
      background: rgba(56, 189, 248, 0.08);
      border-right: 4px solid var(--primary);
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    footer {
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      margin-top: 2rem;
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    a {
      color: var(--primary);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .lang-toggle {
      font-size: 0.85rem;
      margin-top: 1rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9\u05EA Time+</div>
      <h1>\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA (Privacy Policy)</h1>
      <p class="subtitle">\u05E2\u05D5\u05D3\u05DB\u05DF \u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4: 2 \u05D1\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8 2026</p>
    </header>

    <div class="highlight-box">
      <strong>\u05EA\u05E7\u05E6\u05D9\u05E8 \u05D1\u05E8\u05D5\u05E8 \u05D5\u05E4\u05E9\u05D5\u05D8:</strong> \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D9\u05EA <strong>Time+</strong> \u05D4\u05D9\u05D0 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9\u05EA \u05DC\u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05D5\u05D3\u05E7\u05D5\u05EA \u05DE\u05E1\u05DA. \u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05E6\u05D9\u05D2\u05D9\u05DD \u05E4\u05E8\u05E1\u05D5\u05DE\u05D5\u05EA, \u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05DE\u05D6\u05D4\u05D9 \u05E4\u05E8\u05E1\u05D5\u05DD \u05D5\u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DE\u05D9\u05D3\u05E2. \u05DC\u05E6\u05D5\u05E8\u05DA \u05EA\u05E4\u05E2\u05D5\u05DC \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA \u05D0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05E1\u05E4\u05E7\u05D9 \u05EA\u05E9\u05EA\u05D9\u05EA, \u05D5\u05D1\u05D4\u05DD Cloudflare \u05DC\u05D0\u05D9\u05E8\u05D5\u05D7 \u05D5\u05D0\u05D7\u05E1\u05D5\u05DF \u05D5-Google Firebase Cloud Messaging \u05DC\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA Push.
    </div>

    <section>
      <h2>1. \u05D9\u05D9\u05E2\u05D5\u05D3 \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D5\u05D4\u05D2\u05E0\u05D4 \u05E2\u05DC \u05D9\u05DC\u05D3\u05D9\u05DD</h2>
      <p>
        \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D9\u05EA Time+ \u05E4\u05D5\u05EA\u05D7\u05D4 \u05E2\u05D1\u05D5\u05E8 \u05DE\u05E9\u05E4\u05D7\u05D5\u05EA \u05D1\u05DE\u05D8\u05E8\u05D4 \u05DC\u05E2\u05D5\u05D3\u05D3 \u05D4\u05E8\u05D2\u05DC\u05D9\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD \u05D5\u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05D0\u05D5\u05D6\u05DF \u05E9\u05DC \u05D6\u05DE\u05E0\u05D9 \u05DE\u05E1\u05DA. \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05EA\u05D5\u05DB\u05E0\u05E0\u05D4 \u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05E1\u05D8\u05E0\u05D3\u05E8\u05D8\u05D9\u05DD \u05D4\u05DE\u05D7\u05DE\u05D9\u05E8\u05D9\u05DD \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DC\u05D4\u05D2\u05E0\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D9\u05DC\u05D3\u05D9\u05DD \u05D1\u05E8\u05E9\u05EA (\u05DB\u05D5\u05DC\u05DC \u05E2\u05DE\u05D9\u05D3\u05D4 \u05D1\u05DB\u05DC\u05DC\u05D9 COPPA \u05D5\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05DE\u05E9\u05E4\u05D7\u05D5\u05EA \u05E9\u05DC Google Play).
      </p>
    </section>

    <section>
      <h2>2. \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05E0\u05E9\u05DE\u05E8 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA</h2>
      <p>\u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05E0\u05E9\u05DE\u05E8 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05D5\u05D0 \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9 \u05D5\u05DE\u05E9\u05DE\u05E9 \u05D1\u05D0\u05D5\u05E4\u05DF \u05D1\u05DC\u05E2\u05D3\u05D9 \u05DC\u05EA\u05E4\u05E7\u05D5\u05D3 \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4:</p>
      <ul>
        <li><strong>\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9 \u05D5\u05D9\u05DC\u05D3\u05D9\u05DD:</strong> \u05E9\u05DD \u05E4\u05E8\u05D8\u05D9 \u05D0\u05D5 \u05DB\u05D9\u05E0\u05D5\u05D9 \u05E9\u05DC \u05D1\u05E0\u05D9 \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4, \u05D0\u05D5\u05D5\u05D8\u05D0\u05E8 \u05E9\u05E0\u05D1\u05D7\u05E8 \u05D5\u05E6\u05D1\u05E2 \u05DE\u05D5\u05E2\u05D3\u05E3. \u05D0\u05D9\u05DF \u05E6\u05D5\u05E8\u05DA \u05D5\u05D0\u05D9\u05DF \u05D3\u05E8\u05D9\u05E9\u05D4 \u05DC\u05D4\u05D6\u05E0\u05EA \u05E9\u05DD \u05DE\u05DC\u05D0, \u05DB\u05EA\u05D5\u05D1\u05EA, \u05D2\u05D9\u05DC \u05DE\u05D3\u05D5\u05D9\u05E7 \u05D0\u05D5 \u05DE\u05E1\u05E4\u05E8\u05D9 \u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA.</li>
        <li><strong>\u05E7\u05D5\u05D3 \u05D2\u05D9\u05E9\u05D4 (PIN):</strong> \u05E7\u05D5\u05D3\u05D9 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05D0\u05D9\u05E0\u05DD \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05DB\u05D8\u05E7\u05E1\u05D8 \u05E7\u05E8\u05D9\u05D0. \u05D4\u05DD \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D5\u05E6\u05E4\u05E0\u05EA \u05D7\u05D3-\u05DB\u05D9\u05D5\u05D5\u05E0\u05D9\u05EA \u05D5\u05DE\u05D2\u05D5\u05D1\u05D1\u05EA (Cryptographic Hash \u05E2\u05DD Salt \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9 \u05D5-Pepper \u05E1\u05D5\u05D3\u05D9) \u05DB\u05DA \u05E9\u05D0\u05E3 \u05D2\u05D5\u05E8\u05DD \u05D0\u05D9\u05E0\u05D5 \u05D9\u05DB\u05D5\u05DC \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9.</li>
        <li><strong>\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05D5\u05DE\u05D0\u05D6\u05DF \u05D3\u05E7\u05D5\u05EA:</strong> \u05E9\u05DE\u05D5\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05E9\u05D4\u05D4\u05D5\u05E8\u05D9\u05DD \u05D9\u05E6\u05E8\u05D5, \u05E1\u05D8\u05D8\u05D5\u05E1 \u05D1\u05D9\u05E6\u05D5\u05E2 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA, \u05DE\u05D0\u05D6\u05DF \u05D3\u05E7\u05D5\u05EA \u05D4\u05DE\u05E1\u05DA \u05D5\u05E8\u05D9\u05E9\u05D5\u05DE\u05D9 \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4 \u05E9\u05DC \u05E6\u05D1\u05D9\u05E8\u05D4 \u05D5\u05E0\u05D9\u05E6\u05D5\u05DC \u05D3\u05E7\u05D5\u05EA.</li>
        <li><strong>\u05E6\u05D9\u05DC\u05D5\u05DE\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9):</strong> \u05D1\u05DE\u05D9\u05D3\u05D4 \u05D5\u05D4\u05D4\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E2\u05D9\u05DC \u05D3\u05E8\u05D9\u05E9\u05EA \u05E6\u05D9\u05DC\u05D5\u05DD \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DE\u05E1\u05D5\u05D9\u05DE\u05EA, \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E0\u05E9\u05DE\u05E8\u05EA \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DC\u05E6\u05D5\u05E8\u05DA \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05D4\u05D5\u05E8\u05D4 \u05D1\u05EA\u05D5\u05DA \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05D4\u05DE\u05E9\u05E4\u05D7\u05EA\u05D9.</li>
        <li><strong>\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA Push \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9 Android:</strong> \u05DC\u05E6\u05D5\u05E8\u05DA \u05DE\u05E1\u05D9\u05E8\u05EA \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D0\u05E0\u05D5 \u05E9\u05D5\u05DE\u05E8\u05D9\u05DD \u05D0\u05E1\u05D9\u05DE\u05D5\u05DF FCM (Firebase Cloud Messaging token), \u05E1\u05D5\u05D2 \u05D4\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4 \u05D5\u05E9\u05DD/\u05D3\u05D2\u05DD \u05D4\u05DE\u05DB\u05E9\u05D9\u05E8 \u05DB\u05E4\u05D9 \u05E9\u05DE\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05D9\u05D3\u05D9 Android. Firebase \u05E2\u05E9\u05D5\u05D9 \u05DC\u05E2\u05D1\u05D3 \u05D2\u05DD \u05D2\u05E8\u05E1\u05EA \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4, \u05DE\u05D8\u05D0-\u05D3\u05D0\u05D8\u05D4 \u05D8\u05DB\u05E0\u05D9 \u05D5-Firebase Installation ID \u05D4\u05E0\u05D5\u05E6\u05E8 \u05DC\u05DB\u05DC \u05D4\u05EA\u05E7\u05E0\u05EA \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4.</li>
      </ul>
    </section>

    <section>
      <h2>3. \u05DE\u05D4 \u05D0\u05D9\u05E0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD?</h2>
      <ul>
        <li>\u274C \u05D0\u05D9\u05E0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD \u05DE\u05D9\u05E7\u05D5\u05DD \u05D2\u05D9\u05D0\u05D5\u05D2\u05E8\u05E4\u05D9 (GPS \u05D0\u05D5 \u05DE\u05D9\u05E7\u05D5\u05DD \u05DE\u05D3\u05D5\u05D9\u05E7).</li>
        <li>\u274C \u05D0\u05D9\u05E0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD \u05E4\u05E8\u05D8\u05D9 \u05E7\u05E9\u05E8 \u05E9\u05DC \u05D9\u05DC\u05D3\u05D9\u05DD (\u05DC\u05DC\u05D0 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC, \u05DC\u05DC\u05D0 \u05D8\u05DC\u05E4\u05D5\u05DF, \u05DC\u05DC\u05D0 \u05E8\u05E9\u05D9\u05DE\u05EA \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8).</li>
        <li>\u274C \u05D0\u05D9\u05E0\u05E0\u05D5 \u05D0\u05D5\u05E1\u05E4\u05D9\u05DD \u05DE\u05D6\u05D4\u05D9 \u05E4\u05E8\u05E1\u05D5\u05DD (Advertising IDs) \u05D0\u05D5 \u05DE\u05D6\u05D4\u05D9 \u05D7\u05D5\u05DE\u05E8\u05D4 \u05DC\u05E6\u05D5\u05E8\u05DB\u05D9 \u05E4\u05E8\u05E1\u05D5\u05DD/\u05DE\u05E2\u05E7\u05D1. Firebase \u05D9\u05D5\u05E6\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D4\u05EA\u05E7\u05E0\u05D4 \u05D8\u05DB\u05E0\u05D9 (Firebase Installation ID) \u05D4\u05E0\u05D3\u05E8\u05E9 \u05DC\u05D4\u05E4\u05E2\u05DC\u05EA \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA Push.</li>
        <li>\u274C \u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1-Google Analytics, \u05D1\u05E8\u05E9\u05EA\u05D5\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u05D0\u05D5 \u05D1-SDK \u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05D4 \u05E6\u05D3-\u05E9\u05DC\u05D9\u05E9\u05D9 \u05DC\u05E6\u05D5\u05E8\u05DA \u05DE\u05E2\u05E7\u05D1 \u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA\u05D9.</li>
      </ul>
    </section>

    <section>
      <h2>4. \u05DC\u05DC\u05D0 \u05E4\u05E8\u05E1\u05D5\u05DE\u05D5\u05EA (Zero Ads)</h2>
      <p>
        \u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D9\u05EA Time+ \u05E0\u05E7\u05D9\u05D9\u05D4 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF \u05DE\u05E4\u05E8\u05E1\u05D5\u05DE\u05D5\u05EA. \u05D0\u05D9\u05DF \u05E4\u05E8\u05E1\u05D5\u05DE\u05D5\u05EA \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4, \u05D0\u05D9\u05DF \u05E4\u05E8\u05E1\u05D5\u05DE\u05D5\u05EA \u05DE\u05D5\u05EA\u05D0\u05DE\u05D5\u05EA \u05D0\u05D9\u05E9\u05D9\u05EA, \u05D5\u05D0\u05D9\u05DF \u05E9\u05D5\u05DD \u05DE\u05DE\u05E9\u05E7 \u05DC\u05E8\u05E9\u05EA\u05D5\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD.
      </p>
    </section>

    <section>
      <h2>5. \u05E1\u05E4\u05E7\u05D9 \u05EA\u05E9\u05EA\u05D9\u05EA \u05D5\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA</h2>
      <p>
        Time+ \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1-Cloudflare \u05DC\u05E6\u05D5\u05E8\u05DA \u05D0\u05D9\u05E8\u05D5\u05D7, API \u05D5\u05D0\u05D7\u05E1\u05D5\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4, \u05D5\u05D1-Google Firebase Cloud Messaging (FCM) \u05DC\u05E6\u05D5\u05E8\u05DA \u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05DC\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9 Android. \u05DE\u05D9\u05D3\u05E2 \u05D8\u05DB\u05E0\u05D9 \u05D4\u05D3\u05E8\u05D5\u05E9 \u05DC\u05DE\u05E1\u05D9\u05E8\u05EA \u05D4\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E2\u05E9\u05D5\u05D9 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E2\u05D5\u05D1\u05D3 \u05E2\u05DC \u05D9\u05D3\u05D9 Google \u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05EA\u05E0\u05D0\u05D9 Firebase. \u05E1\u05E4\u05E7\u05D9\u05DD \u05D0\u05DC\u05D4 \u05E4\u05D5\u05E2\u05DC\u05D9\u05DD \u05DC\u05E6\u05D5\u05E8\u05DA \u05D0\u05E1\u05E4\u05E7\u05EA \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3; \u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D5\u05D0\u05D9\u05E0\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05D5 \u05DC\u05E4\u05E8\u05E1\u05D5\u05DD \u05DE\u05D5\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA.
      </p>
    </section>

    <section>
      <h2>6. \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2 \u05D5\u05D4\u05E6\u05E4\u05E0\u05D4</h2>
      <p>
        \u05DB\u05DC \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05DE\u05D5\u05E2\u05D1\u05E8 \u05D1\u05D9\u05DF \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D1\u05D8\u05DC\u05E4\u05D5\u05DF (\u05D0\u05E0\u05D3\u05E8\u05D5\u05D0\u05D9\u05D3) \u05D0\u05D5 \u05D1\u05D3\u05E4\u05D3\u05E4\u05DF (Web) \u05DC\u05D1\u05D9\u05DF \u05D4\u05E9\u05E8\u05EA\u05D9\u05DD \u05DE\u05D5\u05E6\u05E4\u05DF \u05D1\u05EA\u05E7\u05DF \u05D4\u05DE\u05D7\u05DE\u05D9\u05E8 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA HTTPS / TLS 1.3. \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05D0\u05D5\u05D7\u05E1\u05E0\u05D9\u05DD \u05D1\u05E2\u05E0\u05DF \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7 \u05E9\u05DC Cloudflare \u05E2\u05DD \u05D1\u05E7\u05E8\u05EA \u05D2\u05D9\u05E9\u05D4 \u05E7\u05E4\u05D3\u05E0\u05D9\u05EA.
      </p>
    </section>

    <section>
      <h2>7. \u05E9\u05DC\u05D9\u05D8\u05EA \u05D4\u05D5\u05E8\u05D9\u05DD \u05D5\u05DE\u05D7\u05D9\u05E7\u05EA \u05DE\u05D9\u05D3\u05E2</h2>
      <p>
        \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D9\u05E9 \u05E9\u05DC\u05D9\u05D8\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05D1\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DB\u05DC \u05E2\u05EA. \u05D4\u05D5\u05E8\u05D4 \u05E8\u05E9\u05D0\u05D9 \u05DC\u05E2\u05E8\u05D5\u05DA \u05D0\u05D5 \u05DC\u05DE\u05D7\u05D5\u05E7 \u05DB\u05DC \u05DE\u05E9\u05D9\u05DE\u05D4, \u05E8\u05D9\u05E9\u05D5\u05DD \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D0\u05D5 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D9\u05DC\u05D3 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DE\u05DE\u05DE\u05E9\u05E7 \u05D4\u05E0\u05D9\u05D4\u05D5\u05DC \u05E9\u05DC \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4. \u05DB\u05DE\u05D5 \u05DB\u05DF, \u05E0\u05D9\u05EA\u05DF \u05DC\u05E4\u05E0\u05D5\u05EA \u05DC\u05DE\u05E4\u05EA\u05D7 \u05D1\u05D3\u05D5\u05D0"\u05DC \u05D1\u05DB\u05DC \u05E2\u05EA \u05DC\u05D1\u05E7\u05E9 \u05DE\u05D7\u05D9\u05E7\u05D4 \u05DE\u05D5\u05D7\u05DC\u05D8\u05EA \u05E9\u05DC \u05DB\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05DE\u05D4\u05E9\u05E8\u05EA\u05D9\u05DD.
      </p>
    </section>

    <section>
      <h2>8. \u05D9\u05E6\u05D9\u05E8\u05EA \u05E7\u05E9\u05E8</h2>
      <p>
        \u05DC\u05DB\u05DC \u05E9\u05D0\u05DC\u05D4, \u05D4\u05D1\u05D4\u05E8\u05D4 \u05D0\u05D5 \u05D1\u05E7\u05E9\u05D4 \u05D1\u05E0\u05D5\u05E9\u05D0 \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D5\u05D0\u05D1\u05D8\u05D7\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD, \u05E0\u05D9\u05EA\u05DF \u05DC\u05E4\u05E0\u05D5\u05EA \u05DC\u05DE\u05E4\u05EA\u05D7 \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA:
        <br>
        <strong>\u05D9\u05E0\u05D9\u05D1 \u05E1. (Time+ Developer)</strong>
        <br>
        \u05D3\u05D5\u05D0"\u05DC: <a href="mailto:yanivsa@gmail.com">yanivsa@gmail.com</a>
      </p>
    </section>

    <footer>
      <p>\xA9 2026 Time+ \u2022 \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA \u2022 \u05E0\u05D5\u05E2\u05D3 \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9 \u05D0\u05D7\u05E8\u05D0\u05D9 \u05D5\u05DE\u05D0\u05D5\u05D6\u05DF</p>
    </footer>
  </div>
</body>
</html>`;
}
__name(renderPrivacyPolicyHtml, "renderPrivacyPolicyHtml");

// ../node_modules/uint8array-extras/index.js
var objectToString = Object.prototype.toString;
var uint8ArrayStringified = "[object Uint8Array]";
var arrayBufferStringified = "[object ArrayBuffer]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
__name(isType, "isType");
function isUint8Array(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
__name(isUint8Array, "isUint8Array");
function isArrayBuffer(value) {
  return isType(value, ArrayBuffer, arrayBufferStringified);
}
__name(isArrayBuffer, "isArrayBuffer");
function isUint8ArrayOrArrayBuffer(value) {
  return isUint8Array(value) || isArrayBuffer(value);
}
__name(isUint8ArrayOrArrayBuffer, "isUint8ArrayOrArrayBuffer");
function toUint8ArrayIfArrayBuffer(value) {
  return isArrayBuffer(value) ? new Uint8Array(value) : value;
}
__name(toUint8ArrayIfArrayBuffer, "toUint8ArrayIfArrayBuffer");
function assertUint8ArrayOrArrayBuffer(value) {
  if (!isUint8ArrayOrArrayBuffer(value)) {
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof value}\``);
  }
}
__name(assertUint8ArrayOrArrayBuffer, "assertUint8ArrayOrArrayBuffer");
function toUint8Array(value) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`Unsupported value, got \`${typeof value}\`.`);
}
__name(toUint8Array, "toUint8Array");
function concatUint8Arrays(arrays, totalLength) {
  if (arrays.length === 0) {
    return new Uint8Array(0);
  }
  totalLength ??= arrays.reduce((accumulator, currentValue) => accumulator + currentValue.byteLength, 0);
  const returnValue = new Uint8Array(totalLength);
  let offset = 0;
  for (let array of arrays) {
    assertUint8ArrayOrArrayBuffer(array);
    array = toUint8ArrayIfArrayBuffer(array);
    returnValue.set(array, offset);
    offset += array.length;
  }
  return returnValue;
}
__name(concatUint8Arrays, "concatUint8Arrays");
var cachedDecoders = {
  utf8: new globalThis.TextDecoder("utf8")
};
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
__name(assertString, "assertString");
var cachedEncoder = new globalThis.TextEncoder();
function stringToUint8Array(string) {
  assertString(string);
  return cachedEncoder.encode(string);
}
__name(stringToUint8Array, "stringToUint8Array");
function base64ToBase64Url(base64) {
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
__name(base64ToBase64Url, "base64ToBase64Url");
function base64UrlToBase64(base64url) {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padding = (4 - base64.length % 4) % 4;
  return base64 + "=".repeat(padding);
}
__name(base64UrlToBase64, "base64UrlToBase64");
var MAX_BLOCK_SIZE = 65535;
function uint8ArrayToBase64(array, { urlSafe = false } = {}) {
  assertUint8ArrayOrArrayBuffer(array);
  array = toUint8ArrayIfArrayBuffer(array);
  let base64 = "";
  for (let index = 0; index < array.length; index += MAX_BLOCK_SIZE) {
    const chunk = array.subarray(index, index + MAX_BLOCK_SIZE);
    base64 += globalThis.btoa(String.fromCodePoint.apply(void 0, chunk));
  }
  return urlSafe ? base64ToBase64Url(base64) : base64;
}
__name(uint8ArrayToBase64, "uint8ArrayToBase64");
function base64ToUint8Array(base64String) {
  assertString(base64String);
  return Uint8Array.from(globalThis.atob(base64UrlToBase64(base64String)), (x) => x.codePointAt(0));
}
__name(base64ToUint8Array, "base64ToUint8Array");
var byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));

// ../node_modules/@block65/webcrypto-web-push/dist/lib/utils.js
function encodeRecordSize(size) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, size);
  return bytes;
}
__name(encodeRecordSize, "encodeRecordSize");
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
__name(invariant, "invariant");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/client-keys.js
async function deriveClientKeys(sub) {
  const bytes = base64ToUint8Array(sub.keys.p256dh);
  const authSecretBytes = base64ToUint8Array(sub.keys.auth);
  invariant(bytes.byteLength === 65 && bytes[0] === 4, "Subscription p256dh is not an uncompressed P-256 point");
  invariant(authSecretBytes.byteLength === 16, "Subscription auth secret is not 16 bytes");
  return {
    publicKeyBytes: bytes,
    publicKey: await crypto.subtle.importKey("raw", bytes, {
      name: "ECDH",
      namedCurve: "P-256"
    }, false, []),
    authSecretBytes
  };
}
__name(deriveClientKeys, "deriveClientKeys");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/hkdf.js
function createHMAC(data) {
  const keyPromise = crypto.subtle.importKey("raw", data, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  return {
    hash: /* @__PURE__ */ __name(async (input) => {
      const k = await keyPromise;
      return crypto.subtle.sign("HMAC", k, input);
    }, "hash")
  };
}
__name(createHMAC, "createHMAC");
async function hkdf(salt, ikm) {
  const prkhPromise = createHMAC(salt).hash(ikm).then((prk) => createHMAC(prk));
  return {
    extract: /* @__PURE__ */ __name(async (info3, len) => {
      const prkh = await prkhPromise;
      const blocks = await Array.from({ length: Math.ceil(len / 32) }, (_, i) => i).reduce(async (acc, i) => {
        const previous = await acc;
        const hash = await prkh.hash(new Uint8Array([...previous.at(-1) ?? [], ...info3, i + 1]));
        return [...previous, new Uint8Array(hash)];
      }, Promise.resolve([]));
      return concatUint8Arrays(blocks).slice(0, len);
    }, "extract")
  };
}
__name(hkdf, "hkdf");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/info.js
function createKeyInfo(clientPublic, serverPublic) {
  return new Uint8Array([
    ...stringToUint8Array("WebPush: info\0"),
    ...clientPublic,
    ...serverPublic
  ]);
}
__name(createKeyInfo, "createKeyInfo");
function createInfo(type) {
  return stringToUint8Array(`Content-Encoding: ${type}\0`);
}
__name(createInfo, "createInfo");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/local-keys.js
async function generateLocalKeys() {
  const keyPair = await crypto.subtle.generateKey({
    name: "ECDH",
    namedCurve: "P-256"
  }, false, ["deriveBits"]);
  return {
    privateKey: keyPair.privateKey,
    publicKeyBytes: new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  };
}
__name(generateLocalKeys, "generateLocalKeys");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/salt.js
async function getSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}
__name(getSalt, "getSalt");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/encrypt.js
var recordSize = 4096;
var headerSize = 21 + 65;
var maxPlaintextSize = recordSize - headerSize - 17;
async function encryptNotification(subscription, plaintext, options = {}) {
  invariant(plaintext.byteLength <= maxPlaintextSize, `Payload is ${plaintext.byteLength} bytes, the maximum is ${maxPlaintextSize}`);
  const clientKeys = await deriveClientKeys(subscription);
  const salt = await getSalt();
  const localKeys = await generateLocalKeys();
  const sharedSecret = await crypto.subtle.deriveBits({
    name: "ECDH",
    public: clientKeys.publicKey
  }, localKeys.privateKey, 256);
  const keyInfo = createKeyInfo(clientKeys.publicKeyBytes, localKeys.publicKeyBytes);
  const cekInfo = createInfo("aes128gcm");
  const nonceInfo = createInfo("nonce");
  const ikmHkdf = await hkdf(clientKeys.authSecretBytes, sharedSecret);
  const ikm = await ikmHkdf.extract(keyInfo, 32);
  const messageHkdf = await hkdf(salt, ikm);
  const cekBytes = await messageHkdf.extract(cekInfo, 16);
  const nonceBytes = await messageHkdf.extract(nonceInfo, 12);
  const cekCryptoKey = await crypto.subtle.importKey("raw", cekBytes, {
    name: "AES-GCM",
    length: 128
  }, false, ["encrypt"]);
  const padTo = options.pad ?? true ? maxPlaintextSize : plaintext.byteLength;
  const padded = new Uint8Array(padTo + 1);
  padded.set(plaintext);
  padded[plaintext.byteLength] = 2;
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: nonceBytes
  }, cekCryptoKey, padded);
  return new Uint8Array([
    ...salt,
    ...encodeRecordSize(recordSize),
    localKeys.publicKeyBytes.byteLength,
    ...localKeys.publicKeyBytes,
    ...new Uint8Array(encrypted)
  ]);
}
__name(encryptNotification, "encryptNotification");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/base64.js
function encodeBase64Url(value) {
  return uint8ArrayToBase64(toUint8Array(value), { urlSafe: true });
}
__name(encodeBase64Url, "encodeBase64Url");
function objectToBase64Url(obj) {
  return encodeBase64Url(stringToUint8Array(JSON.stringify(obj)));
}
__name(objectToBase64Url, "objectToBase64Url");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/jwt.js
async function sign(payload, key) {
  const headerStr = objectToBase64Url({
    typ: "JWT",
    alg: "ES256"
  });
  const payloadStr = objectToBase64Url({
    iat: Math.floor(Date.now() / 1e3),
    ...payload
  });
  const dataStr = `${headerStr}.${payloadStr}`;
  const signature = await crypto.subtle.sign({
    name: "ECDSA",
    hash: "SHA-256"
  }, key, stringToUint8Array(dataStr));
  return `${dataStr}.${encodeBase64Url(signature)}`;
}
__name(sign, "sign");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/vapid.js
async function vapidHeaders(subscription, vapid) {
  invariant(vapid.subject, "Vapid subject is empty");
  invariant(vapid.privateKey, "Vapid private key is empty");
  invariant(vapid.publicKey, "Vapid public key is empty");
  const endpoint = new URL(subscription.endpoint);
  invariant(endpoint.protocol === "https:", `Subscription endpoint is not https: ${endpoint.protocol}`);
  const vapidPublicKeyBytes = base64ToUint8Array(vapid.publicKey);
  const publicKey = await crypto.subtle.importKey("jwk", {
    kty: "EC",
    crv: "P-256",
    x: encodeBase64Url(vapidPublicKeyBytes.slice(1, 33)),
    y: encodeBase64Url(vapidPublicKeyBytes.slice(33, 65)),
    d: vapid.privateKey
  }, {
    name: "ECDSA",
    namedCurve: "P-256"
  }, false, ["sign"]);
  const jwt = await sign({
    aud: endpoint.origin,
    exp: Math.floor(Date.now() / 1e3) + 12 * 60 * 60,
    sub: vapid.subject
  }, publicKey);
  return {
    headers: {
      authorization: `vapid t=${jwt}, k=${vapid.publicKey}`
    }
  };
}
__name(vapidHeaders, "vapidHeaders");

// ../node_modules/@block65/webcrypto-web-push/dist/lib/payload.js
async function buildPushPayload(message, subscription, vapid) {
  const { headers } = await vapidHeaders(subscription, vapid);
  const body = await encryptNotification(subscription, stringToUint8Array(
    // if its a primitive, convert to string, otherwise stringify
    typeof message.data === "string" || typeof message.data === "number" ? message.data.toString() : JSON.stringify(message.data)
  ));
  return {
    headers: {
      ...headers,
      ttl: (message.options?.ttl || 60).toString(),
      ...message.options?.urgency && {
        urgency: message.options.urgency
      },
      ...message.options?.topic && {
        topic: message.options.topic
      },
      "content-encoding": "aes128gcm",
      "content-length": body.byteLength.toString(),
      "content-type": "application/octet-stream"
    },
    method: "post",
    body
  };
}
__name(buildPushPayload, "buildPushPayload");

// src/notifications.ts
var fcmAccessTokenCache = null;
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function textToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}
__name(textToBase64Url, "textToBase64Url");
function pemToPkcs8(privateKey) {
  const normalized = privateKey.replace(/\\n/g, "\n");
  const base64 = normalized.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
__name(pemToPkcs8, "pemToPkcs8");
async function getFcmAccessToken(env2) {
  if (!env2.FCM_PROJECT_ID || !env2.FCM_CLIENT_EMAIL || !env2.FCM_PRIVATE_KEY) {
    return null;
  }
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now()) {
    return fcmAccessTokenCache.token;
  }
  const now = Math.floor(Date.now() / 1e3);
  const header = textToBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: env2.FCM_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const unsignedJwt = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(env2.FCM_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  if (!response.ok) {
    console.error("FCM OAuth token request failed:", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  if (!data.access_token) return null;
  const ttlSeconds = Math.max(60, Number(data.expires_in || 3600) - 120);
  fcmAccessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ttlSeconds * 1e3
  };
  return data.access_token;
}
__name(getFcmAccessToken, "getFcmAccessToken");
async function savePushSubscription(db, familyId, recipientRole, recipientChildId, subscription, userAgent) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = generateId();
  await db.prepare(
    `INSERT INTO push_subscriptions (
        id, family_id, recipient_role, recipient_child_id, endpoint, p256dh, auth, user_agent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        family_id = excluded.family_id,
        recipient_role = excluded.recipient_role,
        recipient_child_id = excluded.recipient_child_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = excluded.updated_at`
  ).bind(
    id,
    familyId,
    recipientRole,
    recipientChildId || null,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    userAgent || null,
    now,
    now
  ).run();
}
__name(savePushSubscription, "savePushSubscription");
async function removePushSubscription(db, endpoint) {
  await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
}
__name(removePushSubscription, "removePushSubscription");
async function saveFcmToken(db, familyId, recipientRole, recipientChildId, token, deviceName) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `INSERT INTO fcm_tokens (
        id, family_id, recipient_role, recipient_child_id, token, device_name, platform, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'android', ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        family_id = excluded.family_id,
        recipient_role = excluded.recipient_role,
        recipient_child_id = excluded.recipient_child_id,
        device_name = excluded.device_name,
        platform = excluded.platform,
        updated_at = excluded.updated_at`
  ).bind(
    generateId(),
    familyId,
    recipientRole,
    recipientChildId || null,
    token,
    deviceName || null,
    now,
    now
  ).run();
}
__name(saveFcmToken, "saveFcmToken");
async function removeFcmToken(db, token) {
  await db.prepare(`DELETE FROM fcm_tokens WHERE token = ?`).bind(token).run();
}
__name(removeFcmToken, "removeFcmToken");
async function getNotifications(db, familyId, recipientRole, recipientChildId, limit = 30) {
  let query = `SELECT * FROM notifications WHERE family_id = ? AND recipient_role = ?`;
  const params = [familyId, recipientRole];
  if (recipientRole === "child" && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    params.push(recipientChildId);
  }
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  const { results: notifications } = await db.prepare(query).bind(...params).all();
  let unreadQuery = `SELECT COUNT(*) as unread_count FROM notifications WHERE family_id = ? AND recipient_role = ? AND read_at IS NULL`;
  const unreadParams = [familyId, recipientRole];
  if (recipientRole === "child" && recipientChildId) {
    unreadQuery += ` AND recipient_child_id = ?`;
    unreadParams.push(recipientChildId);
  }
  const unread = await db.prepare(unreadQuery).bind(...unreadParams).first();
  return {
    notifications: notifications || [],
    unreadCount: unread?.unread_count || 0
  };
}
__name(getNotifications, "getNotifications");
async function markNotificationsAsRead(db, familyId, recipientRole, recipientChildId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let query = `UPDATE notifications SET read_at = ? WHERE family_id = ? AND recipient_role = ? AND read_at IS NULL`;
  const params = [now, familyId, recipientRole];
  if (recipientRole === "child" && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    params.push(recipientChildId);
  }
  await db.prepare(query).bind(...params).run();
}
__name(markNotificationsAsRead, "markNotificationsAsRead");
async function sendFcmNotifications(db, env2, notificationId, params) {
  const { familyId, recipientRole, recipientChildId, type, title: title2, message, entityType, entityId } = params;
  let query = `SELECT token FROM fcm_tokens WHERE family_id = ? AND recipient_role = ?`;
  const queryParams = [familyId, recipientRole];
  if (recipientRole === "child" && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    queryParams.push(recipientChildId);
  }
  const { results: tokens } = await db.prepare(query).bind(...queryParams).all();
  if (!tokens || tokens.length === 0) return;
  const accessToken = await getFcmAccessToken(env2);
  if (!accessToken || !env2.FCM_PROJECT_ID) {
    console.warn("Native FCM push skipped: Firebase service account is not configured");
    return;
  }
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env2.FCM_PROJECT_ID)}/messages:send`;
  for (const row of tokens) {
    try {
      const fcmMessage = {
        token: row.token,
        data: {
          notificationId,
          type,
          title: title2,
          body: message,
          entityType: entityType || "",
          entityId: entityId || "",
          url: recipientRole === "parent" ? "/parent" : "/child"
        },
        android: {
          priority: "HIGH"
        }
      };
      if (type !== "screen_time_up") {
        fcmMessage.notification = {
          title: title2,
          body: message
        };
        fcmMessage.android.notification = {
          channel_id: "timeplus_updates",
          sound: "default"
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: fcmMessage })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("FCM send failed:", response.status, errorText);
        if (/UNREGISTERED|registration-token-not-registered/i.test(errorText)) {
          await removeFcmToken(db, row.token);
        }
      }
    } catch (err) {
      console.error("FCM dispatch failed:", err);
    }
  }
}
__name(sendFcmNotifications, "sendFcmNotifications");
async function sendNotification(db, env2, params) {
  const { familyId, recipientRole, recipientChildId, type, title: title2, message, entityType, entityId } = params;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const notificationId = generateId();
  if (!params.skipDbInsert) {
    try {
      await db.prepare(
        `INSERT INTO notifications (
            id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        notificationId,
        familyId,
        recipientRole,
        recipientChildId || null,
        type,
        title2,
        message,
        entityType || null,
        entityId || null,
        now
      ).run();
    } catch (err) {
      console.error("Failed to insert in-app notification:", err);
    }
  }
  try {
    let subsQuery = `SELECT * FROM push_subscriptions WHERE family_id = ? AND recipient_role = ?`;
    const subsParams = [familyId, recipientRole];
    if (recipientRole === "child" && recipientChildId) {
      subsQuery += ` AND recipient_child_id = ?`;
      subsParams.push(recipientChildId);
    }
    const { results: subscriptions } = await db.prepare(subsQuery).bind(...subsParams).all();
    if (subscriptions && subscriptions.length > 0) {
      const vapidKeys = {
        subject: env2.VAPID_SUBJECT || "https://timeplus.yanivsa.workers.dev",
        publicKey: env2.VAPID_PUBLIC_KEY || "",
        privateKey: env2.VAPID_PRIVATE_KEY || ""
      };
      if (vapidKeys.publicKey && vapidKeys.privateKey) {
        const pushMessage = {
          data: JSON.stringify({
            notificationId,
            title: title2,
            body: message,
            type,
            entityType,
            entityId,
            url: recipientRole === "parent" ? "/parent" : "/child",
            timestamp: Date.now()
          }),
          options: {
            ttl: 86400
          }
        };
        for (const sub of subscriptions) {
          try {
            const pushSub = {
              endpoint: sub.endpoint,
              expirationTime: null,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            };
            const payload = await buildPushPayload(pushMessage, pushSub, vapidKeys);
            const res = await fetch(sub.endpoint, payload);
            if (res.status === 404 || res.status === 410) {
              await removePushSubscription(db, sub.endpoint);
            }
          } catch (pushErr) {
            console.error(`Web Push dispatch failed for endpoint ${sub.endpoint}:`, pushErr);
          }
        }
      } else {
        console.warn("Web Push skipped: VAPID keys are not configured");
      }
    }
  } catch (err) {
    console.error("Web Push lookup/dispatch failed:", err);
  }
  try {
    await sendFcmNotifications(db, env2, notificationId, params);
  } catch (err) {
    console.error("Native FCM push lookup/dispatch failed:", err);
  }
}
__name(sendNotification, "sendNotification");

// src/index.ts
function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    ...extraHeaders
  });
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
function errorJson(message, status = 400, extraHeaders = {}) {
  return json({ success: false, error: message }, status, extraHeaders);
}
__name(errorJson, "errorJson");
var index_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    if (pathname === "/privacy" && method === "GET") {
      return new Response(renderPrivacyPolicyHtml(), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    if (pathname === "/healthz" && method === "GET") {
      return json({
        status: "ok",
        app: env2.APP_NAME || "Time+",
        time: (/* @__PURE__ */ new Date()).toISOString(),
        timezone: env2.TIMEZONE || "Asia/Jerusalem",
        israelDate: getIsraelDateString()
      });
    }
    if (pathname === "/api/version" && method === "GET") {
      return json({
        webVersion: env2.WEB_VERSION || "1.0.0",
        apiVersion: env2.API_VERSION || "1.0.0",
        environment: env2.ENVIRONMENT || "production",
        webBuildId: "tp-" + (env2.WEB_VERSION || "1.0.0")
      });
    }
    if (pathname === "/api/push/vapid-public-key" && method === "GET") {
      if (!env2.VAPID_PUBLIC_KEY) return errorJson("Push notifications are not configured", 503);
      return json({ publicKey: env2.VAPID_PUBLIC_KEY });
    }
    if (pathname === "/api/setup/status" && method === "GET") {
      const initialized = await isSystemInitialized(env2.DB);
      let children = [];
      let familyName = "\u05DE\u05E9\u05E4\u05D7\u05D4";
      if (initialized) {
        children = await getPublicChildrenList(env2.DB);
        const family = await env2.DB.prepare(`SELECT name FROM families LIMIT 1`).first();
        if (family) familyName = family.name;
      }
      return json({ initialized, familyName, children });
    }
    if (pathname === "/api/setup/init" && method === "POST") {
      try {
        const payload = await request.json();
        const result = await initializeFamily(env2.DB, env2, payload);
        if (!result.success) {
          return errorJson(result.error || "\u05D0\u05EA\u05D7\u05D5\u05DC \u05E0\u05DB\u05E9\u05DC", 400);
        }
        const cookie = createSessionCookie(result.sessionToken);
        return json(
          { success: true, message: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D5\u05EA\u05D7\u05DC\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" },
          200,
          { "Set-Cookie": cookie }
        );
      } catch (err) {
        return errorJson("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3 \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D0\u05EA\u05D7\u05D5\u05DC: " + err.message, 500);
      }
    }
    if (pathname === "/api/auth/login" && method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
      const body = await request.json().catch(() => ({}));
      const role = body.role;
      const pin = body.pin;
      const childId = body.childId;
      if (!role || !pin) {
        return errorJson("\u05E0\u05D0 \u05DC\u05E1\u05E4\u05E7 \u05EA\u05E4\u05E7\u05D9\u05D3 \u05D5\u05E7\u05D5\u05D3 \u05E1\u05D5\u05D3\u05D9", 400);
      }
      const targetId = role === "parent" ? "parent" : childId || "unknown_child";
      const rateLimit = await checkRateLimit(env2.DB, ip, targetId);
      if (!rateLimit.allowed) {
        return errorJson(
          `\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD. \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E0\u05E2\u05D5\u05DC \u05DC-${rateLimit.remainingMinutes} \u05D3\u05E7\u05D5\u05EA \u05DC\u05D4\u05D2\u05E0\u05D4 \u05E2\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA.`,
          429
        );
      }
      if (!env2.PEPPER_SECRET) {
        return errorJson("\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA", 503);
      }
      const familyId = env2.DEFAULT_FAMILY_ID || "yaniv_family";
      if (role === "parent") {
        const family = await env2.DB.prepare(
          `SELECT id, name, parent_pin_hash, parent_pin_salt FROM families WHERE id = ?`
        ).bind(familyId).first();
        if (!family) {
          return errorJson("\u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05D8\u05E8\u05DD \u05D4\u05D5\u05D2\u05D3\u05E8\u05D4 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA", 404);
        }
        const verification = await verifyPinWithPepperMigration(
          pin,
          family.parent_pin_hash,
          family.parent_pin_salt,
          env2
        );
        await recordLoginAttempt(env2.DB, ip, "parent", "parent", verification.valid);
        if (!verification.valid) {
          return errorJson("\u05E7\u05D5\u05D3 \u05D4\u05D5\u05E8\u05D4 \u05E9\u05D2\u05D5\u05D9", 401);
        }
        if (verification.migrated && verification.hash && verification.salt) {
          await env2.DB.prepare(
            `UPDATE families SET parent_pin_hash=?, parent_pin_salt=?, updated_at=? WHERE id=?`
          ).bind(verification.hash, verification.salt, (/* @__PURE__ */ new Date()).toISOString(), family.id).run();
        }
        const { token } = await createSession(env2.DB, family.id, "parent");
        const cookie = createSessionCookie(token);
        const user = { id: "parent", name: "\u05D4\u05D5\u05E8\u05D9\u05DD", role: "parent", familyId: family.id };
        return json({ success: true, user, token }, 200, { "Set-Cookie": cookie });
      } else if (role === "child") {
        if (!childId) {
          return errorJson("\u05E0\u05D0 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D9\u05DC\u05D3", 400);
        }
        const child = await env2.DB.prepare(
          `SELECT id, family_id, name, pin_hash, pin_salt, avatar, color FROM children WHERE id = ? AND family_id = ?`
        ).bind(childId, familyId).first();
        if (!child) {
          return errorJson("\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0", 404);
        }
        const verification = await verifyPinWithPepperMigration(
          pin,
          child.pin_hash,
          child.pin_salt,
          env2
        );
        await recordLoginAttempt(env2.DB, ip, "child", childId, verification.valid);
        if (!verification.valid) {
          return errorJson("\u05E7\u05D5\u05D3 \u05E1\u05D5\u05D3\u05D9 \u05E9\u05D2\u05D5\u05D9", 401);
        }
        if (verification.migrated && verification.hash && verification.salt) {
          await env2.DB.prepare(
            `UPDATE children SET pin_hash=?, pin_salt=?, updated_at=? WHERE id=? AND family_id=?`
          ).bind(verification.hash, verification.salt, (/* @__PURE__ */ new Date()).toISOString(), child.id, child.family_id).run();
        }
        const { token } = await createSession(env2.DB, child.family_id, "child", child.id);
        const cookie = createSessionCookie(token);
        const user = {
          id: child.id,
          name: child.name,
          role: "child",
          familyId: child.family_id,
          avatar: child.avatar,
          color: child.color
        };
        return json({ success: true, user, token }, 200, { "Set-Cookie": cookie });
      }
      return errorJson("\u05EA\u05E4\u05E7\u05D9\u05D3 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF", 400);
    }
    if (pathname === "/api/auth/logout" && method === "POST") {
      const cookieHeader = request.headers.get("Cookie");
      const cookies = parseCookies(cookieHeader);
      const cookieToken = cookies["timeplus_session"] || null;
      const authHeader = request.headers.get("Authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() || null : null;
      const tokensToRevoke = [...new Set([cookieToken, bearerToken].filter((token) => Boolean(token)))];
      await Promise.all(tokensToRevoke.map((token) => deleteSession(env2.DB, token)));
      return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie() });
    }
    if (pathname === "/api/auth/me" && method === "GET") {
      const user = await getSessionUser(request, env2.DB);
      if (!user) {
        return errorJson("\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8", 401);
      }
      return json({ success: true, user });
    }
    if (pathname.startsWith("/api/")) {
      const user = await getSessionUser(request, env2.DB);
      if (!user) {
        return errorJson("\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA", 401);
      }
      await ensureDailyTaskInstancesOnce(env2.DB, user.familyId);
      if (pathname === "/api/child/dashboard" && method === "GET") {
        const childId = user.role === "child" ? user.id : url.searchParams.get("childId");
        if (!childId) return errorJson("\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const child = await env2.DB.prepare(
          `SELECT id, name, avatar, color, available_minutes FROM children WHERE id = ? AND family_id = ?`
        ).bind(childId, user.familyId).first();
        if (!child) return errorJson("\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0", 404);
        const walletSummary = await getChildWalletSummary(env2.DB, childId);
        const progress = await env2.DB.prepare(
          `SELECT level, xp, current_streak_days, best_streak_days FROM child_progress WHERE child_id = ?`
        ).bind(childId).first();
        const currentXp = progress?.xp || 0;
        const rankInfo = getRankDetails(currentXp);
        const pendingRow = await env2.DB.prepare(
          `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'submitted'`
        ).bind(childId).first();
        const nextTask = await env2.DB.prepare(
          `SELECT ti.id, ti.title, ti.description, ti.reward_minutes
           FROM task_instances ti
           JOIN task_templates tt ON tt.id = ti.template_id
           JOIN task_template_children ttc ON ttc.template_id = tt.id AND ttc.child_id = ti.child_id
           WHERE ti.child_id = ? AND ti.status = 'open'
             AND tt.is_active = 1 AND tt.archived_at IS NULL
           ORDER BY ti.reward_minutes DESC LIMIT 1`
        ).bind(childId).first();
        return json({
          child,
          wallet: walletSummary,
          progress: {
            ...rankInfo,
            currentStreakDays: progress?.current_streak_days || 0,
            bestStreakDays: progress?.best_streak_days || 0
          },
          pendingSubmissionsCount: pendingRow?.count || 0,
          recommendedTask: nextTask || null
        });
      }
      if (pathname === "/api/child/tasks" && method === "GET") {
        const childId = user.role === "child" ? user.id : url.searchParams.get("childId");
        if (!childId) return errorJson("\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const todayIsrael = getIsraelDateString();
        const { results: tasks } = await env2.DB.prepare(
          `SELECT ti.*, ts.note as submission_note, tt.schedule_type
           FROM task_instances ti
           JOIN task_templates tt ON tt.id = ti.template_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.child_id = ? AND (
             ti.status = 'submitted'
             OR (
               tt.is_active = 1 AND tt.archived_at IS NULL
               AND EXISTS (
                 SELECT 1 FROM task_template_children ttc
                 WHERE ttc.template_id = tt.id AND ttc.child_id = ti.child_id
               )
               AND (
                 ti.due_date = ?
                 OR (tt.schedule_type = 'repeatable' AND ti.status IN ('open','rejected'))
               )
             )
           )
           ORDER BY 
             CASE ti.status 
               WHEN 'open' THEN 1 
               WHEN 'submitted' THEN 2 
               WHEN 'rejected' THEN 3 
               ELSE 4 
             END, 
             ti.reward_minutes DESC`
        ).bind(childId, todayIsrael).all();
        return json({ tasks });
      }
      if (pathname.match(/^\/api\/child\/tasks\/[^/]+\/submit$/) && method === "POST") {
        const instanceId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const note = body.note || null;
        const photoKey = body.photoObjectKey || null;
        const childId = user.role === "child" ? user.id : body.childId;
        if (!childId) return errorJson("\u05DC\u05D0 \u05E6\u05D5\u05D9\u05DF \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const result = await submitTask(env2.DB, instanceId, childId, note, photoKey);
        if (!result.success) {
          return errorJson(result.error || "\u05D4\u05D2\u05E9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4", 400);
        }
        ctx.waitUntil(
          (async () => {
            try {
              const child = await env2.DB.prepare(`SELECT name FROM children WHERE id = ?`).bind(childId).first();
              const instance = await env2.DB.prepare(`SELECT title FROM task_instances WHERE id = ?`).bind(instanceId).first();
              await sendNotification(env2.DB, env2, {
                familyId: user.familyId,
                recipientRole: "parent",
                type: "task_submitted",
                title: "\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D5\u05D2\u05E9\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8! \u{1F4DD}",
                message: `${child?.name || "\u05D4\u05D9\u05DC\u05D3/\u05D4"} \u05D4\u05D2\u05D9\u05E9/\u05D4 \u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${instance?.title || "\u05DE\u05E9\u05D9\u05DE\u05D4"}" \u05D5\u05DE\u05DE\u05EA\u05D9\u05DF/\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8\u05DA`,
                entityType: "task_instance",
                entityId: instanceId,
                skipDbInsert: true
              });
            } catch (err) {
              console.error("Failed to dispatch task submission push:", err);
            }
          })()
        );
        return json({ success: true, message: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D4 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D4\u05D5\u05E8\u05D9\u05DD!" });
      }
      if (pathname === "/api/child/screen-time/request" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const minutes = Number(body.minutes);
        const source = body.source || "other";
        const childId = user.role === "child" ? user.id : body.childId;
        if (!childId) return errorJson("\u05DC\u05D0 \u05E6\u05D5\u05D9\u05DF \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const result = await requestScreenTime(env2.DB, user.familyId, childId, minutes, source);
        if (!result.success) {
          return errorJson(result.error || "\u05D4\u05D1\u05E7\u05E9\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4", 400);
        }
        ctx.waitUntil(
          (async () => {
            try {
              const child = await env2.DB.prepare(`SELECT name FROM children WHERE id = ?`).bind(childId).first();
              const sourceHebrew = source === "playstation" ? "\u05E4\u05DC\u05D9\u05D9\u05E1\u05D8\u05D9\u05D9\u05E9\u05DF" : source === "vr" ? "VR" : source === "tv" ? "\u05D8\u05DC\u05D5\u05D5\u05D9\u05D6\u05D9\u05D4" : source === "tablet" ? "\u05D8\u05D0\u05D1\u05DC\u05D8" : source === "phone" ? "\u05D8\u05DC\u05E4\u05D5\u05DF" : source;
              await sendNotification(env2.DB, env2, {
                familyId: user.familyId,
                recipientRole: "parent",
                type: "screen_request",
                title: "\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05DE\u05E1\u05DA \u05D7\u05D3\u05E9\u05D4 \u{1F4F1}",
                message: `${child?.name || "\u05D4\u05D9\u05DC\u05D3/\u05D4"} \u05DE\u05D1\u05E7\u05E9/\u05EA ${minutes} \u05D3\u05E7\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8 ${sourceHebrew}`,
                entityType: "screen_time_request",
                skipDbInsert: true
              });
            } catch (err) {
              console.error("Failed to dispatch screen request push:", err);
            }
          })()
        );
        return json({ success: true, message: "\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05E0\u05E9\u05DC\u05D7\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD!" });
      }
      if (pathname === "/api/child/screen-session" && method === "GET") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        return json(await getScreenSessionState(env2.DB, user.familyId, user.id));
      }
      if (pathname === "/api/child/screen-session/self-start" && method === "POST") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        const body = await request.json().catch(() => ({}));
        const source = String(body.source || "other");
        const result = await startSelfScreenSession(env2.DB, user.familyId, user.id, source);
        if (!result.success) return errorJson(result.error || "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05E0\u05D9\u05E6\u05D5\u05DC \u05D6\u05DE\u05DF", 400);
        return json({ ...result, ...await getScreenSessionState(env2.DB, user.familyId, user.id) });
      }
      if (pathname === "/api/child/screen-session/start" && method === "POST") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        const body = await request.json().catch(() => ({}));
        const result = await startScreenSession(env2.DB, user.familyId, user.id, String(body.requestId || ""));
        if (!result.success) return errorJson(result.error || "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E4\u05E2\u05D9\u05DC \u05D0\u05EA \u05D4\u05D8\u05D9\u05D9\u05DE\u05E8", 400);
        return json({ success: true, ...await getScreenSessionState(env2.DB, user.familyId, user.id) });
      }
      if (pathname === "/api/child/screen-session/pause" && method === "POST") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        const result = await pauseScreenSession(env2.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E9\u05D4\u05D5\u05EA \u05D0\u05EA \u05D4\u05D8\u05D9\u05D9\u05DE\u05E8", 400);
        return json({ success: true, ...await getScreenSessionState(env2.DB, user.familyId, user.id) });
      }
      if (pathname === "/api/child/screen-session/resume" && method === "POST") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        const result = await resumeScreenSession(env2.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05D0\u05EA \u05D4\u05D8\u05D9\u05D9\u05DE\u05E8", 400);
        return json({ success: true, ...await getScreenSessionState(env2.DB, user.familyId, user.id) });
      }
      if (pathname === "/api/child/screen-session/stop" && method === "POST") {
        if (user.role !== "child") return errorJson("\u05D4\u05D8\u05D9\u05D9\u05DE\u05E8 \u05D6\u05DE\u05D9\u05DF \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
        const result = await stopScreenSession(env2.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05E6\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D8\u05D9\u05D9\u05DE\u05E8", 400);
        return json({ ...result, ...await getScreenSessionState(env2.DB, user.familyId, user.id) });
      }
      if (pathname === "/api/child/history" && method === "GET") {
        const childId = user.role === "child" ? user.id : url.searchParams.get("childId");
        if (!childId) return errorJson("\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const limit = Number(url.searchParams.get("limit")) || 30;
        const { results: transactions } = await env2.DB.prepare(
          `SELECT * FROM minute_transactions 
           WHERE child_id = ? 
           ORDER BY created_at DESC LIMIT ?`
        ).bind(childId, limit).all();
        return json({ transactions });
      }
      if (pathname === "/api/child/celebration" && method === "GET") {
        const childId = user.role === "child" ? user.id : url.searchParams.get("childId");
        if (!childId) return errorJson("\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05DC\u05D3", 400);
        const event = await env2.DB.prepare(
          `SELECT * FROM reward_events 
           WHERE child_id = ? AND seen_at IS NULL 
           ORDER BY created_at ASC LIMIT 1`
        ).bind(childId).first();
        if (event) {
          await env2.DB.prepare(`UPDATE reward_events SET seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).bind(event.id).run();
        }
        return json({ event: event || null });
      }
      if (pathname === "/api/push/vapid-public-key" && method === "GET") {
        if (!env2.VAPID_PUBLIC_KEY) return errorJson("Push notifications are not configured", 503);
        return json({ publicKey: env2.VAPID_PUBLIC_KEY });
      }
      if (pathname === "/api/push/subscribe" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const subscription = body.subscription;
        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
          return errorJson("\u05DE\u05D1\u05E0\u05D4 \u05DE\u05E0\u05D5\u05D9 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF", 400);
        }
        await savePushSubscription(
          env2.DB,
          user.familyId,
          user.role,
          user.role === "child" ? user.id : null,
          subscription,
          request.headers.get("User-Agent") || void 0
        );
        return json({ success: true, message: "\u05D4\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D4\u05D5\u05E4\u05E2\u05DC\u05D5 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!" });
      }
      if (pathname === "/api/push/unsubscribe" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        if (body.endpoint) {
          await removePushSubscription(env2.DB, body.endpoint);
        }
        return json({ success: true });
      }
      if (pathname === "/api/push/fcm-subscribe" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const token = String(body.token || "").trim();
        if (!token || token.length < 20 || token.length > 4096) {
          return errorJson("FCM token \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF", 400);
        }
        await saveFcmToken(
          env2.DB,
          user.familyId,
          user.role,
          user.role === "child" ? user.id : null,
          token,
          body.deviceName ? String(body.deviceName).slice(0, 160) : void 0
        );
        return json({ success: true, message: "\u05D4\u05DE\u05DB\u05E9\u05D9\u05E8 \u05E0\u05E8\u05E9\u05DD \u05DC\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA Android \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!" });
      }
      if (pathname === "/api/push/fcm-unsubscribe" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const token = String(body.token || "").trim();
        if (token) {
          await removeFcmToken(env2.DB, token);
        }
        return json({ success: true });
      }
      if (pathname === "/api/notifications" && method === "GET") {
        const data = await getNotifications(
          env2.DB,
          user.familyId,
          user.role,
          user.role === "child" ? user.id : null,
          30
        );
        return json(data);
      }
      if (pathname === "/api/notifications/read-all" && method === "POST") {
        await markNotificationsAsRead(
          env2.DB,
          user.familyId,
          user.role,
          user.role === "child" ? user.id : null
        );
        return json({ success: true });
      }
      if (user.role !== "parent") {
        return errorJson("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DE\u05D5\u05E8\u05E9\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3", 403);
      }
      if (pathname === "/api/parent/dashboard" && method === "GET") {
        const { results: children } = await env2.DB.prepare(
          `SELECT c.id, c.name, c.avatar, c.color, c.available_minutes, c.debt_limit_minutes,
                  cp.level, cp.xp, cp.current_streak_days, cp.best_streak_days
           FROM children c
           LEFT JOIN child_progress cp ON cp.child_id = c.id
           WHERE c.family_id = ?
           ORDER BY c.created_at ASC`
        ).bind(user.familyId).all();
        const childrenSummaries = [];
        for (const child of children) {
          const stats = await getChildWalletSummary(env2.DB, child.id);
          const rank = getRankDetails(child.xp || 0);
          const openTasks = await env2.DB.prepare(
            `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'open' AND due_date = ?`
          ).bind(child.id, getIsraelDateString()).first();
          const pendingTasks = await env2.DB.prepare(
            `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'submitted'`
          ).bind(child.id).first();
          const pendingRequests = await env2.DB.prepare(
            `SELECT COUNT(*) as count FROM screen_time_requests WHERE child_id = ? AND status = 'pending'`
          ).bind(child.id).first();
          childrenSummaries.push({
            ...child,
            wallet: stats,
            rankTitle: rank.rankTitle,
            progressPercent: rank.progressPercent,
            openTasksCount: openTasks?.count || 0,
            pendingApprovalsCount: pendingTasks?.count || 0,
            pendingScreenRequestsCount: pendingRequests?.count || 0
          });
        }
        const totalPendingTasks = await env2.DB.prepare(
          `SELECT COUNT(*) as count FROM task_instances WHERE family_id = ? AND status = 'submitted'`
        ).bind(user.familyId).first();
        const totalPendingRequests = await env2.DB.prepare(
          `SELECT COUNT(*) as count FROM screen_time_requests WHERE family_id = ? AND status = 'pending'`
        ).bind(user.familyId).first();
        const activeScreenSessions = await getFamilyActiveScreenSessions(env2.DB, user.familyId);
        return json({
          children: childrenSummaries,
          totalPendingTasks: totalPendingTasks?.count || 0,
          totalPendingRequests: totalPendingRequests?.count || 0,
          activeScreenSessions
        });
      }
      if (pathname === "/api/parent/approvals" && method === "GET") {
        const { results: pendingTasks } = await env2.DB.prepare(
          `SELECT ti.*, c.name as child_name, c.color as child_color, c.avatar as child_avatar,
                  ts.note as submission_note, ts.photo_object_key, ts.submitted_at as submission_time
           FROM task_instances ti
           JOIN children c ON c.id = ti.child_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.family_id = ? AND ti.status = 'submitted'
           ORDER BY ts.submitted_at ASC`
        ).bind(user.familyId).all();
        const { results: pendingRequests } = await env2.DB.prepare(
          `SELECT str.*, c.name as child_name, c.color as child_color, c.avatar as child_avatar, c.available_minutes
           FROM screen_time_requests str
           JOIN children c ON c.id = str.child_id
           WHERE str.family_id = ? AND str.status = 'pending'
           ORDER BY str.requested_at ASC`
        ).bind(user.familyId).all();
        return json({ pendingTasks, pendingRequests });
      }
      if (pathname === "/api/parent/tasks/approve-all" && method === "POST") {
        const { results: pending } = await env2.DB.prepare(
          `SELECT id, child_id, title, task_kind FROM task_instances
           WHERE family_id=? AND status='submitted' ORDER BY submitted_at ASC LIMIT 50`
        ).bind(user.familyId).all();
        let approvedCount = 0;
        for (const item of pending || []) {
          const result = await approveTask(env2.DB, item.id, user.familyId);
          if (!result.success) continue;
          approvedCount++;
          ctx.waitUntil(
            sendNotification(env2.DB, env2, {
              familyId: user.familyId,
              recipientRole: "child",
              recipientChildId: item.child_id,
              type: "task_approved",
              title: item.task_kind === "mandatory" ? "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u2B50" : "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u{1FA99}",
              message: item.task_kind === "mandatory" ? `\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3! \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${item.title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05E7\u05D9\u05D1\u05DC\u05EA ${result.xpAwarded || 0} XP.` : `\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3! \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${item.title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05E7\u05D9\u05D1\u05DC\u05EA +${result.minutesAwarded || 0} \u05D3\u05E7\u05D5\u05EA.`,
              entityType: "task_instance",
              entityId: item.id,
              skipDbInsert: true
            })
          );
        }
        return json({ success: true, approvedCount, message: `\u05D0\u05D5\u05E9\u05E8\u05D5 ${approvedCount} \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA` });
      }
      if (pathname.match(/^\/api\/parent\/tasks\/[^/]+\/approve$/) && method === "POST") {
        const instanceId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const customReward = body.rewardMinutes !== void 0 ? Number(body.rewardMinutes) : void 0;
        const result = await approveTask(env2.DB, instanceId, user.familyId, customReward);
        if (!result.success) {
          return errorJson(result.error || "\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05DB\u05E9\u05DC", 400);
        }
        ctx.waitUntil(
          (async () => {
            try {
              const task = await env2.DB.prepare(
                `SELECT child_id, title, task_kind FROM task_instances WHERE id = ?`
              ).bind(instanceId).first();
              if (task) {
                await sendNotification(env2.DB, env2, {
                  familyId: user.familyId,
                  recipientRole: "child",
                  recipientChildId: task.child_id,
                  type: "task_approved",
                  title: task.task_kind === "mandatory" ? "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u2B50" : "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u{1FA99}",
                  message: task.task_kind === "mandatory" ? `\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3! \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${task.title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05E7\u05D9\u05D1\u05DC\u05EA ${result.xpAwarded || 0} XP.` : `\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3! \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${task.title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05E7\u05D9\u05D1\u05DC\u05EA +${result.minutesAwarded || 0} \u05D3\u05E7\u05D5\u05EA!`,
                  entityType: "task_instance",
                  entityId: instanceId,
                  skipDbInsert: true
                });
              }
            } catch (err) {
              console.error("Failed to dispatch task approval push:", err);
            }
          })()
        );
        return json({
          success: true,
          message: (result.minutesAwarded || 0) > 0 ? "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D5\u05D4\u05D3\u05E7\u05D5\u05EA \u05D4\u05D5\u05E2\u05D1\u05E8\u05D5 \u05DC\u05D9\u05DC\u05D3" : "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D4\u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D5\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4-XP \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5",
          minutesAwarded: result.minutesAwarded,
          xpAwarded: result.xpAwarded
        });
      }
      if (pathname.match(/^\/api\/parent\/tasks\/[^/]+\/reject$/) && method === "POST") {
        const instanceId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const reason = body.reason || null;
        const result = await rejectTask(env2.DB, instanceId, user.familyId, reason);
        if (!result.success) {
          return errorJson(result.error || "\u05D3\u05D7\u05D9\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4", 400);
        }
        ctx.waitUntil(
          (async () => {
            try {
              const task = await env2.DB.prepare(
                `SELECT child_id, title FROM task_instances WHERE id = ?`
              ).bind(instanceId).first();
              if (task) {
                await sendNotification(env2.DB, env2, {
                  familyId: user.familyId,
                  recipientRole: "child",
                  recipientChildId: task.child_id,
                  type: "task_rejected",
                  title: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05DC\u05D2\u05D1\u05D9 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4",
                  message: reason ? `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${task.title}" \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05DB\u05E8\u05D2\u05E2: ${reason}` : `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${task.title}" \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05DB\u05E8\u05D2\u05E2`,
                  entityType: "task_instance",
                  entityId: instanceId,
                  skipDbInsert: true
                });
              }
            } catch (err) {
              console.error("Failed to dispatch task rejection push:", err);
            }
          })()
        );
        return json({ success: true, message: "\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05D3\u05D7\u05EA\u05D4" });
      }
      if (pathname.match(/^\/api\/parent\/screen-time\/[^/]+\/review$/) && method === "POST") {
        const requestId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const approved = Boolean(body.approved);
        const customMinutes = body.customMinutes !== void 0 ? Number(body.customMinutes) : void 0;
        const result = await reviewScreenTimeRequest(env2.DB, requestId, user.familyId, approved, customMinutes);
        if (!result.success) {
          return errorJson(result.error || "\u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4", 400);
        }
        ctx.waitUntil(
          (async () => {
            try {
              const req = await env2.DB.prepare(`SELECT child_id, source FROM screen_time_requests WHERE id = ?`).bind(requestId).first();
              if (req) {
                const sourceHebrew = req.source === "playstation" ? "\u05E4\u05DC\u05D9\u05D9\u05E1\u05D8\u05D9\u05D9\u05E9\u05DF" : req.source === "tv" ? "\u05D8\u05DC\u05D5\u05D5\u05D9\u05D6\u05D9\u05D4" : req.source === "tablet" ? "\u05D8\u05D0\u05D1\u05DC\u05D8" : req.source === "phone" ? "\u05D8\u05DC\u05E4\u05D5\u05DF" : req.source;
                await sendNotification(env2.DB, env2, {
                  familyId: user.familyId,
                  recipientRole: "child",
                  recipientChildId: req.child_id,
                  type: approved ? "screen_approved" : "screen_rejected",
                  title: approved ? "\u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D0\u05D5\u05E9\u05E8! \u{1F389}" : "\u05E2\u05D3\u05DB\u05D5\u05DF \u05DC\u05D2\u05D1\u05D9 \u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05DE\u05E1\u05DA",
                  message: approved ? `\u05D4\u05D4\u05D5\u05E8\u05D9\u05DD \u05D0\u05D9\u05E9\u05E8\u05D5 \u05DC\u05DA ${result.deductedMinutes || ""} \u05D3\u05E7\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8 ${sourceHebrew}! \u05E6\u05E4\u05D9\u05D9\u05D4 \u05DE\u05D4\u05E0\u05D4` : `\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05E2\u05D1\u05D5\u05E8 ${sourceHebrew} \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05DB\u05E2\u05EA`,
                  entityType: "screen_time_request",
                  entityId: requestId,
                  skipDbInsert: true
                });
              }
            } catch (err) {
              console.error("Failed to dispatch screen review push:", err);
            }
          })()
        );
        return json({
          success: true,
          message: approved ? "\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05D4\u05D3\u05E7\u05D5\u05EA \u05E0\u05D5\u05DB\u05D5" : "\u05D1\u05E7\u05E9\u05EA \u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05E0\u05D3\u05D7\u05EA\u05D4",
          deductedMinutes: result.deductedMinutes
        });
      }
      if (pathname === "/api/parent/usage/log" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const childId = body.childId;
        const minutes = Number(body.minutes);
        const source = body.source || "other";
        const reason = body.reason || null;
        const clientRequestId = typeof body.clientRequestId === "string" ? body.clientRequestId.trim() : null;
        if (!childId || !minutes || minutes <= 0) {
          return errorJson("\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD \u05DC\u05E8\u05D9\u05E9\u05D5\u05DD \u05E0\u05D9\u05E6\u05D5\u05DC", 400);
        }
        const result = await logManualScreenUsage(env2.DB, user.familyId, childId, minutes, source, reason, clientRequestId);
        if (!result.success) {
          return errorJson(result.error || "\u05E8\u05D9\u05E9\u05D5\u05DD \u05E0\u05D9\u05E6\u05D5\u05DC \u05E0\u05DB\u05E9\u05DC", 400);
        }
        return json({
          success: true,
          message: "\u05D4\u05E0\u05D9\u05E6\u05D5\u05DC \u05E0\u05E8\u05E9\u05DD \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4",
          warning: result.warning,
          newBalance: result.newBalance
        });
      }
      if (pathname.match(/^\/api\/parent\/usage\/[^/]+\/correct$/) && method === "POST") {
        const usageLogId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const correctionReason = body.correctionReason || "\u05EA\u05D9\u05E7\u05D5\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD \u05E9\u05D2\u05D5\u05D9";
        const result = await correctUsage(env2.DB, user.familyId, usageLogId, correctionReason);
        if (!result.success) {
          return errorJson(result.error || "\u05EA\u05D9\u05E7\u05D5\u05DF \u05D4\u05E8\u05D9\u05E9\u05D5\u05DD \u05E0\u05DB\u05E9\u05DC", 400);
        }
        return json({
          success: true,
          message: "\u05D4\u05E8\u05D9\u05E9\u05D5\u05DD \u05EA\u05D5\u05E7\u05DF \u05D5\u05D4\u05D3\u05E7\u05D5\u05EA \u05D4\u05D5\u05D7\u05D6\u05E8\u05D5 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D4\u05D9\u05DC\u05D3",
          refundedMinutes: result.refundedMinutes,
          newBalance: result.newBalance
        });
      }
      if (pathname === "/api/parent/minutes/adjust" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const childId = body.childId;
        const minutesDelta = Number(body.minutesDelta);
        const reason = body.reason || "";
        const clientRequestId = typeof body.clientRequestId === "string" ? body.clientRequestId.trim() : null;
        if (!childId || isNaN(minutesDelta)) {
          return errorJson("\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D9\u05DD", 400);
        }
        const result = await adjustMinutes(env2.DB, user.familyId, childId, minutesDelta, reason, clientRequestId);
        if (!result.success) {
          return errorJson(result.error || "\u05E2\u05D3\u05DB\u05D5\u05DF \u05D3\u05E7\u05D5\u05EA \u05E0\u05DB\u05E9\u05DC", 400);
        }
        if (minutesDelta > 0 && !result.replayed) {
          ctx.waitUntil(
            (async () => {
              try {
                await sendNotification(env2.DB, env2, {
                  familyId: user.familyId,
                  recipientRole: "child",
                  recipientChildId: childId,
                  type: "manual_bonus",
                  title: "\u05E7\u05D9\u05D1\u05DC\u05EA \u05EA\u05D5\u05E1\u05E4\u05EA \u05D3\u05E7\u05D5\u05EA! \u{1F381}",
                  message: `\u05D4\u05D4\u05D5\u05E8\u05D9\u05DD \u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05DC\u05DA +${minutesDelta} \u05D3\u05E7\u05D5\u05EA${reason ? `: ${reason}` : ""}!`
                });
              } catch (err) {
                console.error("Failed to dispatch bonus push:", err);
              }
            })()
          );
        }
        return json({
          success: true,
          message: "\u05D4\u05D9\u05EA\u05E8\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4",
          warning: result.warning,
          newBalance: result.newBalance
        });
      }
      if (pathname === "/api/parent/tasks/templates" && method === "GET") {
        const { results: templates } = await env2.DB.prepare(
          `SELECT tt.*, 
                  GROUP_CONCAT(ttc.child_id) as assigned_child_ids_str
           FROM task_templates tt
           LEFT JOIN task_template_children ttc ON ttc.template_id = tt.id
           WHERE tt.family_id = ? AND tt.archived_at IS NULL
           GROUP BY tt.id
           ORDER BY tt.created_at DESC`
        ).bind(user.familyId).all();
        const formatted = templates.map((t) => ({
          ...t,
          assigned_child_ids: t.assigned_child_ids_str ? t.assigned_child_ids_str.split(",") : []
        }));
        return json({ templates: formatted });
      }
      if (pathname === "/api/parent/tasks/templates" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const clientRequestId = typeof body.clientRequestId === "string" ? body.clientRequestId.trim() : "";
        const title2 = body.title?.trim();
        const description = body.description?.trim() || null;
        const rewardMinutes = Math.max(1, Number(body.rewardMinutes) || 15);
        const scheduleType = String(body.scheduleType || "daily");
        const taskKind = body.taskKind === "mandatory" ? "mandatory" : "bonus";
        const assignedChildIds = Array.isArray(body.assignedChildIds) ? body.assignedChildIds : [];
        const requiresPhoto = body.requiresPhoto ? 1 : 0;
        const verificationMode = body.verificationMode === "ai_media" ? "ai_media" : "manual";
        const verificationRulesJson = verificationMode === "ai_media" ? JSON.stringify(body.verificationRules && typeof body.verificationRules === "object" ? body.verificationRules : {}) : null;
        const allowVideoProof = body.allowVideoProof ? 1 : 0;
        const autoApproveEnabled = verificationMode === "ai_media" && body.autoApproveEnabled ? 1 : 0;
        const maxDailyAutoAwards = body.maxDailyAutoAwards === null || body.maxDailyAutoAwards === void 0 ? null : Math.max(1, Math.min(50, Number(body.maxDailyAutoAwards) || 1));
        const oneTimeDate = body.oneTimeDate || null;
        const timeWindowStart = body.timeWindowStart || null;
        const timeWindowEnd = body.timeWindowEnd || null;
        const rawDays = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [];
        const validDays = [...new Set(rawDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
        if (!title2) return errorJson("\u05DB\u05D5\u05EA\u05E8\u05EA \u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05D3\u05E8\u05E9\u05EA", 400);
        if (clientRequestId && !/^[A-Za-z0-9._:-]{8,160}$/.test(clientRequestId)) {
          return errorJson("\u05DE\u05D6\u05D4\u05D4 \u05D1\u05E7\u05E9\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF", 400);
        }
        if (!["one_time", "daily", "weekly", "custom", "repeatable"].includes(scheduleType)) {
          return errorJson("\u05EA\u05D3\u05D9\u05E8\u05D5\u05EA \u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4", 400);
        }
        if ((scheduleType === "weekly" || scheduleType === "custom") && validDays.length === 0) {
          return errorJson("\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05D9\u05D5\u05DD \u05D0\u05D7\u05D3 \u05D1\u05E9\u05D1\u05D5\u05E2", 400);
        }
        if (scheduleType === "one_time" && !/^\d{4}-\d{2}-\d{2}$/.test(String(oneTimeDate || ""))) {
          return errorJson("\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D7\u05D3-\u05E4\u05E2\u05DE\u05D9\u05EA", 400);
        }
        if (timeWindowStart && !/^\d{2}:\d{2}$/.test(timeWindowStart)) return errorJson("\u05E9\u05E2\u05EA \u05D4\u05EA\u05D7\u05DC\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4", 400);
        if (timeWindowEnd && !/^\d{2}:\d{2}$/.test(timeWindowEnd)) return errorJson("\u05E9\u05E2\u05EA \u05E1\u05D9\u05D5\u05DD \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4", 400);
        if (timeWindowStart && timeWindowEnd && timeWindowEnd <= timeWindowStart) {
          return errorJson("\u05E9\u05E2\u05EA \u05D4\u05E1\u05D9\u05D5\u05DD \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05D0\u05D7\u05E8\u05D9 \u05E9\u05E2\u05EA \u05D4\u05D4\u05EA\u05D7\u05DC\u05D4", 400);
        }
        const daysOfWeek = scheduleType === "weekly" || scheduleType === "custom" ? JSON.stringify(validDays) : scheduleType === "daily" || scheduleType === "repeatable" ? "[0,1,2,3,4,5,6]" : null;
        const templateId = clientRequestId ? `tplreq:${user.familyId}:${clientRequestId}` : generateId();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `INSERT OR IGNORE INTO task_templates (
            id, family_id, title, description, reward_minutes, schedule_type, days_of_week,
            time_window_start, time_window_end, requires_photo, task_kind, one_time_date,
            verification_mode, verification_rules_json, allow_video_proof, auto_approve_enabled, max_daily_auto_awards,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).bind(
          templateId,
          user.familyId,
          title2,
          description,
          rewardMinutes,
          scheduleType,
          daysOfWeek,
          timeWindowStart,
          timeWindowEnd,
          requiresPhoto,
          taskKind,
          oneTimeDate,
          verificationMode,
          verificationRulesJson,
          allowVideoProof,
          autoApproveEnabled,
          maxDailyAutoAwards,
          now,
          now
        ).run();
        let targets = assignedChildIds;
        if (targets.length === 0) {
          const { results } = await env2.DB.prepare(`SELECT id FROM children WHERE family_id=?`).bind(user.familyId).all();
          targets = (results || []).map((r) => r.id);
        }
        for (const cId of targets) {
          await env2.DB.prepare(
            `INSERT OR IGNORE INTO task_template_children (template_id, child_id)
             SELECT ?, id FROM children WHERE id=? AND family_id=?`
          ).bind(templateId, cId, user.familyId).run();
        }
        await ensureDailyTaskInstances(env2.DB, user.familyId);
        return json({ success: true, message: "\u05EA\u05D1\u05E0\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05D5\u05E6\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4", templateId });
      }
      if (pathname.match(/^\/api\/parent\/tasks\/templates\/[^/]+$/) && method === "PUT") {
        const templateId = pathname.split("/")[5];
        const body = await request.json().catch(() => ({}));
        const title2 = body.title?.trim();
        const description = body.description !== void 0 ? body.description?.trim() || null : void 0;
        const rewardMinutes = body.rewardMinutes !== void 0 ? Math.max(1, Number(body.rewardMinutes) || 1) : void 0;
        const scheduleType = body.scheduleType ? String(body.scheduleType) : void 0;
        const taskKind = body.taskKind ? body.taskKind === "mandatory" ? "mandatory" : "bonus" : void 0;
        const assignedChildIds = Array.isArray(body.assignedChildIds) ? body.assignedChildIds : null;
        const verificationMode = body.verificationMode !== void 0 ? body.verificationMode === "ai_media" ? "ai_media" : "manual" : void 0;
        const verificationRulesJson = body.verificationRules !== void 0 ? JSON.stringify(body.verificationRules && typeof body.verificationRules === "object" ? body.verificationRules : {}) : void 0;
        const allowVideoProof = body.allowVideoProof !== void 0 ? body.allowVideoProof ? 1 : 0 : void 0;
        const autoApproveEnabled = body.autoApproveEnabled !== void 0 ? body.autoApproveEnabled ? 1 : 0 : void 0;
        const maxDailyAutoAwards = body.maxDailyAutoAwards !== void 0 ? body.maxDailyAutoAwards === null ? null : Math.max(1, Math.min(50, Number(body.maxDailyAutoAwards) || 1)) : void 0;
        const oneTimeDate = body.oneTimeDate !== void 0 ? body.oneTimeDate || null : void 0;
        const timeWindowStart = body.timeWindowStart !== void 0 ? body.timeWindowStart || null : void 0;
        const timeWindowEnd = body.timeWindowEnd !== void 0 ? body.timeWindowEnd || null : void 0;
        const rawDays = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : null;
        const validDays = rawDays ? [...new Set(rawDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : null;
        const current = await env2.DB.prepare(`SELECT * FROM task_templates WHERE id=? AND family_id=?`).bind(templateId, user.familyId).first();
        if (!current) return errorJson("\u05EA\u05D1\u05E0\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
        const nextSchedule = scheduleType || current.schedule_type;
        if (!["one_time", "daily", "weekly", "custom", "repeatable"].includes(nextSchedule)) return errorJson("\u05EA\u05D3\u05D9\u05E8\u05D5\u05EA \u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4", 400);
        const switchingToSelectedDays = scheduleType && scheduleType !== current.schedule_type && (nextSchedule === "weekly" || nextSchedule === "custom");
        if ((nextSchedule === "weekly" || nextSchedule === "custom") && ((!validDays || validDays.length === 0) && (switchingToSelectedDays || !current.days_of_week))) {
          return errorJson("\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05D9\u05D5\u05DD \u05D0\u05D7\u05D3 \u05D1\u05E9\u05D1\u05D5\u05E2", 400);
        }
        const nextDate = oneTimeDate !== void 0 ? oneTimeDate : current.one_time_date;
        if (nextSchedule === "one_time" && !/^\d{4}-\d{2}-\d{2}$/.test(String(nextDate || ""))) {
          return errorJson("\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D7\u05D3-\u05E4\u05E2\u05DE\u05D9\u05EA", 400);
        }
        const nextStart = timeWindowStart !== void 0 ? timeWindowStart : current.time_window_start;
        const nextEnd = timeWindowEnd !== void 0 ? timeWindowEnd : current.time_window_end;
        if (nextStart && nextEnd && nextEnd <= nextStart) return errorJson("\u05E9\u05E2\u05EA \u05D4\u05E1\u05D9\u05D5\u05DD \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05D0\u05D7\u05E8\u05D9 \u05E9\u05E2\u05EA \u05D4\u05D4\u05EA\u05D7\u05DC\u05D4", 400);
        const daysOfWeek = validDays !== null ? JSON.stringify(validDays) : nextSchedule === "daily" || nextSchedule === "repeatable" ? "[0,1,2,3,4,5,6]" : current.days_of_week;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `UPDATE task_templates SET
             title=COALESCE(?,title),
             description=?,
             reward_minutes=COALESCE(?,reward_minutes),
             schedule_type=?,
             days_of_week=?,
             time_window_start=?,
             time_window_end=?,
             task_kind=?, one_time_date=?, verification_mode=?, verification_rules_json=?, allow_video_proof=?, auto_approve_enabled=?, max_daily_auto_awards=?, updated_at=?
           WHERE id=? AND family_id=?`
        ).bind(
          title2 || null,
          description !== void 0 ? description : current.description,
          rewardMinutes ?? null,
          nextSchedule,
          daysOfWeek,
          nextStart || null,
          nextEnd || null,
          taskKind || current.task_kind || "bonus",
          nextDate || null,
          verificationMode ?? current.verification_mode ?? "manual",
          verificationRulesJson !== void 0 ? verificationRulesJson : current.verification_rules_json,
          allowVideoProof ?? Number(current.allow_video_proof || 0),
          autoApproveEnabled ?? Number(current.auto_approve_enabled || 0),
          maxDailyAutoAwards !== void 0 ? maxDailyAutoAwards : current.max_daily_auto_awards,
          now,
          templateId,
          user.familyId
        ).run();
        if (assignedChildIds) {
          await env2.DB.prepare(`DELETE FROM task_template_children WHERE template_id=?`).bind(templateId).run();
          for (const cId of assignedChildIds) {
            await env2.DB.prepare(
              `INSERT OR IGNORE INTO task_template_children (template_id, child_id)
               SELECT ?, id FROM children WHERE id=? AND family_id=?`
            ).bind(templateId, cId, user.familyId).run();
          }
          await env2.DB.prepare(
            `UPDATE task_instances
             SET status = 'cancelled', updated_at = ?
             WHERE template_id = ? AND family_id = ?
               AND status IN ('open','rejected')
               AND child_id NOT IN (
                 SELECT child_id FROM task_template_children WHERE template_id = ?
               )`
          ).bind(now, templateId, user.familyId, templateId).run();
        }
        await ensureDailyTaskInstances(env2.DB, user.familyId);
        return json({ success: true, message: "\u05EA\u05D1\u05E0\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" });
      }
      if (pathname.match(/^\/api\/parent\/tasks\/templates\/[^/]+$/) && method === "DELETE") {
        const templateId = pathname.split("/")[5];
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.batch([
          env2.DB.prepare(
            `UPDATE task_templates
             SET archived_at = ?, is_active = 0, updated_at = ?
             WHERE id = ? AND family_id = ?`
          ).bind(now, now, templateId, user.familyId),
          env2.DB.prepare(
            `UPDATE task_instances
             SET status = 'cancelled', updated_at = ?
             WHERE template_id = ? AND family_id = ?
               AND status IN ('open','rejected')`
          ).bind(now, templateId, user.familyId)
        ]);
        return json({ success: true, message: "\u05EA\u05D1\u05E0\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D5\u05E2\u05D1\u05E8\u05D4 \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF" });
      }
      if (pathname === "/api/parent/history" && method === "GET") {
        const childId = url.searchParams.get("childId");
        const type = url.searchParams.get("type");
        const limit = Number(url.searchParams.get("limit")) || 50;
        let query = `SELECT mt.*, c.name as child_name, c.color as child_color 
                     FROM minute_transactions mt
                     JOIN children c ON c.id = mt.child_id
                     WHERE mt.family_id = ?`;
        const params = [user.familyId];
        if (childId) {
          query += ` AND mt.child_id = ?`;
          params.push(childId);
        }
        if (type) {
          query += ` AND mt.type = ?`;
          params.push(type);
        }
        query += ` ORDER BY mt.created_at DESC LIMIT ?`;
        params.push(limit);
        const { results: transactions } = await env2.DB.prepare(query).bind(...params).all();
        return json({ transactions });
      }
      if (pathname.match(/^\/api\/parent\/children\/[^/]+\/details$/) && method === "GET") {
        const childId = pathname.split("/")[4];
        const todayIsrael = getIsraelDateString();
        const child = await env2.DB.prepare(
          `SELECT c.*, cp.level, cp.xp, cp.current_streak_days, cp.best_streak_days, cp.last_active_date
           FROM children c
           LEFT JOIN child_progress cp ON cp.child_id = c.id
           WHERE c.id = ? AND c.family_id = ?`
        ).bind(childId, user.familyId).first();
        if (!child) {
          return errorJson("\u05D4\u05D9\u05DC\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0", 404);
        }
        const wallet = await getChildWalletSummary(env2.DB, childId);
        const rank = getRankDetails(child.xp || 0);
        const { results: transactions } = await env2.DB.prepare(
          `SELECT * FROM minute_transactions 
           WHERE child_id = ? AND family_id = ?
           ORDER BY created_at DESC LIMIT 60`
        ).bind(childId, user.familyId).all();
        const { results: tasks } = await env2.DB.prepare(
          `SELECT ti.*, ts.status as submission_status, ts.note as submission_note, ts.photo_object_key
           FROM task_instances ti
           LEFT JOIN task_templates tt ON tt.id = ti.template_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.child_id = ? AND (
             ti.due_date = ?
             OR ti.status = 'submitted'
             OR (tt.schedule_type = 'repeatable' AND ti.status IN ('open','rejected'))
           )
           ORDER BY 
             CASE ti.status 
               WHEN 'submitted' THEN 1 
               WHEN 'open' THEN 2 
               WHEN 'approved' THEN 3 
               ELSE 4 
             END, 
             ti.reward_minutes DESC`
        ).bind(childId, todayIsrael).all();
        const { results: screenRequests } = await env2.DB.prepare(
          `SELECT * FROM screen_time_requests
           WHERE child_id = ? AND family_id = ?
           ORDER BY requested_at DESC LIMIT 20`
        ).bind(childId, user.familyId).all();
        return json({
          child: {
            ...child,
            rankTitle: rank.rankTitle,
            progressPercent: rank.progressPercent
          },
          wallet,
          transactions: transactions || [],
          tasks: tasks || [],
          screenRequests: screenRequests || []
        });
      }
      if (pathname === "/api/parent/stats" && method === "GET") {
        const { results: children } = await env2.DB.prepare(
          `SELECT id, name FROM children WHERE family_id = ?`
        ).bind(user.familyId).all();
        const statsList = [];
        for (const c of children) {
          const stats = await getChildWalletSummary(env2.DB, c.id);
          statsList.push({ childId: c.id, childName: c.name, ...stats });
        }
        return json({ stats: statsList });
      }
      if (pathname === "/api/parent/settings" && method === "GET") {
        const settings = await env2.DB.prepare(`SELECT * FROM family_settings WHERE family_id = ?`).bind(user.familyId).first();
        return json({ settings });
      }
      if (pathname === "/api/parent/settings" && method === "PUT") {
        const body = await request.json().catch(() => ({}));
        const warningDebt = Number(body.warning_debt_threshold) || -60;
        const soundEnabled = body.sound_enabled ? 1 : 0;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `UPDATE family_settings 
           SET warning_debt_threshold = ?, sound_enabled = ?, updated_at = ?
           WHERE family_id = ?`
        ).bind(warningDebt, soundEnabled, now, user.familyId).run();
        return json({ success: true, message: "\u05D4\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" });
      }
      if (pathname === "/api/parent/children" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const name = body.name?.trim();
        const pin = String(body.pin || "");
        const color = body.color || "#4facfe";
        const avatar = body.avatar || "wand";
        if (!name) return errorJson("\u05E9\u05DD \u05D4\u05D9\u05DC\u05D3 \u05E0\u05D3\u05E8\u05E9", 400);
        if (pin.length < 4) return errorJson("\u05E7\u05D5\u05D3 \u05D4\u05D9\u05DC\u05D3 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 4 \u05E1\u05E4\u05E8\u05D5\u05EA", 400);
        let pepper;
        try {
          pepper = requireActivePepper(env2);
        } catch {
          return errorJson("\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA", 503);
        }
        const childId = generateId();
        const salt = generateSalt(16);
        const pinHash = await hashPin(pin, salt, pepper);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `INSERT INTO children (id, family_id, name, pin_hash, pin_salt, avatar, color, available_minutes, debt_limit_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 30, 60, ?, ?)`
        ).bind(childId, user.familyId, name, pinHash, salt, avatar, color, now, now).run();
        await env2.DB.prepare(
          `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
           VALUES (?, ?, 1, 0, 1, 1, ?, ?)`
        ).bind(childId, user.familyId, getIsraelDateString(), now).run();
        await env2.DB.prepare(
          `INSERT INTO minute_transactions (id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at)
           VALUES (?, ?, ?, 'earn', 30, 30, '\u05D1\u05E8\u05D5\u05DA \u05D4\u05D1\u05D0 \u05DC\u05D0\u05E7\u05D3\u05DE\u05D9\u05D9\u05EA \u05D4\u05D6\u05DE\u05DF!', 'parent', ?)`
        ).bind(generateId(), user.familyId, childId, now).run();
        return json({ success: true, message: "\u05D4\u05D9\u05DC\u05D3 \u05E0\u05D5\u05E1\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05DC\u05DE\u05E9\u05E4\u05D7\u05D4", childId });
      }
      if (pathname.match(/^\/api\/parent\/children\/[^/]+$/) && method === "PUT") {
        const childId = pathname.split("/")[4];
        const body = await request.json().catch(() => ({}));
        const name = body.name?.trim();
        const color = body.color;
        const avatar = body.avatar;
        const pin = body.pin !== void 0 && body.pin !== null ? String(body.pin) : "";
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (pin) {
          if (pin.length < 4) return errorJson("\u05E7\u05D5\u05D3 \u05D4\u05D9\u05DC\u05D3 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 4 \u05E1\u05E4\u05E8\u05D5\u05EA", 400);
          let pepper;
          try {
            pepper = requireActivePepper(env2);
          } catch {
            return errorJson("\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA", 503);
          }
          const salt = generateSalt(16);
          const pinHash = await hashPin(pin, salt, pepper);
          await env2.DB.prepare(`UPDATE children SET pin_hash = ?, pin_salt = ? WHERE id = ? AND family_id = ?`).bind(pinHash, salt, childId, user.familyId).run();
        }
        await env2.DB.prepare(
          `UPDATE children 
           SET name = COALESCE(?, name),
               color = COALESCE(?, color),
               avatar = COALESCE(?, avatar),
               updated_at = ?
           WHERE id = ? AND family_id = ?`
        ).bind(name, color, avatar, now, childId, user.familyId).run();
        return json({ success: true, message: "\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D9\u05DC\u05D3 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" });
      }
      return errorJson("\u05E0\u05EA\u05D9\u05D1 API \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0", 404);
    }
    return env2.ASSETS.fetch(request);
  },
  // --- 6. CRON TRIGGERS ---
  // Every minute: close expired screen-time sessions in the cloud and push a
  // notification even if the child's phone/app is sleeping.
  // Daily 03:00 UTC: keep the existing recurring-task generation.
  async scheduled(event, env2, ctx) {
    const expiredSessions = await finalizeExpiredScreenSessions(env2.DB);
    for (const session of expiredSessions) {
      await sendNotification(env2.DB, env2, {
        familyId: session.familyId,
        recipientRole: "child",
        recipientChildId: session.childId,
        type: "screen_time_up",
        title: "\u05D4\u05D6\u05DE\u05DF \u05E0\u05D2\u05DE\u05E8 \u23F0",
        message: "\u05D6\u05DE\u05DF \u05D4\u05DE\u05E1\u05DA \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D7\u05D6\u05D5\u05E8 \u05DC\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05D9\u05EA\u05E8\u05D4 \u05D4\u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05EA.",
        entityType: "screen_session",
        entityId: session.id
      });
    }
    const scheduledAt = new Date(event.scheduledTime);
    if (scheduledAt.getUTCHours() === 3 && scheduledAt.getUTCMinutes() === 0) {
      const familyId = env2.DEFAULT_FAMILY_ID || "yaniv_family";
      await ensureDailyTaskInstancesOnce(env2.DB, familyId);
    }
  }
};

// src/evidence-retention.ts
var DEFAULT_EVIDENCE_RETENTION_DAYS = 14;
function safeDays(raw, fallback = DEFAULT_EVIDENCE_RETENTION_DAYS) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? Math.floor(parsed) : fallback;
}
__name(safeDays, "safeDays");
function retentionDaysFor(env2, mediaKind) {
  if (mediaKind === "video") return safeDays(env2.EVIDENCE_VIDEO_RETENTION_DAYS, DEFAULT_EVIDENCE_RETENTION_DAYS);
  return safeDays(env2.EVIDENCE_IMAGE_RETENTION_DAYS, DEFAULT_EVIDENCE_RETENTION_DAYS);
}
__name(retentionDaysFor, "retentionDaysFor");
function addDaysIso(days, from = /* @__PURE__ */ new Date()) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1e3).toISOString();
}
__name(addDaysIso, "addDaysIso");
async function resolveEvidenceRetention(db, submissionId, days = DEFAULT_EVIDENCE_RETENTION_DAYS) {
  const now = /* @__PURE__ */ new Date();
  const expiresAt = addDaysIso(days, now);
  const nowIso = now.toISOString();
  await db.batch([
    db.prepare(`UPDATE task_submissions SET retention_hold = 0, retention_resolved_at = ?, evidence_expires_at = ? WHERE id = ?`).bind(nowIso, expiresAt, submissionId),
    db.prepare(`UPDATE submission_evidence_assets SET expires_at = ? WHERE submission_id = ? AND deleted_at IS NULL`).bind(expiresAt, submissionId)
  ]);
  return { expiresAt };
}
__name(resolveEvidenceRetention, "resolveEvidenceRetention");

// src/haprofessor-verifier.ts
function parseExamUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return { courseId: null, examId: null, wrongProvider: false };
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (host !== "online.haprofessor.com") {
      return { courseId: null, examId: null, wrongProvider: true };
    }
    const match = url.pathname.match(/^\/exams\/(\d+)\/(\d+)\/summary\/?$/i);
    if (!match) return { courseId: null, examId: null, wrongProvider: false };
    return { courseId: match[1], examId: match[2], wrongProvider: false };
  } catch {
    return { courseId: null, examId: null, wrongProvider: false };
  }
}
__name(parseExamUrl, "parseExamUrl");
function parseResultText(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  const match = text.match(/ענית\s+נכון\s+על\s+(\d+)\s+שאל(?:ה|ות)\s+מתוך\s+(\d+)\s+שאל(?:ה|ות)/);
  if (!match) return null;
  return { correct: Number(match[1]), total: Number(match[2]) };
}
__name(parseResultText, "parseResultText");
function parseSuccessRate(raw) {
  const text = String(raw || "").replace(/,/g, ".");
  const match = text.match(/שיעור\s+הצלחה\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}
__name(parseSuccessRate, "parseSuccessRate");
function isHaprofessorRules(rules) {
  const value = rules;
  return Boolean(
    value && value.activityType === "haprofessor_exam_result" && value.provider === "haprofessor" && value.rewardPolicy === "correct_answers"
  );
}
__name(isHaprofessorRules, "isHaprofessorRules");
function shouldUseHaprofessorVerifier(rules, task) {
  if (isHaprofessorRules(rules)) return true;
  const value = rules;
  if (!value || value.activityType !== "educational_result_screenshot") return false;
  const context2 = [task?.title, task?.description, typeof value.instructions === "string" ? value.instructions : ""].filter(Boolean).join(" ");
  return /(?:haprofessor|הפרופסור|פרופסור)/i.test(context2);
}
__name(shouldUseHaprofessorVerifier, "shouldUseHaprofessorVerifier");
function evaluateHaprofessorExtraction(raw) {
  const riskFlags = [];
  const checks = [];
  let confidence = 0;
  const parsedUrl = parseExamUrl(raw?.visibleUrl || "");
  if (parsedUrl.wrongProvider) {
    riskFlags.push("wrong_provider");
    checks.push({ id: "correct_activity", result: "fail", reason: "The visible URL is not online.haprofessor.com." });
  } else if (parsedUrl.examId && parsedUrl.courseId) {
    confidence += 30;
    checks.push({ id: "correct_activity", result: "pass", reason: "Haprofessor summary URL is visible." });
    checks.push({ id: "exam_id_readable", result: "pass", reason: `Exam ID ${parsedUrl.examId} is readable from the URL.` });
  } else {
    checks.push({ id: "correct_activity", result: "unknown", reason: "Haprofessor summary URL is not fully readable." });
    checks.push({ id: "exam_id_readable", result: "unknown", reason: "Exam ID cannot be read reliably from the URL." });
  }
  const headingVisible = String(raw?.completionHeading || "").includes("\u05E1\u05D9\u05D9\u05DE\u05EA\u05DD \u05D0\u05EA \u05D4\u05DE\u05D1\u05D7\u05DF");
  if (headingVisible) {
    confidence += 20;
    checks.push({ id: "completion_visible", result: "pass", reason: "Completed-exam heading is visible." });
  } else {
    checks.push({ id: "completion_visible", result: "unknown", reason: "Completed-exam heading is not clearly readable." });
  }
  const parsedResult = parseResultText(raw?.resultText || "");
  let correct = null;
  let total = null;
  if (parsedResult) {
    const fieldsMatch = Number.isInteger(raw?.correctAnswers) && Number.isInteger(raw?.totalQuestions) && raw.correctAnswers === parsedResult.correct && raw.totalQuestions === parsedResult.total;
    const rangeValid = parsedResult.total > 0 && parsedResult.correct >= 0 && parsedResult.correct <= parsedResult.total;
    if (!fieldsMatch) riskFlags.push("result_field_mismatch");
    if (!rangeValid) riskFlags.push("invalid_result_range");
    if (fieldsMatch && rangeValid) {
      correct = parsedResult.correct;
      total = parsedResult.total;
      confidence += 30;
      checks.push({ id: "result_readable", result: "pass", reason: `Explicit result is ${correct}/${total}.` });
    } else {
      checks.push({ id: "result_readable", result: "fail", reason: "Explicit result text conflicts with extracted numeric fields or has an invalid range." });
    }
  } else {
    checks.push({ id: "result_readable", result: "unknown", reason: "The explicit \u201CX out of Y\u201D result line is not readable." });
  }
  const parsedPercent = parseSuccessRate(raw?.successRateText || "");
  let displayedPercentage = null;
  if (parsedPercent != null && Number.isFinite(raw?.displayedPercentage)) {
    displayedPercentage = parsedPercent;
    if (Math.abs(parsedPercent - Number(raw.displayedPercentage)) > 0.01) {
      riskFlags.push("percentage_field_mismatch");
    }
  } else if (parsedPercent != null) {
    displayedPercentage = parsedPercent;
  }
  if (correct != null && total != null && displayedPercentage != null) {
    const expected = correct / total * 100;
    if (Math.abs(displayedPercentage - expected) <= 1 && !riskFlags.includes("percentage_field_mismatch")) {
      confidence += 15;
      checks.push({ id: "score_consistent", result: "pass", reason: `Displayed ${displayedPercentage}% is consistent with ${correct}/${total}.` });
    } else {
      riskFlags.push("percentage_mismatch");
      checks.push({ id: "score_consistent", result: "fail", reason: `Displayed percentage is inconsistent with ${correct}/${total}.` });
    }
  } else {
    checks.push({ id: "score_consistent", result: "unknown", reason: "Percentage consistency cannot be verified." });
  }
  const rows = Array.isArray(raw?.subjectBreakdown) ? raw.subjectBreakdown : [];
  let rowDataValid = true;
  let sumCorrect = 0;
  let sumTotal = 0;
  for (const row of rows) {
    if (!Number.isInteger(row?.correct) || !Number.isInteger(row?.total) || row.total < 0 || row.correct < 0 || row.correct > row.total) {
      rowDataValid = false;
      break;
    }
    sumCorrect += row.correct;
    sumTotal += row.total;
  }
  if (!rowDataValid) {
    riskFlags.push("invalid_subject_breakdown");
  } else if (rows.length && total != null && sumTotal === total) {
    if (sumCorrect === correct) {
      confidence += 5;
    } else {
      riskFlags.push("subject_breakdown_mismatch");
    }
  } else if (total != null && sumTotal > total) {
    riskFlags.push("subject_breakdown_mismatch");
  }
  const screenUiVisible = Boolean(parsedUrl.examId && headingVisible);
  checks.push({
    id: "screen_ui_visible",
    result: screenUiVisible ? "pass" : "unknown",
    reason: screenUiVisible ? "Browser result UI and summary context are visible." : "Result UI context is incomplete."
  });
  let decision = "needs_review";
  if (parsedUrl.wrongProvider) decision = "not_verified";
  else if (confidence >= 95 && riskFlags.length === 0 && correct != null && total != null && parsedUrl.examId) decision = "verified";
  const minutesToAward = decision === "verified" && correct != null ? correct : 0;
  const observed = correct != null && total != null ? `\u05D4\u05E4\u05E8\u05D5\u05E4\u05E1\u05D5\u05E8: ${correct}/${total}${parsedUrl.examId ? ` \xB7 \u05DE\u05D1\u05D7\u05DF ${parsedUrl.examId}` : ""}` : "\u05EA\u05D5\u05E6\u05D0\u05EA \u05DE\u05D1\u05D7\u05DF \u05D4\u05E4\u05E8\u05D5\u05E4\u05E1\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05E7\u05E8\u05D0\u05D4 \u05D1\u05DE\u05DC\u05D5\u05D0\u05D4.";
  const reason = decision === "verified" ? `\u05D0\u05D5\u05DE\u05EA \u05DE\u05E1\u05DA \u05E1\u05D9\u05D5\u05DD \u05E9\u05DC \u05D4\u05E4\u05E8\u05D5\u05E4\u05E1\u05D5\u05E8; \u05D4\u05D6\u05D9\u05DB\u05D5\u05D9 \u05D4\u05D5\u05D0 ${minutesToAward} \u05D3\u05E7\u05D5\u05EA \u05DC\u05E4\u05D9 \u05DE\u05E1\u05E4\u05E8 \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D4\u05E0\u05DB\u05D5\u05E0\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3.` : parsedUrl.wrongProvider ? "\u05D4\u05E6\u05D9\u05DC\u05D5\u05DD \u05DE\u05E6\u05D9\u05D2 \u05E1\u05E4\u05E7 \u05D0\u05D7\u05E8 \u05D5\u05D0\u05D9\u05E0\u05D5 \u05DE\u05E1\u05DA \u05E1\u05D9\u05DB\u05D5\u05DD \u05E9\u05DC \u05D4\u05E4\u05E8\u05D5\u05E4\u05E1\u05D5\u05E8." : "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D0\u05DE\u05EA \u05D1\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05D0\u05EA \u05DB\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05E1\u05D9\u05D5\u05DD; \u05E0\u05D3\u05E8\u05E9\u05EA \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D5\u05E8\u05D4.";
  return {
    decision,
    checks,
    observed,
    suspicious: riskFlags.length > 0,
    riskFlags: [...new Set(riskFlags)],
    reason,
    confidence,
    courseId: parsedUrl.courseId,
    examId: parsedUrl.examId,
    correctAnswers: correct,
    totalQuestions: total,
    displayedPercentage,
    minutesToAward
  };
}
__name(evaluateHaprofessorExtraction, "evaluateHaprofessorExtraction");

// src/ai-verification.ts
var AI_PROMPT_VERSION = "proof-v2-haprofessor";
var AI_POLICY_VERSION = "proof-policy-v2-haprofessor";
var AI_FETCH_TIMEOUT_MS = 12e3;
var STALE_PENDING_AI_MS = 2 * 60 * 1e3;
var RECOVERY_CLAIM_TTL_MS = 2 * 60 * 1e3;
var MAX_RECOVERY_ATTEMPTS = 3;
var RECOVERY_BATCH_SIZE = 5;
var HAPROFESSOR_REQUIRED_CHECKS = [
  "correct_activity",
  "completion_visible",
  "result_readable",
  "screen_ui_visible",
  "exam_id_readable",
  "score_consistent"
];
var HAPROFESSOR_SCHEMA = {
  name: "timeplus_haprofessor_exam_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      visibleUrl: { type: "string" },
      completionHeading: { type: "string" },
      resultText: { type: "string" },
      successRateText: { type: "string" },
      correctAnswers: { type: "integer" },
      totalQuestions: { type: "integer" },
      displayedPercentage: { type: "number" },
      subjectBreakdown: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            correct: { type: "integer" },
            total: { type: "integer" }
          },
          required: ["name", "correct", "total"]
        }
      }
    },
    required: [
      "visibleUrl",
      "completionHeading",
      "resultText",
      "successRateText",
      "correctAnswers",
      "totalQuestions",
      "displayedPercentage",
      "subjectBreakdown"
    ]
  }
};
var GENERIC_SCHEMA = {
  name: "timeplus_evidence_verification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      decision: { type: "string", enum: ["verified", "needs_review", "not_verified"] },
      checks: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            result: { type: "string", enum: ["pass", "fail", "unknown"] },
            reason: { type: "string" }
          },
          required: ["id", "result", "reason"]
        }
      },
      observed: { type: "string" },
      suspicious: { type: "boolean" },
      riskFlags: { type: "array", items: { type: "string" }, maxItems: 12 },
      reason: { type: "string" },
      approvalConfidence: { type: "number", minimum: 0, maximum: 100 }
    },
    required: ["decision", "checks", "observed", "suspicious", "riskFlags", "reason", "approvalConfidence"]
  }
};
function safeJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
__name(safeJson, "safeJson");
async function fetchAiWithTimeout(run) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("ai_fetch_timeout"), AI_FETCH_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
__name(fetchAiWithTimeout, "fetchAiWithTimeout");
function bytesToBase64(buffer) {
  const b = new Uint8Array(buffer);
  let s = "";
  for (let i = 0; i < b.length; i += 32768) {
    s += String.fromCharCode(...b.subarray(i, Math.min(i + 32768, b.length)));
  }
  return btoa(s);
}
__name(bytesToBase64, "bytesToBase64");
async function readEvidenceObject(env2, key) {
  if (env2.EVIDENCE) {
    const o = await env2.EVIDENCE.get(key);
    return o ? o.arrayBuffer() : null;
  }
  return env2.EVIDENCE_KV ? env2.EVIDENCE_KV.get(key, "arrayBuffer") : null;
}
__name(readEvidenceObject, "readEvidenceObject");
function normalizedContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => typeof p?.text === "string" ? p.text : "").join("");
  }
  return "";
}
__name(normalizedContent, "normalizedContent");
function validateResult(v) {
  if (!v || !["verified", "needs_review", "not_verified"].includes(v.decision) || !Array.isArray(v.checks) || !v.checks.length) return null;
  const rawApprovalConfidence = Number(v.approvalConfidence);
  if (!Number.isFinite(rawApprovalConfidence)) return null;
  const approvalConfidence = Math.round(Math.max(0, Math.min(100, rawApprovalConfidence)));
  const checks = [];
  for (const c of v.checks) {
    if (!c || typeof c.id !== "string" || !["pass", "fail", "unknown"].includes(c.result)) return null;
    checks.push({ id: c.id.slice(0, 80), result: c.result, reason: String(c.reason || "").slice(0, 300) });
  }
  return {
    decision: v.decision,
    checks,
    observed: String(v.observed || "").slice(0, 700),
    suspicious: v.suspicious === true,
    riskFlags: Array.isArray(v.riskFlags) ? v.riskFlags.map((x) => String(x).slice(0, 120)).slice(0, 12) : [],
    reason: String(v.reason || "").slice(0, 700),
    approvalConfidence
  };
}
__name(validateResult, "validateResult");
function requiredChecksFromRules(r) {
  const vals = Array.isArray(r?.requiredChecks) ? r.requiredChecks.map(String).filter(Boolean).slice(0, 12) : [];
  return vals.length ? vals : ["correct_activity", "completion_visible", "result_readable"];
}
__name(requiredChecksFromRules, "requiredChecksFromRules");
function deterministicEligibility(args) {
  const blockers = [];
  const byId = new Map(args.result.checks.map((c) => [c.id, c.result]));
  for (const id of args.requiredChecks) if (byId.get(id) !== "pass") blockers.push(`check:${id}`);
  if (args.result.decision !== "verified") blockers.push("ai_decision");
  if (args.result.suspicious) blockers.push("suspicious");
  if (args.result.riskFlags.length) blockers.push("risk_flags");
  if (args.duplicateDetected) blockers.push("duplicate");
  if (!args.autoApproveEnabled) blockers.push("template_auto_approve_disabled");
  if (String(args.mediaKind || "") !== "screenshot") blockers.push("media_not_gallery_screenshot");
  if (!["educational_result_screenshot", "haprofessor_exam_result"].includes(String(args.rules?.activityType || ""))) {
    blockers.push("activity_type_not_auto_eligible");
  }
  if (args.rules?.requireScreenUi !== true) blockers.push("screen_ui_rule_required");
  if (byId.get("screen_ui_visible") !== "pass") blockers.push("screen_ui_not_verified");
  return { eligible: blockers.length === 0, blockers };
}
__name(deterministicEligibility, "deterministicEligibility");
async function recordAttempt(env2, submissionId, v) {
  await env2.DB.prepare(
    `INSERT INTO ai_verification_attempts (id, submission_id, route, provider, model, status, latency_ms, result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    generateId(),
    submissionId,
    v.route,
    v.provider,
    v.model,
    v.status,
    v.latencyMs,
    JSON.stringify(v.result ?? {}),
    (/* @__PURE__ */ new Date()).toISOString()
  ).run();
}
__name(recordAttempt, "recordAttempt");
async function updateManualFallback(env2, submissionId, status, summary, extra = {}) {
  await env2.DB.prepare(
    `UPDATE task_submissions
     SET verification_status=?, verification_summary=?, review_mode='parent', verification_policy_version=?,
         verification_prompt_version=?, verification_risk_flags_json=?, ai_shadow_decision=?,
         auto_approval_eligible=0, ai_verified_at=?
     WHERE id=?`
  ).bind(
    status,
    summary,
    AI_POLICY_VERSION,
    AI_PROMPT_VERSION,
    JSON.stringify(extra.riskFlags || []),
    String(extra.decision || "needs_review"),
    (/* @__PURE__ */ new Date()).toISOString(),
    submissionId
  ).run();
}
__name(updateManualFallback, "updateManualFallback");
async function claimHaprofessorExam(env2, sub, evaluation, minutesToAward) {
  if (!evaluation.examId) return "duplicate";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `INSERT OR IGNORE INTO external_reward_claims
       (provider, child_id, external_reference_id, family_id, submission_id, task_instance_id, minutes_awarded, created_at)
     VALUES ('haprofessor', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sub.child_id,
    evaluation.examId,
    sub.family_id,
    sub.id,
    sub.task_instance_id,
    minutesToAward,
    now
  ).run();
  const owner = await env2.DB.prepare(
    `SELECT submission_id FROM external_reward_claims
     WHERE provider='haprofessor' AND child_id=? AND external_reference_id=?`
  ).bind(sub.child_id, evaluation.examId).first();
  return owner?.submission_id === sub.id ? "claimed" : "duplicate";
}
__name(claimHaprofessorExam, "claimHaprofessorExam");
async function releaseHaprofessorClaim(env2, sub, evaluation) {
  if (!evaluation.examId) return;
  await env2.DB.prepare(
    `DELETE FROM external_reward_claims
     WHERE provider='haprofessor' AND child_id=? AND external_reference_id=? AND submission_id=?`
  ).bind(sub.child_id, evaluation.examId, sub.id).run();
}
__name(releaseHaprofessorClaim, "releaseHaprofessorClaim");
async function verifyEvidenceSubmission(env2, submissionId) {
  const startedAt = Date.now();
  const sub = await env2.DB.prepare(
    `SELECT ts.id, ts.task_instance_id, ts.child_id, ti.family_id, ti.template_id,
            ti.title AS task_title, ti.description AS task_description, ti.status AS task_status,
            ti.reward_minutes, ti.task_kind, ti.verification_mode, ti.verification_rules_json,
            ti.auto_approve_enabled, ti.max_daily_auto_awards, ts.media_kind, ts.media_source
     FROM task_submissions ts
     JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.id=?`
  ).bind(submissionId).first();
  if (!sub || sub.task_status !== "submitted") return;
  if (String(env2.AI_EVIDENCE_ENABLED || "true") !== "true" || sub.verification_mode !== "ai_media") {
    await updateManualFallback(env2, submissionId, "needs_parent_review", "\u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D5\u05E8\u05D4. \u05D0\u05D9\u05DE\u05D5\u05EA AI \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D5\u05E4\u05E2\u05DC \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D6\u05D5.");
    return;
  }
  const directEnabled = String(env2.AI_DIRECT_OPENROUTER_FALLBACK || "true") === "true" && Boolean(env2.OPENROUTER_API_KEY);
  if ((!env2.FREE_ROUTER || !env2.TIMEPLUS_ROUTER_TOKEN) && !directEnabled) {
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  const { results: assets } = await env2.DB.prepare(
    `SELECT id,kind,object_key,mime_type,duplicate_of_asset_id
     FROM submission_evidence_assets
     WHERE submission_id=? AND deleted_at IS NULL
     ORDER BY CASE kind WHEN 'normalized' THEN 1 WHEN 'contact_sheet' THEN 2 WHEN 'keyframe' THEN 3 ELSE 4 END, created_at ASC`
  ).bind(submissionId).all();
  const duplicateDetected = (assets || []).some((a) => Boolean(a.duplicate_of_asset_id));
  const visual = (assets || []).filter(
    (a) => String(a.mime_type || "").startsWith("image/") && (sub.media_kind === "video" ? ["contact_sheet", "keyframe"].includes(a.kind) : ["normalized", "original"].includes(a.kind))
  ).slice(0, 4);
  const imageParts = [];
  for (const a of visual) {
    const bytes = await readEvidenceObject(env2, a.object_key);
    if (bytes) imageParts.push({ type: "image_url", image_url: { url: `data:${a.mime_type};base64,${bytesToBase64(bytes)}` } });
  }
  if (!imageParts.length) {
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4 \u05DC\u05D0\u05D9\u05DE\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  const rules = safeJson(sub.verification_rules_json, {});
  const haprofessorMode = shouldUseHaprofessorVerifier(rules, { title: sub.task_title, description: sub.task_description });
  const required = haprofessorMode ? HAPROFESSOR_REQUIRED_CHECKS : requiredChecksFromRules(rules);
  const prompt = haprofessorMode ? [
    "Extract visible facts from a completed exam summary screenshot from online.haprofessor.com.",
    "Do not decide whether to award anything and do not calculate reward minutes.",
    "Transcribe the browser address-bar URL exactly when readable. Never invent or complete missing digits.",
    "The target page normally contains the Hebrew heading \u201C\u05E1\u05D9\u05D9\u05DE\u05EA\u05DD \u05D0\u05EA \u05D4\u05DE\u05D1\u05D7\u05DF!\u201D, an explicit line \u201C\u05E2\u05E0\u05D9\u05EA \u05E0\u05DB\u05D5\u05DF \u05E2\u05DC X \u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05EA\u05D5\u05DA Y \u05E9\u05D0\u05DC\u05D5\u05EA\u201D, and \u201C\u05E9\u05D9\u05E2\u05D5\u05E8 \u05D4\u05E6\u05DC\u05D7\u05D4 Z%\u201D.",
    "correctAnswers and totalQuestions MUST come only from the explicit X-out-of-Y result line. Never derive them from the percentage, progress bar, visible question cards, or topic breakdown.",
    "If any required text or number is unreadable, use an empty string for its text and -1 for its numeric field. Do not guess.",
    "For subjectBreakdown, include only topic rows whose correct/total values are fully readable. It is valid to return an empty or partial array.",
    "Educational passages and questions may legitimately repeat in different exams. Do not mark repeated content as a duplicate. The server handles duplicates using the exam ID in the URL.",
    "Do not identify the child or infer any sensitive personal trait.",
    "Return only the requested extraction object."
  ].join("\n") : [
    "You verify visual proof that a child completed a task. Inspect only the supplied media.",
    "Do not identify the child or infer identity, health, ethnicity, religion, location, or any sensitive trait.",
    `Task: ${sub.task_title}`,
    sub.task_description ? `Task description: ${sub.task_description}` : "",
    `Verification rules: ${JSON.stringify(rules)}`,
    `Required checks: ${required.join(", ")}`,
    "Be conservative. If the requested activity is unclear, completion is not visible, text is unreadable, the image is partial/manipulated, or evidence is ambiguous, use needs_review/not_verified and unknown/fail checks.",
    "approvalConfidence is a 0-100 confidence that the evidence satisfies all required checks and would merit parent approval. This is advisory only in Shadow mode; lower it for ambiguity, unreadable details, conflicting evidence, or risk flags.",
    rules?.requireScreenUi === true ? "For screen_ui_visible, pass only when the evidence clearly shows a software/app result screen or interface, not merely a camera photo of the physical world." : "",
    "Return only the requested structured object. Do not decide reward minutes."
  ].filter(Boolean).join("\n");
  const payload = {
    model: "auto",
    temperature: 0,
    max_tokens: haprofessorMode ? 1200 : 900,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageParts] }],
    response_format: { type: "json_schema", json_schema: haprofessorMode ? HAPROFESSOR_SCHEMA : GENERIC_SCHEMA }
  };
  let response = null;
  let route = "free_router";
  const freeRouter = env2.FREE_ROUTER;
  const timeplusRouterToken = env2.TIMEPLUS_ROUTER_TOKEN;
  if (freeRouter && timeplusRouterToken) {
    try {
      response = await fetchAiWithTimeout((signal) => freeRouter.fetch("https://free-router.internal/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-timeplus-service-token": timeplusRouterToken,
          "x-free-router-session": `timeplus-proof-${submissionId}`
        },
        body: JSON.stringify(payload),
        signal
      }));
    } catch (error3) {
      await recordAttempt(env2, submissionId, {
        route: "free_router",
        provider: null,
        model: null,
        status: "network_error",
        latencyMs: Date.now() - startedAt,
        result: { error: String(error3) }
      });
    }
  }
  const freeRouterModelHint = response?.headers.get("x-free-router-route-model") || response?.headers.get("x-free-router-model") || "";
  const freeRouterWrongModel = Boolean(response?.ok && /(?:content[-_ ]?safety|safety)/i.test(freeRouterModelHint));
  if ((!response || !response.ok || freeRouterWrongModel) && directEnabled) {
    if (response) {
      const body = await response.clone().text().catch(() => "");
      await recordAttempt(env2, submissionId, {
        route: "free_router",
        provider: response.headers.get("x-free-router-provider"),
        model: response.headers.get("x-free-router-route-model"),
        status: freeRouterWrongModel ? "invalid_model_for_vision" : `http_${response.status}`,
        latencyMs: Date.now() - startedAt,
        result: { status: response.status, body: body.slice(0, 1e3) }
      });
    }
    route = "openrouter_direct";
    try {
      response = await fetchAiWithTimeout((signal) => fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env2.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://timeplus-app.pages.dev",
          "X-Title": "Time+ evidence verification"
        },
        body: JSON.stringify({ ...payload, model: "openrouter/free" }),
        signal
      }));
    } catch (error3) {
      await recordAttempt(env2, submissionId, {
        route,
        provider: "openrouter",
        model: "openrouter/free",
        status: "network_error",
        latencyMs: Date.now() - startedAt,
        result: { error: String(error3) }
      });
      response = null;
    }
  }
  if (!response) {
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05DC\u05D0 \u05D4\u05D9\u05D4 \u05D6\u05DE\u05D9\u05DF; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  let provider = route === "openrouter_direct" ? "openrouter" : response.headers.get("x-free-router-provider");
  let routeModel = route === "openrouter_direct" ? "openrouter/free" : response.headers.get("x-free-router-route-model");
  let canonical = route === "openrouter_direct" ? "openrouter/free" : response.headers.get("x-free-router-model");
  let rawText = await response.text();
  if (!response.ok) {
    await recordAttempt(env2, submissionId, {
      route,
      provider,
      model: routeModel || canonical,
      status: `http_${response.status}`,
      latencyMs: Date.now() - startedAt,
      result: { status: response.status, body: rawText.slice(0, 1e3) }
    });
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DB\u05E8\u05D2\u05E2 \u05DE\u05D5\u05D3\u05DC Vision \u05D7\u05D9\u05E0\u05DE\u05D9 \u05DE\u05EA\u05D0\u05D9\u05DD; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
  }
  let content = normalizedContent(parsed?.choices?.[0]?.message?.content);
  let rr = null;
  try {
    rr = JSON.parse(content);
  } catch {
  }
  if ((!rr || typeof rr !== "object") && route === "free_router" && directEnabled) {
    await recordAttempt(env2, submissionId, { route, provider, model: routeModel || canonical, status: "invalid_structured_output", latencyMs: Date.now() - startedAt, result: { content: content.slice(0, 1e3) } });
    route = "openrouter_direct";
    try {
      response = await fetchAiWithTimeout((signal) => fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env2.OPENROUTER_API_KEY}`, "HTTP-Referer": "https://timeplus-app.pages.dev", "X-Title": "Time+ evidence verification" }, body: JSON.stringify({ ...payload, model: "openrouter/free" }), signal }));
    } catch (error3) {
      await recordAttempt(env2, submissionId, { route, provider: "openrouter", model: "openrouter/free", status: "network_error", latencyMs: Date.now() - startedAt, result: { error: String(error3) } });
      response = null;
    }
    if (!response) {
      await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05DC\u05D0 \u05D4\u05D9\u05D4 \u05D6\u05DE\u05D9\u05DF; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
      return;
    }
    provider = "openrouter";
    routeModel = "openrouter/free";
    canonical = "openrouter/free";
    rawText = await response.text();
    if (!response.ok) {
      await recordAttempt(env2, submissionId, { route, provider, model: routeModel, status: `http_${response.status}`, latencyMs: Date.now() - startedAt, result: { status: response.status, body: rawText.slice(0, 1e3) } });
      await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DB\u05E8\u05D2\u05E2 \u05DE\u05D5\u05D3\u05DC Vision \u05D7\u05D9\u05E0\u05DE\u05D9 \u05DE\u05EA\u05D0\u05D9\u05DD; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
      return;
    }
    parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
    }
    content = normalizedContent(parsed?.choices?.[0]?.message?.content);
    rr = null;
    try {
      rr = JSON.parse(content);
    } catch {
    }
  }
  if (!rr || typeof rr !== "object") {
    await recordAttempt(env2, submissionId, { route, provider, model: routeModel || canonical, status: "invalid_structured_output", latencyMs: Date.now() - startedAt, result: { content: content.slice(0, 1e3) } });
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05EA\u05D5\u05E6\u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05DC\u05D0 \u05D4\u05D9\u05D9\u05EA\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  let haprofessorEvaluation = null;
  let result = null;
  if (haprofessorMode) {
    haprofessorEvaluation = evaluateHaprofessorExtraction(rr);
    result = { ...haprofessorEvaluation, approvalConfidence: haprofessorEvaluation.confidence };
    await env2.DB.prepare(
      `UPDATE task_submissions
       SET evidence_provider='haprofessor', external_reference_id=?, detected_course_id=?,
           detected_correct_answers=?, detected_total_questions=?, detected_success_percent=?, deterministic_confidence=?
       WHERE id=?`
    ).bind(
      haprofessorEvaluation.examId,
      haprofessorEvaluation.courseId,
      haprofessorEvaluation.correctAnswers,
      haprofessorEvaluation.totalQuestions,
      haprofessorEvaluation.displayedPercentage,
      haprofessorEvaluation.confidence,
      submissionId
    ).run();
  } else {
    result = validateResult(rr);
  }
  if (!result) {
    await recordAttempt(env2, submissionId, {
      route,
      provider,
      model: routeModel || canonical,
      status: "invalid_structured_output",
      latencyMs: Date.now() - startedAt,
      result: { content: content.slice(0, 1e3) }
    });
    await updateManualFallback(env2, submissionId, "ai_unavailable", "\u05EA\u05D5\u05E6\u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05DC\u05D0 \u05D4\u05D9\u05D9\u05EA\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.");
    return;
  }
  const eligibility = deterministicEligibility({
    result,
    requiredChecks: required,
    duplicateDetected,
    mediaKind: sub.media_kind,
    rules,
    autoApproveEnabled: Number(sub.auto_approve_enabled || 0) === 1
  });
  let capAllowed = true;
  const cap = Number(sub.max_daily_auto_awards || 0);
  if (cap > 0 && sub.template_id) {
    const today = getIsraelDateString();
    const row = await env2.DB.prepare(
      `SELECT COUNT(*) AS c
       FROM task_submissions ts
       JOIN task_instances ti ON ti.id=ts.task_instance_id
       WHERE ti.child_id=? AND ti.template_id=? AND ti.due_date=? AND ts.review_mode='automatic' AND ts.status='approved'`
    ).bind(sub.child_id, sub.template_id, today).first();
    capAllowed = Number(row?.c || 0) < cap;
    if (!capAllowed) eligibility.blockers.push("daily_auto_award_cap");
  }
  const autoEligible = eligibility.eligible && capAllowed;
  const mode = String(env2.AI_EVIDENCE_MODE || "shadow").toLowerCase();
  const professorAutoEnabled = haprofessorMode && String(env2.HAPROFESSOR_AUTO_APPROVE_ENABLED || "false") === "true";
  const automaticMode = mode === "auto" && (!haprofessorMode || professorAutoEnabled);
  await recordAttempt(env2, submissionId, {
    route,
    provider,
    model: routeModel || canonical,
    status: "success",
    latencyMs: Date.now() - startedAt,
    result: { ...result, requiredChecks: required, autoEligible, blockers: eligibility.blockers, canonical }
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const summary = `${result.observed || result.reason}${eligibility.blockers.length ? ` \xB7 \u05E0\u05D3\u05E8\u05E9 \u05D4\u05D5\u05E8\u05D4: ${eligibility.blockers.join(", ")}` : ""}`.slice(0, 1e3);
  await env2.DB.prepare(
    `UPDATE task_submissions
     SET verification_status=?, verification_route=?, verification_provider=?, verification_model=?,
         verification_summary=?, verification_checks_json=?, verification_policy_version=?, verification_prompt_version=?,
         verification_risk_flags_json=?, ai_shadow_decision=?, auto_approval_eligible=?, ai_verified_at=?
     WHERE id=?`
  ).bind(
    result.decision === "not_verified" ? "rejected_by_ai" : "needs_parent_review",
    route,
    provider,
    routeModel || canonical,
    summary,
    JSON.stringify(result.checks),
    AI_POLICY_VERSION,
    AI_PROMPT_VERSION,
    JSON.stringify(result.riskFlags),
    result.decision,
    autoEligible ? 1 : 0,
    now,
    submissionId
  ).run();
  if (!automaticMode || !autoEligible) return;
  const minutesToAward = haprofessorEvaluation?.minutesToAward;
  if (haprofessorEvaluation) {
    const claim = await claimHaprofessorExam(env2, sub, haprofessorEvaluation, minutesToAward ?? 0);
    if (claim === "duplicate") {
      await updateManualFallback(
        env2,
        submissionId,
        "needs_parent_review",
        `\u05D4\u05DE\u05D1\u05D7\u05DF ${haprofessorEvaluation.examId || ""} \u05DB\u05D1\u05E8 \u05D6\u05D9\u05DB\u05D4 \u05D1\u05D3\u05E7\u05D5\u05EA \u05D1\u05E2\u05D1\u05E8; \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05D6\u05D9\u05DB\u05D5\u05D9 \u05E0\u05D5\u05E1\u05E3 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA.`,
        { riskFlags: ["duplicate_exam_id"], decision: "needs_review" }
      );
      return;
    }
  }
  const approved = await approveTask(env2.DB, sub.task_instance_id, sub.family_id, minutesToAward, "system");
  if (!approved.success) {
    const cur = await env2.DB.prepare(
      `SELECT status FROM task_instances WHERE id=? AND family_id=?`
    ).bind(sub.task_instance_id, sub.family_id).first();
    if (cur?.status === "approved") return;
    if (haprofessorEvaluation) await releaseHaprofessorClaim(env2, sub, haprofessorEvaluation);
    await updateManualFallback(
      env2,
      submissionId,
      "needs_parent_review",
      `AI \u05D0\u05D9\u05DE\u05EA \u05D0\u05EA \u05D4\u05E8\u05D0\u05D9\u05D4, \u05D0\u05DA \u05D4\u05D6\u05D9\u05DB\u05D5\u05D9 \u05D4\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05DC\u05D0 \u05D4\u05D5\u05E9\u05DC\u05DD: ${approved.error || "\u05E0\u05D3\u05E8\u05E9\u05EA \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D5\u05E8\u05D4"}`,
      { riskFlags: ["auto_approval_failed"], decision: "verified" }
    );
    return;
  }
  await env2.DB.prepare(
    `UPDATE task_submissions
     SET verification_status='verified', review_mode='automatic', status='approved', reviewed_at=?, verification_summary=?
     WHERE id=?`
  ).bind(now, `${result.observed || "\u05D4\u05E8\u05D0\u05D9\u05D4 \u05D0\u05D5\u05DE\u05EA\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA."} \xB7 \u05D0\u05D5\u05E9\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05E4\u05D9 \u05DB\u05DC\u05DC\u05D9 Time+`, submissionId).run();
  await env2.DB.prepare(
    `UPDATE minute_transactions SET evidence_submission_id=?
     WHERE id=(SELECT id FROM minute_transactions WHERE task_instance_id=? AND child_id=? AND evidence_submission_id IS NULL ORDER BY created_at DESC LIMIT 1)`
  ).bind(submissionId, sub.task_instance_id, sub.child_id).run();
  await resolveEvidenceRetention(env2.DB, submissionId);
  await env2.DB.prepare(
    `INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
     VALUES (?,?,'system','ai_verifier','evidence_auto_approved','task_submission',?,?,?)`
  ).bind(
    generateId(),
    sub.family_id,
    submissionId,
    JSON.stringify({
      provider,
      model: routeModel || canonical,
      policyVersion: AI_POLICY_VERSION,
      promptVersion: AI_PROMPT_VERSION,
      minutesAwarded: approved.minutesAwarded,
      xpAwarded: approved.xpAwarded,
      externalReferenceId: haprofessorEvaluation?.examId || null
    }),
    now
  ).run();
  await sendNotification(env2.DB, env2, {
    familyId: sub.family_id,
    recipientRole: "child",
    recipientChildId: sub.child_id,
    type: "task_approved",
    title: (approved.minutesAwarded || 0) > 0 ? `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! +${approved.minutesAwarded} \u05D3\u05E7'` : "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u2B50",
    message: `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${sub.task_title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05D0\u05D7\u05E8 \u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3.`,
    entityType: "task_instance",
    entityId: sub.task_instance_id,
    skipDbInsert: true
  });
}
__name(verifyEvidenceSubmission, "verifyEvidenceSubmission");
async function recoverStalePendingAiEvidence(env2) {
  const staleBefore = new Date(Date.now() - STALE_PENDING_AI_MS).toISOString();
  const recentClaimAfter = new Date(Date.now() - RECOVERY_CLAIM_TTL_MS).toISOString();
  const { results } = await env2.DB.prepare(
    `SELECT ts.id,
            (SELECT COUNT(*) FROM ai_verification_attempts aa
             WHERE aa.submission_id = ts.id AND aa.status = 'recovery_claimed') AS recovery_attempts
     FROM task_submissions ts
     JOIN task_instances ti ON ti.id = ts.task_instance_id
     WHERE ts.verification_status = 'pending_ai'
       AND ti.status = 'submitted'
       AND ts.submitted_at <= ?
       AND NOT EXISTS (
         SELECT 1 FROM ai_verification_attempts recent
         WHERE recent.submission_id = ts.id
           AND recent.status = 'recovery_claimed'
           AND recent.created_at > ?
       )
     ORDER BY ts.submitted_at ASC
     LIMIT ?`
  ).bind(staleBefore, recentClaimAfter, RECOVERY_BATCH_SIZE).all();
  let retried = 0;
  let recovered = 0;
  let exhausted = 0;
  let failed = 0;
  for (const row of results || []) {
    const priorAttempts = Number(row.recovery_attempts || 0);
    if (priorAttempts >= MAX_RECOVERY_ATTEMPTS) {
      await updateManualFallback(
        env2,
        row.id,
        "ai_unavailable",
        "\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4-AI \u05DC\u05D0 \u05D4\u05D5\u05E9\u05DC\u05DD \u05DC\u05D0\u05D7\u05E8 \u05DE\u05E1\u05E4\u05E8 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.",
        { decision: "needs_review", riskFlags: ["ai_retry_exhausted"] }
      );
      exhausted++;
      continue;
    }
    await recordAttempt(env2, row.id, {
      route: "cron_recovery",
      provider: null,
      model: null,
      status: "recovery_claimed",
      latencyMs: 0,
      result: { attempt: priorAttempts + 1, staleBefore }
    });
    retried++;
    try {
      await verifyEvidenceSubmission(env2, row.id);
      const current = await env2.DB.prepare(
        `SELECT verification_status FROM task_submissions WHERE id = ?`
      ).bind(row.id).first();
      if (current?.verification_status !== "pending_ai") recovered++;
    } catch (error3) {
      failed++;
      await recordAttempt(env2, row.id, {
        route: "cron_recovery",
        provider: null,
        model: null,
        status: "recovery_error",
        latencyMs: 0,
        result: { error: String(error3), attempt: priorAttempts + 1 }
      });
      if (priorAttempts + 1 >= MAX_RECOVERY_ATTEMPTS) {
        await updateManualFallback(
          env2,
          row.id,
          "ai_unavailable",
          "\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4-AI \u05E0\u05DB\u05E9\u05DC \u05E9\u05D5\u05D1 \u05D5\u05E9\u05D5\u05D1; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.",
          { decision: "needs_review", riskFlags: ["ai_retry_exhausted"] }
        );
        exhausted++;
      }
    }
  }
  return { retried, recovered, exhausted, failed };
}
__name(recoverStalePendingAiEvidence, "recoverStalePendingAiEvidence");

// src/evidence.ts
var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
var MAX_VIDEO_BYTES = 25 * 1024 * 1024;
var MEDIA_KINDS = /* @__PURE__ */ new Set(["image", "screenshot", "video"]);
var MEDIA_SOURCES = /* @__PURE__ */ new Set(["camera_capture", "gallery_upload", "unknown"]);
var ASSET_KINDS = /* @__PURE__ */ new Set(["original", "normalized", "contact_sheet", "keyframe"]);
var IMAGE_MIME_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var VIDEO_MIME_TYPES = /* @__PURE__ */ new Set(["video/mp4", "video/webm", "video/quicktime"]);
function json2(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}
__name(json2, "json");
function errorJson2(message, status = 400) {
  return json2({ success: false, error: message }, status);
}
__name(errorJson2, "errorJson");
function normalizeMediaKind(value) {
  const candidate = String(value || "");
  return MEDIA_KINDS.has(candidate) ? candidate : null;
}
__name(normalizeMediaKind, "normalizeMediaKind");
function normalizeMediaSource(value) {
  const candidate = String(value || "");
  return MEDIA_SOURCES.has(candidate) ? candidate : "unknown";
}
__name(normalizeMediaSource, "normalizeMediaSource");
function normalizeAssetKind(value) {
  const candidate = String(value || "");
  return ASSET_KINDS.has(candidate) ? candidate : null;
}
__name(normalizeAssetKind, "normalizeAssetKind");
function objectExtension(contentType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  return "bin";
}
__name(objectExtension, "objectExtension");
function looksLikeDeclaredMime(bytes, contentType) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (contentType === "video/webm") {
    return bytes.length >= 4 && bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163;
  }
  if (contentType === "video/mp4" || contentType === "video/quicktime") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  }
  return false;
}
__name(looksLikeDeclaredMime, "looksLikeDeclaredMime");
async function sha256Hex(buffer) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function hasEvidenceStorage(env2) {
  return Boolean(env2.EVIDENCE || env2.EVIDENCE_KV);
}
__name(hasEvidenceStorage, "hasEvidenceStorage");
async function putEvidenceObject(env2, key, body, contentType, expiresAt, metadata) {
  if (env2.EVIDENCE) {
    await env2.EVIDENCE.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: metadata
    });
    return;
  }
  if (env2.EVIDENCE_KV) {
    await env2.EVIDENCE_KV.put(key, body, { metadata: { contentType, expiresAt, ...metadata } });
    return;
  }
  throw new Error("Evidence storage is not configured");
}
__name(putEvidenceObject, "putEvidenceObject");
async function getEvidenceObject(env2, key) {
  if (env2.EVIDENCE) {
    const object = await env2.EVIDENCE.get(key);
    return object?.body || null;
  }
  if (env2.EVIDENCE_KV) {
    return env2.EVIDENCE_KV.get(key, "arrayBuffer");
  }
  return null;
}
__name(getEvidenceObject, "getEvidenceObject");
async function deleteEvidenceObject(env2, key) {
  if (env2.EVIDENCE) {
    await env2.EVIDENCE.delete(key);
    return;
  }
  if (env2.EVIDENCE_KV) {
    await env2.EVIDENCE_KV.delete(key);
  }
}
__name(deleteEvidenceObject, "deleteEvidenceObject");
async function getSubmissionForUser(db, submissionId, user) {
  return db.prepare(
    `SELECT ts.*, ti.family_id, ti.template_id, ti.title AS task_title, ti.status AS task_status,
              ti.reward_minutes, ti.task_kind, ti.verification_mode, ti.verification_rules_json, ti.auto_approve_enabled, ti.max_daily_auto_awards, c.name AS child_name
       FROM task_submissions ts
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       JOIN children c ON c.id = ts.child_id
       WHERE ts.id = ? AND ti.family_id = ?`
  ).bind(submissionId, user.familyId).first();
}
__name(getSubmissionForUser, "getSubmissionForUser");
async function createEvidenceSubmission(request, env2, user) {
  if (user.role !== "child") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
  if (!hasEvidenceStorage(env2)) return errorJson2("\u05D0\u05D7\u05E1\u05D5\u05DF \u05D4\u05E8\u05D0\u05D9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DE\u05D5\u05E4\u05E2\u05DC \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA", 503);
  const body = await request.json().catch(() => ({}));
  const taskInstanceId = String(body.taskInstanceId || "");
  const mediaKind = normalizeMediaKind(body.mediaKind);
  const mediaSource = normalizeMediaSource(body.mediaSource);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1e3) || null : null;
  if (!taskInstanceId || !mediaKind) return errorJson2("\u05D7\u05E1\u05E8\u05D9\u05DD \u05E4\u05E8\u05D8\u05D9 \u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5 \u05E1\u05D5\u05D2 \u05DE\u05D3\u05D9\u05D4", 400);
  const task = await env2.DB.prepare(
    `SELECT id, family_id, child_id, title, status, allow_video_proof, verification_mode
       FROM task_instances WHERE id = ? AND child_id = ? AND family_id = ?`
  ).bind(taskInstanceId, user.id, user.familyId).first();
  if (!task) return errorJson2("\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  if (task.status !== "open" && task.status !== "rejected") {
    return errorJson2("\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E6\u05E8\u05E3 \u05E8\u05D0\u05D9\u05D4 \u05DC\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D4\u05D5\u05D2\u05E9\u05D4 \u05D0\u05D5 \u05D0\u05D5\u05E9\u05E8\u05D4", 409);
  }
  if (mediaKind === "video" && Number(task.allow_video_proof || 0) !== 1) {
    return errorJson2("\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D6\u05D5 \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DE\u05D0\u05E4\u05E9\u05E8\u05EA \u05D4\u05D5\u05DB\u05D7\u05EA \u05D5\u05D9\u05D3\u05D0\u05D5", 400);
  }
  const submissionId = generateId();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = addDaysIso(retentionDaysFor(env2, mediaKind));
  await env2.DB.prepare(
    `INSERT INTO task_submissions (
        id, task_instance_id, child_id, note, photo_object_key, status, submitted_at,
        verification_status, review_mode, media_kind, media_source, evidence_expires_at, retention_hold
      ) VALUES (?, ?, ?, ?, NULL, 'pending', ?, 'uploading', 'parent', ?, ?, ?, 0)`
  ).bind(submissionId, taskInstanceId, user.id, note, now, mediaKind, mediaSource, expiresAt).run();
  await env2.DB.prepare(
    `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, 'child', ?, 'evidence_started', 'task_submission', ?, ?, ?)`
  ).bind(
    generateId(),
    user.familyId,
    user.id,
    submissionId,
    JSON.stringify({ taskInstanceId, mediaKind, mediaSource }),
    now
  ).run();
  return json2({
    success: true,
    submissionId,
    mediaKind,
    mediaSource,
    evidenceExpiresAt: expiresAt,
    limits: {
      maxImageBytes: MAX_IMAGE_BYTES,
      maxVideoBytes: MAX_VIDEO_BYTES,
      maxVideoSeconds: 30
    }
  });
}
__name(createEvidenceSubmission, "createEvidenceSubmission");
async function uploadEvidenceAsset(request, env2, user, submissionId, rawAssetKind) {
  if (user.role !== "child") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
  if (!hasEvidenceStorage(env2)) return errorJson2("\u05D0\u05D7\u05E1\u05D5\u05DF \u05D4\u05E8\u05D0\u05D9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DE\u05D5\u05E4\u05E2\u05DC \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA", 503);
  const assetKind = normalizeAssetKind(rawAssetKind);
  if (!assetKind) return errorJson2("\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05E8\u05D0\u05D9\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05D9\u05DF", 400);
  const submission = await getSubmissionForUser(env2.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  if (submission.verification_status !== "uploading") return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4", 409);
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const isImage = IMAGE_MIME_TYPES.has(contentType);
  const isVideo = VIDEO_MIME_TYPES.has(contentType);
  if (!isImage && !isVideo) return errorJson2("\u05E1\u05D5\u05D2 \u05D4\u05E7\u05D5\u05D1\u05E5 \u05D0\u05D9\u05E0\u05D5 \u05E0\u05EA\u05DE\u05DA", 415);
  if (assetKind !== "original" && !isImage) {
    return errorJson2("\u05E7\u05D5\u05D1\u05E5 \u05DE\u05E2\u05D5\u05D1\u05D3 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4", 415);
  }
  if (submission.media_kind !== "video" && isVideo) return errorJson2("\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DE\u05E6\u05E4\u05D4 \u05DC\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D5\u05DC\u05D0 \u05DC\u05D5\u05D5\u05D9\u05D3\u05D0\u05D5", 415);
  if (submission.media_kind === "video" && assetKind === "original" && !isVideo) {
    return errorJson2("\u05E7\u05D5\u05D1\u05E5 \u05D4\u05D5\u05D5\u05D9\u05D3\u05D0\u05D5 \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9 \u05D0\u05D9\u05E0\u05D5 \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 \u05E0\u05EA\u05DE\u05DA", 415);
  }
  const body = await request.arrayBuffer();
  const bytes = new Uint8Array(body);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (bytes.byteLength <= 0) return errorJson2("\u05D4\u05E7\u05D5\u05D1\u05E5 \u05E8\u05D9\u05E7", 400);
  if (bytes.byteLength > maxBytes) {
    return errorJson2(isVideo ? "\u05D4\u05D5\u05D5\u05D9\u05D3\u05D0\u05D5 \u05D2\u05D3\u05D5\u05DC \u05DE-25MB" : "\u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D2\u05D3\u05D5\u05DC\u05D4 \u05DE-8MB", 413);
  }
  if (!looksLikeDeclaredMime(bytes, contentType)) return errorJson2("\u05EA\u05D5\u05DB\u05DF \u05D4\u05E7\u05D5\u05D1\u05E5 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05D5\u05D0\u05DD \u05DC\u05E1\u05D5\u05D2 \u05E9\u05D3\u05D5\u05D5\u05D7", 415);
  const hash = await sha256Hex(body);
  const duplicate = await env2.DB.prepare(
    `SELECT sea.id
       FROM submission_evidence_assets sea
       JOIN task_submissions prior_ts ON prior_ts.id = sea.submission_id
       WHERE prior_ts.child_id = ?
         AND sea.sha256 = ?
         AND sea.deleted_at IS NULL
         AND sea.submission_id <> ?
       ORDER BY sea.created_at DESC LIMIT 1`
  ).bind(user.id, hash, submissionId).first();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const yyyyMm = now.slice(0, 7);
  const assetId = generateId();
  const ext = objectExtension(contentType);
  const objectKey = `evidence/${user.familyId}/${user.id}/${yyyyMm}/${submissionId}/${assetKind}-${assetId}.${ext}`;
  const expiresAt = addDaysIso(retentionDaysFor(env2, isVideo ? "video" : submission.media_kind));
  await putEvidenceObject(env2, objectKey, body, contentType, expiresAt, {
    familyId: user.familyId,
    childId: user.id,
    submissionId,
    assetKind,
    sha256: hash
  });
  try {
    await env2.DB.prepare(
      `INSERT INTO submission_evidence_assets (
          id, submission_id, kind, object_key, mime_type, byte_size, sha256,
          duplicate_of_asset_id, created_at, expires_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    ).bind(
      assetId,
      submissionId,
      assetKind,
      objectKey,
      contentType,
      bytes.byteLength,
      hash,
      duplicate?.id || null,
      now,
      expiresAt
    ).run();
    const priorAfterInsert = await env2.DB.prepare(
      `SELECT sea.id FROM submission_evidence_assets sea
       JOIN task_submissions prior_ts ON prior_ts.id = sea.submission_id
       WHERE prior_ts.child_id = ? AND sea.sha256 = ? AND sea.id <> ? AND sea.deleted_at IS NULL
         AND (sea.created_at < ? OR (sea.created_at = ? AND sea.id < ?))
       ORDER BY sea.created_at ASC, sea.id ASC LIMIT 1`
    ).bind(user.id, hash, assetId, now, now, assetId).first();
    if (priorAfterInsert && !duplicate) {
      await env2.DB.prepare(`UPDATE submission_evidence_assets SET duplicate_of_asset_id = ? WHERE id = ?`).bind(priorAfterInsert.id, assetId).run();
    }
    if (assetKind === "normalized" || assetKind === "original") {
      await env2.DB.prepare(`UPDATE task_submissions SET media_sha256 = ? WHERE id = ?`).bind(hash, submissionId).run();
    }
  } catch (err) {
    await deleteEvidenceObject(env2, objectKey).catch(() => void 0);
    throw err;
  }
  return json2({
    success: true,
    asset: {
      id: assetId,
      kind: assetKind,
      mimeType: contentType,
      byteSize: bytes.byteLength,
      sha256: hash,
      duplicate: Boolean(duplicate),
      expiresAt
    }
  });
}
__name(uploadEvidenceAsset, "uploadEvidenceAsset");
async function completeEvidenceSubmission(env2, user, ctx, submissionId) {
  if (user.role !== "child") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
  const submission = await getSubmissionForUser(env2.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  if (["pending_ai", "needs_parent_review", "ai_unavailable", "rejected_by_ai", "verified"].includes(String(submission.verification_status || ""))) {
    return json2({ success: true, status: submission.verification_status, submissionId, idempotent: true });
  }
  if (submission.verification_status !== "uploading") return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DB\u05D1\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4", 409);
  const { results: assets } = await env2.DB.prepare(
    `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, expires_at
       FROM submission_evidence_assets
       WHERE submission_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`
  ).bind(submissionId).all();
  const hasRequiredEvidence = submission.media_kind === "video" ? assets.some((asset) => asset.kind === "original") : assets.some((asset) => asset.kind === "normalized" || asset.kind === "original");
  if (!hasRequiredEvidence) return errorJson2("\u05DC\u05D0 \u05D4\u05D5\u05E2\u05DC\u05EA\u05D4 \u05E8\u05D0\u05D9\u05D4 \u05EA\u05E7\u05D9\u05E0\u05D4", 400);
  const duplicateDetected = assets.some((asset) => Boolean(asset.duplicate_of_asset_id));
  const aiEligible = submission.verification_mode === "ai_media" && String(env2.AI_EVIDENCE_ENABLED || "true") === "true";
  const nextStatus = duplicateDetected ? "needs_parent_review" : aiEligible ? "pending_ai" : "needs_parent_review";
  const summary = duplicateDetected ? "\u05D6\u05D5\u05D4\u05EA\u05D4 \u05E8\u05D0\u05D9\u05D4 \u05D6\u05D4\u05D4 \u05DC\u05E8\u05D0\u05D9\u05D4 \u05E7\u05D5\u05D3\u05DE\u05EA; \u05E0\u05D3\u05E8\u05E9\u05EA \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D5\u05E8\u05D4." : aiEligible ? "\u05D4\u05E8\u05D0\u05D9\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D4 \u05D5\u05E0\u05E9\u05DC\u05D7\u05D4 \u05DC\u05D0\u05D9\u05DE\u05D5\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9." : "\u05D4\u05E8\u05D0\u05D9\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D4 \u05D5\u05DE\u05DE\u05EA\u05D9\u05E0\u05D4 \u05DC\u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D5\u05E8\u05D4.";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const operationId = generateId();
  const transitionResults = await env2.DB.batch([
    env2.DB.prepare(
      `UPDATE task_instances
       SET status = 'submitted', submitted_at = ?, submission_operation_id = ?, updated_at = ?
       WHERE id = ? AND child_id = ? AND family_id = ? AND (status = 'open' OR status = 'rejected')`
    ).bind(now, operationId, now, submission.task_instance_id, user.id, user.familyId),
    env2.DB.prepare(
      `UPDATE task_submissions
       SET verification_status = ?, verification_route = ?, verification_summary = ?,
           review_mode = 'parent', retention_hold = 1
       WHERE id = ? AND verification_status = 'uploading'
         AND EXISTS (
           SELECT 1 FROM task_instances ti
           WHERE ti.id = ? AND ti.child_id = ? AND ti.family_id = ?
             AND ti.status = 'submitted' AND ti.submission_operation_id = ?
         )`
    ).bind(
      nextStatus,
      aiEligible && !duplicateDetected ? "free_router" : "none",
      summary,
      submissionId,
      submission.task_instance_id,
      user.id,
      user.familyId,
      operationId
    )
  ]);
  if (Number(transitionResults[0]?.meta?.changes || 0) === 0 || Number(transitionResults[1]?.meta?.changes || 0) === 0) {
    return errorJson2("\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DB\u05D1\u05E8 \u05E0\u05DE\u05E6\u05D0\u05EA \u05D1\u05D8\u05D9\u05E4\u05D5\u05DC", 409);
  }
  if (aiEligible && !duplicateDetected) {
    ctx.waitUntil(verifyEvidenceSubmission(env2, submissionId).catch(async (err) => {
      console.error("Evidence AI verification failed", err);
      await env2.DB.prepare(
        `UPDATE task_submissions
         SET verification_status='ai_unavailable', review_mode='parent',
             verification_summary='\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05DC\u05D0 \u05D4\u05D9\u05D4 \u05D6\u05DE\u05D9\u05DF; \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.'
         WHERE id=? AND verification_status='pending_ai'`
      ).bind(submissionId).run().catch(() => void 0);
    }));
  }
  await env2.DB.prepare(
    `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, 'child', ?, 'evidence_completed', 'task_submission', ?, ?, ?)`
  ).bind(
    generateId(),
    user.familyId,
    user.id,
    submissionId,
    JSON.stringify({
      taskInstanceId: submission.task_instance_id,
      mediaKind: submission.media_kind,
      mediaSource: submission.media_source,
      assetCount: assets.length,
      duplicateDetected,
      operationId
    }),
    now
  ).run();
  ctx.waitUntil(
    sendNotification(env2.DB, env2, {
      familyId: user.familyId,
      recipientRole: "parent",
      type: "evidence_submitted",
      title: "\u05EA\u05D9\u05E2\u05D5\u05D3 \u05D1\u05D9\u05E6\u05D5\u05E2 \u05D7\u05D3\u05E9 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4",
      message: `${submission.child_name || "\u05D4\u05D9\u05DC\u05D3/\u05D4"} \u05E9\u05DC\u05D7/\u05D4 \u05EA\u05D9\u05E2\u05D5\u05D3 \u05E2\u05D1\u05D5\u05E8 "${submission.task_title}"`,
      entityType: "task_submission",
      entityId: submissionId
    }).catch((err) => console.error("Evidence parent notification failed:", err))
  );
  return json2({
    success: true,
    submissionId,
    status: nextStatus,
    duplicateDetected,
    message: aiEligible && !duplicateDetected ? "\u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05D5\u05E0\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05DE\u05D5\u05EA" : "\u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05E9\u05DE\u05E8 \u05D5\u05E0\u05E9\u05DC\u05D7 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4"
  });
}
__name(completeEvidenceSubmission, "completeEvidenceSubmission");
async function getChildEvidence(env2, user, submissionId) {
  if (user.role !== "child") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05D9\u05DC\u05D3 \u05D1\u05DC\u05D1\u05D3", 403);
  const submission = await getSubmissionForUser(env2.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  const { results: assets } = await env2.DB.prepare(
    `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, created_at, expires_at, deleted_at
       FROM submission_evidence_assets WHERE submission_id = ? ORDER BY created_at ASC`
  ).bind(submissionId).all();
  return json2({ submission, assets });
}
__name(getChildEvidence, "getChildEvidence");
async function listParentEvidence(env2, user, url) {
  if (user.role !== "parent") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DE\u05D5\u05E8\u05E9\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3", 403);
  const requestedStatus = url.searchParams.get("status");
  const allowedStatuses = /* @__PURE__ */ new Set(["uploading", "pending_ai", "needs_parent_review", "verified", "rejected_by_ai", "ai_unavailable"]);
  const status = requestedStatus && allowedStatuses.has(requestedStatus) ? requestedStatus : null;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 40)));
  let sql = `SELECT ts.id, ts.task_instance_id, ts.child_id, ts.note, ts.status,
                    ts.submitted_at, ts.reviewed_at, ts.verification_status, ts.verification_summary,
                    ts.review_mode, ts.media_kind, ts.media_source, ts.media_sha256,
                    ts.evidence_expires_at, ts.retention_hold, ts.verification_route, ts.verification_provider, ts.verification_model, ts.verification_checks_json, ts.verification_policy_version, ts.verification_prompt_version, ts.verification_risk_flags_json, ts.ai_shadow_decision, ts.auto_approval_eligible, ts.ai_verified_at,
                    (SELECT ava.result_json FROM ai_verification_attempts ava
                     WHERE ava.submission_id = ts.id AND ava.status = 'success'
                     ORDER BY ava.created_at DESC LIMIT 1) AS latest_ai_result_json,
                    ti.title AS task_title, ti.reward_minutes, ti.task_kind, ti.status AS task_status,
                    c.name AS child_name, c.color AS child_color, c.avatar AS child_avatar,
                    (SELECT sea.id FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id AND sea.deleted_at IS NULL
                       AND sea.kind IN ('normalized','contact_sheet','keyframe','original')
                     ORDER BY CASE sea.kind WHEN 'normalized' THEN 1 WHEN 'contact_sheet' THEN 2 WHEN 'keyframe' THEN 3 ELSE 4 END,
                              sea.created_at ASC LIMIT 1) AS preview_asset_id,
                    (SELECT COUNT(*) FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id AND sea.deleted_at IS NULL) AS active_asset_count,
                    (SELECT MAX(CASE WHEN sea.duplicate_of_asset_id IS NOT NULL THEN 1 ELSE 0 END)
                     FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id) AS duplicate_detected
             FROM task_submissions ts
             JOIN task_instances ti ON ti.id = ts.task_instance_id
             JOIN children c ON c.id = ts.child_id
             WHERE ti.family_id = ? AND ts.media_kind IS NOT NULL`;
  const bindings = [user.familyId];
  if (status) {
    sql += ` AND ts.verification_status = ?`;
    bindings.push(status);
  }
  sql += ` ORDER BY ts.submitted_at DESC LIMIT ?`;
  bindings.push(limit);
  const { results: submissions } = await env2.DB.prepare(sql).bind(...bindings).all();
  const storage = await env2.DB.prepare(
    `SELECT COALESCE(SUM(sea.byte_size), 0) AS active_bytes
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       WHERE ti.family_id = ? AND sea.deleted_at IS NULL`
  ).bind(user.familyId).first();
  return json2({
    submissions: submissions || [],
    storage: {
      activeBytes: Number(storage?.active_bytes || 0),
      backend: env2.EVIDENCE ? "r2" : "kv",
      warningAtBytes: env2.EVIDENCE ? 7 * 1024 * 1024 * 1024 : 750 * 1024 * 1024,
      videoRetentionReductionAtBytes: env2.EVIDENCE ? 8 * 1024 * 1024 * 1024 : 850 * 1024 * 1024,
      videoStopAtBytes: env2.EVIDENCE ? 9 * 1024 * 1024 * 1024 : 950 * 1024 * 1024
    }
  });
}
__name(listParentEvidence, "listParentEvidence");
async function getParentEvidenceDetail(env2, user, submissionId) {
  if (user.role !== "parent") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DE\u05D5\u05E8\u05E9\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3", 403);
  const submission = await getSubmissionForUser(env2.DB, submissionId, user);
  if (!submission) return errorJson2("\u05D4\u05D4\u05D2\u05E9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  const { results: assets } = await env2.DB.prepare(
    `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, created_at, expires_at, deleted_at
       FROM submission_evidence_assets WHERE submission_id = ? ORDER BY created_at ASC`
  ).bind(submissionId).all();
  const { results: verificationAttempts } = await env2.DB.prepare(
    `SELECT id, route, provider, model, status, latency_ms, result_json, created_at
       FROM ai_verification_attempts WHERE submission_id = ? ORDER BY created_at DESC`
  ).bind(submissionId).all();
  const { results: audit2 } = await env2.DB.prepare(
    `SELECT action, actor_type, actor_id, metadata_json, created_at
       FROM audit_log WHERE entity_type = 'task_submission' AND entity_id = ? ORDER BY created_at ASC`
  ).bind(submissionId).all();
  return json2({ submission, assets, verificationAttempts, audit: audit2 });
}
__name(getParentEvidenceDetail, "getParentEvidenceDetail");
async function streamParentEvidenceAsset(env2, user, submissionId, assetId) {
  if (user.role !== "parent") return errorJson2("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DE\u05D5\u05E8\u05E9\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3", 403);
  if (!hasEvidenceStorage(env2)) return errorJson2("\u05D0\u05D7\u05E1\u05D5\u05DF \u05D4\u05E8\u05D0\u05D9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DE\u05D5\u05E4\u05E2\u05DC \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA", 503);
  const asset = await env2.DB.prepare(
    `SELECT sea.object_key, sea.mime_type, sea.deleted_at
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       WHERE sea.id = ? AND sea.submission_id = ? AND ti.family_id = ?`
  ).bind(assetId, submissionId, user.familyId).first();
  if (!asset || asset.deleted_at) return errorJson2("\u05D4\u05DE\u05D3\u05D9\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05E2\u05D5\u05D3", 404);
  const objectBody = await getEvidenceObject(env2, asset.object_key);
  if (!objectBody) return errorJson2("\u05D4\u05DE\u05D3\u05D9\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05E2\u05D5\u05D3", 404);
  return new Response(objectBody, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
__name(streamParentEvidenceAsset, "streamParentEvidenceAsset");
async function cleanupExpiredEvidence(env2) {
  if (!hasEvidenceStorage(env2)) return { deleted: 0 };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { results: expired } = await env2.DB.prepare(
    `SELECT sea.id, sea.object_key
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       WHERE sea.deleted_at IS NULL
         AND sea.expires_at IS NOT NULL
         AND sea.expires_at <= ?
         AND COALESCE(ts.retention_hold, 0) = 0
       ORDER BY sea.expires_at ASC LIMIT 200`
  ).bind(now).all();
  let deleted = 0;
  for (const asset of expired || []) {
    try {
      await deleteEvidenceObject(env2, asset.object_key);
      await env2.DB.prepare(`UPDATE submission_evidence_assets SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`).bind(now, asset.id).run();
      deleted++;
    } catch (err) {
      console.error("Evidence cleanup failed for", asset.id, err);
    }
  }
  return { deleted };
}
__name(cleanupExpiredEvidence, "cleanupExpiredEvidence");
async function handleEvidenceRequest(request, env2, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const isEvidencePath = path.startsWith("/api/child/evidence") || path.startsWith("/api/parent/evidence");
  if (!isEvidencePath) return null;
  const user = await getSessionUser(request, env2.DB);
  if (!user) return errorJson2("\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA", 401);
  if (path === "/api/child/evidence/start" && method === "POST") {
    return createEvidenceSubmission(request, env2, user);
  }
  const childAssetMatch = path.match(/^\/api\/child\/evidence\/([^/]+)\/asset\/([^/]+)$/);
  if (childAssetMatch && method === "PUT") {
    return uploadEvidenceAsset(request, env2, user, childAssetMatch[1], childAssetMatch[2]);
  }
  const childCompleteMatch = path.match(/^\/api\/child\/evidence\/([^/]+)\/complete$/);
  if (childCompleteMatch && method === "POST") {
    return completeEvidenceSubmission(env2, user, ctx, childCompleteMatch[1]);
  }
  const childGetMatch = path.match(/^\/api\/child\/evidence\/([^/]+)$/);
  if (childGetMatch && method === "GET") {
    return getChildEvidence(env2, user, childGetMatch[1]);
  }
  if (path === "/api/parent/evidence" && method === "GET") {
    return listParentEvidence(env2, user, url);
  }
  const parentMediaMatch = path.match(/^\/api\/parent\/evidence\/([^/]+)\/media\/([^/]+)$/);
  if (parentMediaMatch && method === "GET") {
    return streamParentEvidenceAsset(env2, user, parentMediaMatch[1], parentMediaMatch[2]);
  }
  const parentDetailMatch = path.match(/^\/api\/parent\/evidence\/([^/]+)$/);
  if (parentDetailMatch && method === "GET") {
    return getParentEvidenceDetail(env2, user, parentDetailMatch[1]);
  }
  return errorJson2("\u05E0\u05EA\u05D9\u05D1 evidence \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0", 404);
}
__name(handleEvidenceRequest, "handleEvidenceRequest");

// src/evidence-review.ts
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
__name(json3, "json");
function errorJson3(message, status = 400) {
  return json3({ success: false, error: message }, status);
}
__name(errorJson3, "errorJson");
async function findEvidenceSubmission(env2, familyId, id) {
  return env2.DB.prepare(
    `SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,
            ti.family_id,ti.child_id,ti.title,ti.status AS task_status
     FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL`
  ).bind(id, familyId).first();
}
__name(findEvidenceSubmission, "findEvidenceSubmission");
async function findEvidenceByTask(env2, familyId, id) {
  return env2.DB.prepare(
    `SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,
            ti.family_id,ti.child_id,ti.title,ti.status AS task_status
     FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.task_instance_id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL
     ORDER BY ts.submitted_at DESC LIMIT 1`
  ).bind(id, familyId).first();
}
__name(findEvidenceByTask, "findEvidenceByTask");
async function audit(env2, familyId, id, action, metadata) {
  await env2.DB.prepare(
    `INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
     VALUES (?,?,'parent','parent',?,'task_submission',?,?,?)`
  ).bind(generateId(), familyId, action, id, JSON.stringify(metadata ?? {}), (/* @__PURE__ */ new Date()).toISOString()).run();
}
__name(audit, "audit");
async function approveEvidence(env2, familyId, s, body) {
  const custom = body.rewardMinutes !== void 0 ? Number(body.rewardMinutes) : void 0;
  const r = await approveTask(env2.DB, s.task_instance_id, familyId, custom, "parent");
  if (!r.success) return errorJson3(r.error || "\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05DB\u05E9\u05DC", 400);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `UPDATE task_submissions SET verification_status='verified',review_mode='parent',reviewed_at=?,status='approved' WHERE id=?`
  ).bind(now, s.id).run();
  if ((r.minutesAwarded || 0) > 0) {
    await env2.DB.prepare(
      `UPDATE minute_transactions SET evidence_submission_id=?
       WHERE id=(SELECT id FROM minute_transactions WHERE task_instance_id=? AND evidence_submission_id IS NULL ORDER BY created_at DESC LIMIT 1)`
    ).bind(s.id, s.task_instance_id).run();
  }
  const ret = await resolveEvidenceRetention(env2.DB, s.id);
  await audit(env2, familyId, s.id, "evidence_parent_approved", {
    taskInstanceId: s.task_instance_id,
    minutesAwarded: r.minutesAwarded || 0,
    xpAwarded: r.xpAwarded || 0,
    evidenceExpiresAt: ret.expiresAt
  });
  await sendNotification(env2.DB, env2, {
    familyId,
    recipientRole: "child",
    recipientChildId: s.child_id,
    type: "task_approved",
    title: (r.minutesAwarded || 0) > 0 ? `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! +${r.minutesAwarded} \u05D3\u05E7'` : "\u05DE\u05E9\u05D9\u05DE\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4! \u2B50",
    message: `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 "${s.title}" \u05D0\u05D5\u05E9\u05E8\u05D4 \u05DC\u05D0\u05D7\u05E8 \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D9\u05E2\u05D5\u05D3.`,
    entityType: "task_instance",
    entityId: s.task_instance_id,
    skipDbInsert: true
  });
  return json3({
    success: true,
    message: "\u05D4\u05EA\u05D9\u05E2\u05D5\u05D3 \u05D5\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4",
    minutesAwarded: r.minutesAwarded || 0,
    xpAwarded: r.xpAwarded || 0,
    evidenceExpiresAt: ret.expiresAt
  });
}
__name(approveEvidence, "approveEvidence");
async function rejectEvidence(env2, familyId, s, body) {
  const reason = String(body.reason || "\u05D4\u05E8\u05D0\u05D9\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05DE\u05E1\u05E4\u05D9\u05E7\u05D4").slice(0, 500);
  const r = await rejectTask(env2.DB, s.task_instance_id, familyId, reason);
  if (!r.success) return errorJson3(r.error || "\u05D3\u05D7\u05D9\u05D9\u05EA \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4", 400);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `UPDATE task_submissions
     SET verification_status='needs_parent_review',review_mode='parent',reviewed_at=?,status='rejected',verification_summary=?
     WHERE id=?`
  ).bind(now, `\u05D4\u05D4\u05D5\u05E8\u05D4 \u05D3\u05D7\u05D4 \u05D0\u05EA \u05D4\u05E8\u05D0\u05D9\u05D4: ${reason}`, s.id).run();
  const ret = await resolveEvidenceRetention(env2.DB, s.id);
  await audit(env2, familyId, s.id, "evidence_parent_rejected", {
    taskInstanceId: s.task_instance_id,
    reason,
    evidenceExpiresAt: ret.expiresAt
  });
  await sendNotification(env2.DB, env2, {
    familyId,
    recipientRole: "child",
    recipientChildId: s.child_id,
    type: "task_rejected",
    title: `\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8\u05D4: ${s.title}`,
    message: reason,
    entityType: "task_instance",
    entityId: s.task_instance_id,
    skipDbInsert: true
  });
  return json3({ success: true, message: "\u05D4\u05E8\u05D0\u05D9\u05D4 \u05E0\u05D3\u05D7\u05EA\u05D4 \u05D5\u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D9\u05E9 \u05DE\u05D7\u05D3\u05E9", evidenceExpiresAt: ret.expiresAt });
}
__name(rejectEvidence, "rejectEvidence");
async function adjustEvidenceAward(env2, familyId, s, body) {
  if (s.task_status !== "approved" || s.status !== "approved") return errorJson3("\u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05E0\u05D5\u05EA \u05D3\u05E7\u05D5\u05EA \u05E8\u05E7 \u05DC\u05D0\u05D7\u05E8 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D9\u05DE\u05D4", 409);
  const delta = Number(body.minutesDelta);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 600) {
    return errorJson3("\u05E9\u05D9\u05E0\u05D5\u05D9 \u05D4\u05D3\u05E7\u05D5\u05EA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05E9\u05DC\u05DD \u05D1\u05D9\u05DF \u200E-600 \u05DC-600 \u05D5\u05D0\u05D9\u05E0\u05D5 \u05D9\u05DB\u05D5\u05DC \u05DC\u05D4\u05D9\u05D5\u05EA 0", 400);
  }
  const reason = String(body.reason || "\u05EA\u05D9\u05E7\u05D5\u05DF \u05D6\u05D9\u05DB\u05D5\u05D9 \u05EA\u05D9\u05E2\u05D5\u05D3").trim().slice(0, 500);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const tx = generateId();
  const results = await env2.DB.batch([
    env2.DB.prepare(
      `UPDATE children
       SET available_minutes=available_minutes+?, updated_at=?
       WHERE id=? AND family_id=? AND available_minutes+? >= 0`
    ).bind(delta, now, s.child_id, familyId, delta),
    env2.DB.prepare(
      `INSERT INTO minute_transactions
       (id,family_id,child_id,type,amount,balance_after,reason,task_instance_id,evidence_submission_id,created_by,created_at)
       SELECT ?,?,?, 'adjustment', ?, available_minutes, ?, ?, ?, 'parent', ?
       FROM children WHERE id=? AND family_id=? AND updated_at=?`
    ).bind(tx, familyId, s.child_id, delta, reason, s.task_instance_id, s.id, now, s.child_id, familyId, now)
  ]);
  if (Number(results[0]?.meta?.changes || 0) === 0) {
    return errorJson3("\u05D4\u05EA\u05D9\u05E7\u05D5\u05DF \u05D9\u05D9\u05E6\u05D5\u05E8 \u05D9\u05EA\u05E8\u05D4 \u05E9\u05DC\u05D9\u05DC\u05D9\u05EA; \u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05DB\u05D5\u05DD \u05E7\u05D8\u05DF \u05D9\u05D5\u05EA\u05E8", 400);
  }
  const child = await env2.DB.prepare(`SELECT available_minutes FROM children WHERE id=? AND family_id=?`).bind(s.child_id, familyId).first();
  const next = Number(child?.available_minutes || 0);
  await audit(env2, familyId, s.id, "evidence_parent_adjusted", {
    transactionId: tx,
    minutesDelta: delta,
    newBalance: next,
    reason
  });
  return json3({ success: true, message: "\u05D4\u05D3\u05E7\u05D5\u05EA \u05EA\u05D5\u05E7\u05E0\u05D5 \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05EA\u05E0\u05D5\u05E2\u05EA \u05D0\u05D9\u05D6\u05D5\u05DF", minutesDelta: delta, newBalance: next, transactionId: tx });
}
__name(adjustEvidenceAward, "adjustEvidenceAward");
async function handleEvidenceReviewRequest(request, env2) {
  if (request.method.toUpperCase() !== "POST") return null;
  const url = new URL(request.url);
  const a = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/approve$/);
  const r = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/reject$/);
  const j = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/adjust$/);
  const t = url.pathname.match(/^\/api\/parent\/tasks\/([^/]+)\/approve$/);
  if (!a && !r && !j && !t) return null;
  const u = await getSessionUser(request, env2.DB);
  if (!u) return errorJson3("\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA", 401);
  if (u.role !== "parent") return errorJson3("\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05DE\u05D5\u05E8\u05E9\u05D9\u05EA \u05DC\u05D4\u05D5\u05E8\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3", 403);
  const s = t ? await findEvidenceByTask(env2, u.familyId, t[1]) : await findEvidenceSubmission(env2, u.familyId, (a || r || j)[1]);
  if (!s && t) return null;
  if (!s) return errorJson3("\u05D4\u05D2\u05E9\u05EA \u05D4\u05E8\u05D0\u05D9\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4", 404);
  const body = await request.json().catch(() => ({}));
  if (r) return rejectEvidence(env2, u.familyId, s, body);
  if (j) return adjustEvidenceAward(env2, u.familyId, s, body);
  return approveEvidence(env2, u.familyId, s, body);
}
__name(handleEvidenceReviewRequest, "handleEvidenceReviewRequest");

// src/index-evidence.ts
var PAGES_ORIGIN = "https://timeplus-app.pages.dev";
var index_evidence_default = {
  async fetch(request, env2, ctx) {
    const reviewResponse = await handleEvidenceReviewRequest(request, env2);
    if (reviewResponse) return reviewResponse;
    const url = new URL(request.url);
    const evidenceResponse = await handleEvidenceRequest(request, env2, ctx);
    if (evidenceResponse) {
      if (evidenceResponse.ok && request.method.toUpperCase() === "POST" && /^\/api\/child\/evidence\/[^/]+\/complete$/.test(url.pathname)) {
        const user = await getSessionUser(request, env2.DB);
        if (user) ctx.waitUntil(ensureDailyTaskInstances(env2.DB, user.familyId).then(() => void 0));
      }
      return evidenceResponse;
    }
    const isWorkerRoute = url.pathname === "/healthz" || url.pathname === "/api" || url.pathname.startsWith("/api/");
    if (!isWorkerRoute) {
      const assets = env2.ASSETS;
      if (assets && typeof assets.fetch === "function") {
        return assets.fetch(request);
      }
      const target = new URL(url.pathname + url.search, PAGES_ORIGIN);
      return Response.redirect(target.toString(), 302);
    }
    return index_default.fetch(request, env2, ctx);
  },
  async scheduled(event, env2, ctx) {
    await index_default.scheduled(event, env2, ctx);
    const recovery = await recoverStalePendingAiEvidence(env2);
    if (recovery.retried || recovery.exhausted || recovery.failed) {
      console.log(`Evidence AI recovery: ${JSON.stringify(recovery)}`);
    }
    const scheduledAt = new Date(event.scheduledTime);
    if (scheduledAt.getUTCHours() === 3 && scheduledAt.getUTCMinutes() === 10) {
      const cleanupPromise = cleanupExpiredEvidence(env2).then((result) => {
        if (result.deleted > 0) console.log(`Evidence cleanup deleted ${result.deleted} object(s)`);
      });
      ctx.waitUntil(cleanupPromise);
    }
  }
};
export {
  index_evidence_default as default
};
//# sourceMappingURL=index-evidence.js.map
