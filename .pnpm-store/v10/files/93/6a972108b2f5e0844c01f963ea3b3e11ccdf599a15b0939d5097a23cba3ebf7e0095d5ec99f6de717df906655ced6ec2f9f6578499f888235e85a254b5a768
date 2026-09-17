"use strict";
/**
 * Copyright (c) 2012-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsPtyAgent = void 0;
exports.argsToCommandLine = argsToCommandLine;
var fs = require("fs");
var path = require("path");
var child_process_1 = require("child_process");
var net_1 = require("net");
var windowsConoutConnection_1 = require("./windowsConoutConnection");
var eventEmitter2_1 = require("./eventEmitter2");
var utils_1 = require("./utils");
var conptyNative;
/**
 * The amount of time to wait for additional data after the conpty shell process has exited before
 * shutting down the socket. The timer will be reset if a new data event comes in after the timer
 * has started.
 */
var FLUSH_DATA_INTERVAL = 1000;
var CONNECTION_TIMEOUT = 5000;
var defaultWindowsPtyAgentOptions = {
    connectionTimeout: CONNECTION_TIMEOUT,
    conoutConnectionFactory: function (conoutPipeName, useConptyDll) { return new windowsConoutConnection_1.ConoutConnection(conoutPipeName, useConptyDll); }
};
/**
 * This agent sits between the WindowsTerminal class and provides an interface for conpty.
 */
var WindowsPtyAgent = /** @class */ (function () {
    function WindowsPtyAgent(file, args, env, cwd, cols, rows, debug, _useConptyDll, conptyInheritCursor, options) {
        if (_useConptyDll === void 0) { _useConptyDll = false; }
        if (conptyInheritCursor === void 0) { conptyInheritCursor = false; }
        if (options === void 0) { options = defaultWindowsPtyAgentOptions; }
        var _this = this;
        this._useConptyDll = _useConptyDll;
        this._innerPid = 0;
        this._onError = new eventEmitter2_1.EventEmitter2();
        if (!conptyNative) {
            conptyNative = (0, utils_1.loadNativeModule)('conpty').module;
        }
        this._ptyNative = conptyNative;
        // Sanitize input variable.
        cwd = path.resolve(cwd);
        // Compose command line
        var commandLine = argsToCommandLine(file, args);
        // Open pty session.
        var term = conptyNative.startProcess(file, cols, rows, debug, this._generatePipeName(), conptyInheritCursor, this._useConptyDll);
        // Not available on windows.
        this._fd = term.fd;
        // Generated incremental number that has no real purpose besides  using it
        // as a terminal id.
        this._pty = term.pty;
        // Create terminal pipe IPC channel and forward to a local unix socket.
        this._outSocket = new net_1.Socket();
        this._outSocket.setEncoding('utf8');
        // The conout socket must be ready out on another thread to avoid deadlocks
        // We must wait for the worker to connect before calling conptyNative.connect()
        // to avoid blocking the Node.js event loop in ConnectNamedPipe.
        // See https://github.com/microsoft/node-pty/issues/763
        this._conoutSocketWorker = options.conoutConnectionFactory(term.conout, this._useConptyDll);
        // Store pending connection info - we'll complete the connection when worker is ready
        this._pendingPtyInfo = { pty: this._pty, commandLine: commandLine, cwd: cwd, env: env };
        // Never call connect() before the worker is ready, as ConnectNamedPipe
        // would block the Node.js event loop while waiting for the output client.
        this._connectionTimeout = setTimeout(function () {
            _this._failPtyConnection(new Error('Timed out waiting for ConPTY output worker'));
        }, options.connectionTimeout);
        this._conoutSocketWorker.onReady(function () {
            if (!_this._pendingPtyInfo) {
                return;
            }
            _this._clearConnectionTimeout();
            _this._conoutSocketWorker.connectSocket(_this._outSocket);
            // Now that the worker has connected to the output pipe, we can safely call
            // conptyNative.connect() which calls ConnectNamedPipe - it won't block because
            // the client (worker) is already connected
            _this._completePtyConnection();
        });
        this._conoutSocketWorker.onError(function (error) { return _this._failPtyConnection(error); });
        this._outSocket.on('connect', function () {
            _this._outSocket.emit('ready_datapipe');
        });
        var inSocketFD = fs.openSync(term.conin, 'w');
        this._inSocket = new net_1.Socket({
            fd: inSocketFD,
            readable: false,
            writable: true
        });
        this._inSocket.setEncoding('utf8');
    }
    Object.defineProperty(WindowsPtyAgent.prototype, "onError", {
        get: function () { return this._onError.event; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WindowsPtyAgent.prototype, "inSocket", {
        get: function () { return this._inSocket; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WindowsPtyAgent.prototype, "outSocket", {
        get: function () { return this._outSocket; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WindowsPtyAgent.prototype, "fd", {
        get: function () { return this._fd; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WindowsPtyAgent.prototype, "innerPid", {
        get: function () { return this._innerPid; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WindowsPtyAgent.prototype, "pty", {
        get: function () { return this._pty; },
        enumerable: false,
        configurable: true
    });
    WindowsPtyAgent.prototype._completePtyConnection = function () {
        var _this = this;
        var _a;
        if (!this._pendingPtyInfo) {
            return;
        }
        this._clearConnectionTimeout();
        var _b = this._pendingPtyInfo, pty = _b.pty, commandLine = _b.commandLine, cwd = _b.cwd, env = _b.env;
        this._pendingPtyInfo = undefined;
        try {
            var connect = conptyNative.connect(pty, commandLine, cwd, env, this._useConptyDll, function (c) { return _this._$onProcessExit(c); });
            this._innerPid = connect.pid;
        }
        catch (err) {
            // connect() runs from the conout worker's onReady callback, so a throw
            // here would otherwise surface as an
            // uncaughtException with no way for the consumer to observe it.
            var code = (_a = /error code: (\d+)/.exec(err.message)) === null || _a === void 0 ? void 0 : _a[1];
            this._exitCode = code ? parseInt(code, 10) : -1;
            try {
                this._ptyNative.kill(this._pty, this._useConptyDll);
            }
            catch ( /* already gone */_c) { /* already gone */ }
            this._conoutSocketWorker.dispose();
            this._inSocket.destroy();
            this._outSocket.destroy();
            this._onError.fire(err);
        }
    };
    WindowsPtyAgent.prototype._failPtyConnection = function (error) {
        if (!this._pendingPtyInfo) {
            return;
        }
        this._clearConnectionTimeout();
        this._pendingPtyInfo = undefined;
        this._exitCode = -1;
        try {
            this._ptyNative.kill(this._pty, this._useConptyDll);
        }
        catch ( /* already gone */_a) { /* already gone */ }
        this._conoutSocketWorker.dispose();
        this._inSocket.destroy();
        this._outSocket.destroy();
        this._onError.fire(error);
    };
    WindowsPtyAgent.prototype._clearConnectionTimeout = function () {
        if (this._connectionTimeout) {
            clearTimeout(this._connectionTimeout);
            this._connectionTimeout = undefined;
        }
    };
    WindowsPtyAgent.prototype.resize = function (cols, rows) {
        if (this._exitCode !== undefined) {
            throw new Error('Cannot resize a pty that has already exited');
        }
        this._ptyNative.resize(this._pty, cols, rows, this._useConptyDll);
    };
    WindowsPtyAgent.prototype.clear = function () {
        this._ptyNative.clear(this._pty, this._useConptyDll);
    };
    WindowsPtyAgent.prototype.kill = function () {
        var _this = this;
        // Prevent deferred connection from completing after kill
        this._clearConnectionTimeout();
        this._pendingPtyInfo = undefined;
        // Tell the agent to kill the pty, this releases handles to the process
        if (!this._useConptyDll) {
            this._inSocket.readable = false;
            this._outSocket.readable = false;
            this._getConsoleProcessList().then(function (consoleProcessList) {
                consoleProcessList.forEach(function (pid) {
                    try {
                        process.kill(pid);
                    }
                    catch (e) {
                        // Ignore if process cannot be found (kill ESRCH error)
                    }
                });
            });
            this._ptyNative.kill(this._pty, this._useConptyDll);
            this._conoutSocketWorker.dispose();
        }
        else {
            // Close the input write handle to signal the end of session.
            this._inSocket.destroy();
            this._ptyNative.kill(this._pty, this._useConptyDll);
            this._outSocket.on('data', function () {
                _this._conoutSocketWorker.dispose();
            });
        }
    };
    WindowsPtyAgent.prototype._getConsoleProcessList = function () {
        var _this = this;
        if (this._innerPid <= 0) {
            return Promise.resolve([]);
        }
        return new Promise(function (resolve) {
            var agent = (0, child_process_1.fork)(path.join(__dirname, 'conpty_console_list_agent'), [_this._innerPid.toString()]);
            agent.on('message', function (message) {
                clearTimeout(timeout);
                resolve(message.consoleProcessList);
            });
            var timeout = setTimeout(function () {
                // Something went wrong, just send back the shell PID
                agent.kill();
                resolve([_this._innerPid]);
            }, 5000);
        });
    };
    Object.defineProperty(WindowsPtyAgent.prototype, "exitCode", {
        get: function () {
            return this._exitCode;
        },
        enumerable: false,
        configurable: true
    });
    WindowsPtyAgent.prototype._generatePipeName = function () {
        return "conpty-".concat(Math.random() * 10000000);
    };
    /**
     * Triggered from the native side when a contpy process exits.
     */
    WindowsPtyAgent.prototype._$onProcessExit = function (exitCode) {
        var _this = this;
        this._exitCode = exitCode;
        if (!this._useConptyDll) {
            this._flushDataAndCleanUp();
            this._outSocket.on('data', function () { return _this._flushDataAndCleanUp(); });
        }
    };
    WindowsPtyAgent.prototype._flushDataAndCleanUp = function () {
        var _this = this;
        if (this._useConptyDll) {
            return;
        }
        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
        }
        this._closeTimeout = setTimeout(function () { return _this._cleanUpProcess(); }, FLUSH_DATA_INTERVAL);
    };
    WindowsPtyAgent.prototype._cleanUpProcess = function () {
        if (this._useConptyDll) {
            return;
        }
        this._inSocket.readable = false;
        this._outSocket.readable = false;
        this._outSocket.destroy();
    };
    return WindowsPtyAgent;
}());
exports.WindowsPtyAgent = WindowsPtyAgent;
// Convert argc/argv into a Win32 command-line following the escaping convention
// documented on MSDN (e.g. see CommandLineToArgvW documentation). Copied from
// winpty project.
function argsToCommandLine(file, args) {
    if (isCommandLine(args)) {
        if (args.length === 0) {
            return file;
        }
        return "".concat(argsToCommandLine(file, []), " ").concat(args);
    }
    var argv = [file];
    Array.prototype.push.apply(argv, args);
    var result = '';
    for (var argIndex = 0; argIndex < argv.length; argIndex++) {
        if (argIndex > 0) {
            result += ' ';
        }
        var arg = argv[argIndex];
        // if it is empty or it contains whitespace and is not already quoted
        var hasLopsidedEnclosingQuote = xOr((arg[0] !== '"'), (arg[arg.length - 1] !== '"'));
        var hasNoEnclosingQuotes = ((arg[0] !== '"') && (arg[arg.length - 1] !== '"'));
        var quote = arg === '' ||
            (arg.indexOf(' ') !== -1 ||
                arg.indexOf('\t') !== -1) &&
                ((arg.length > 1) &&
                    (hasLopsidedEnclosingQuote || hasNoEnclosingQuotes));
        if (quote) {
            result += '\"';
        }
        var bsCount = 0;
        for (var i = 0; i < arg.length; i++) {
            var p = arg[i];
            if (p === '\\') {
                bsCount++;
            }
            else if (p === '"') {
                result += repeatText('\\', bsCount * 2 + 1);
                result += '"';
                bsCount = 0;
            }
            else {
                result += repeatText('\\', bsCount);
                bsCount = 0;
                result += p;
            }
        }
        if (quote) {
            result += repeatText('\\', bsCount * 2);
            result += '\"';
        }
        else {
            result += repeatText('\\', bsCount);
        }
    }
    return result;
}
function isCommandLine(args) {
    return typeof args === 'string';
}
function repeatText(text, count) {
    var result = '';
    for (var i = 0; i < count; i++) {
        result += text;
    }
    return result;
}
function xOr(arg1, arg2) {
    return ((arg1 && !arg2) || (!arg1 && arg2));
}
//# sourceMappingURL=windowsPtyAgent.js.map