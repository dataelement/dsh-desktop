"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnixTerminal = void 0;
/**
 * Copyright (c) 2012-2015, Christopher Jeffrey (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */
var fs = require("fs");
var path = require("path");
var tty = require("tty");
var terminal_1 = require("./terminal");
var utils_1 = require("./utils");
var native = (0, utils_1.loadNativeModule)('pty');
var pty = native.module;
var helperPath = native.dir + '/spawn-helper';
helperPath = path.resolve(__dirname, helperPath);
helperPath = helperPath.replace('app.asar', 'app.asar.unpacked');
helperPath = helperPath.replace('node_modules.asar', 'node_modules.asar.unpacked');
var DEFAULT_FILE = 'sh';
var DEFAULT_NAME = 'xterm';
var DESTROY_SOCKET_TIMEOUT_MS = 200;
var UnixTerminal = /** @class */ (function (_super) {
    __extends(UnixTerminal, _super);
    function UnixTerminal(file, args, opt) {
        var _a, _b;
        var _this = _super.call(this, opt) || this;
        _this._boundClose = false;
        _this._emittedClose = false;
        if (typeof args === 'string') {
            throw new Error('args as a string is not supported on unix.');
        }
        // Initialize arguments
        args = args || [];
        file = file || DEFAULT_FILE;
        opt = opt || {};
        opt.env = opt.env || process.env;
        _this._cols = opt.cols || terminal_1.DEFAULT_COLS;
        _this._rows = opt.rows || terminal_1.DEFAULT_ROWS;
        var uid = (_a = opt.uid) !== null && _a !== void 0 ? _a : -1;
        var gid = (_b = opt.gid) !== null && _b !== void 0 ? _b : -1;
        var env = (0, utils_1.assign)({}, opt.env);
        if (opt.env === process.env) {
            _this._sanitizeEnv(env);
        }
        var cwd = opt.cwd || process.cwd();
        env.PWD = cwd;
        var name = opt.name || env.TERM || DEFAULT_NAME;
        env.TERM = name;
        var parsedEnv = _this._parseEnv(env);
        var encoding = (opt.encoding === undefined ? 'utf8' : opt.encoding);
        var onexit = function (code, signal) {
            // XXX Sometimes a data event is emitted after exit. Wait til socket is
            // destroyed.
            if (!_this._emittedClose) {
                if (_this._boundClose) {
                    return;
                }
                _this._boundClose = true;
                // From macOS High Sierra 10.13.2 sometimes the socket never gets
                // closed. A timeout is applied here to avoid the terminal never being
                // destroyed when this occurs.
                var timeout_1 = setTimeout(function () {
                    timeout_1 = null;
                    // Destroying the socket now will cause the close event to fire
                    _this._socket.destroy();
                }, DESTROY_SOCKET_TIMEOUT_MS);
                _this.once('close', function () {
                    if (timeout_1 !== null) {
                        clearTimeout(timeout_1);
                    }
                    _this.emit('exit', code, signal);
                });
                return;
            }
            _this.emit('exit', code, signal);
        };
        // fork
        var term = pty.fork(file, args, parsedEnv, cwd, _this._cols, _this._rows, uid, gid, (encoding === 'utf8'), helperPath, onexit);
        _this._socket = new tty.ReadStream(term.fd);
        if (encoding !== null) {
            _this._socket.setEncoding(encoding);
        }
        _this._writeStream = new CustomWriteStream(term.fd, (encoding || undefined));
        // setup
        _this._socket.on('error', function (err) {
            // NOTE: fs.ReadStream gets EAGAIN twice at first:
            if (err.code) {
                if (~err.code.indexOf('EAGAIN')) {
                    return;
                }
            }
            // close
            _this._close();
            // EIO on exit from fs.ReadStream:
            if (!_this._emittedClose) {
                _this._emittedClose = true;
                _this.emit('close');
            }
            // EIO, happens when someone closes our child process: the only process in
            // the terminal.
            // node < 0.6.14: errno 5
            // node >= 0.6.14: read EIO
            if (err.code) {
                if (~err.code.indexOf('errno 5') || ~err.code.indexOf('EIO')) {
                    return;
                }
            }
            // throw anything else
            if (_this.listeners('error').length < 2) {
                throw err;
            }
        });
        _this._pid = term.pid;
        _this._fd = term.fd;
        _this._pty = term.pty;
        _this._file = file;
        _this._name = name;
        _this._readable = true;
        _this._writable = true;
        _this._socket.on('close', function () {
            if (_this._emittedClose) {
                return;
            }
            _this._emittedClose = true;
            _this._close();
            _this.emit('close');
        });
        _this._forwardEvents();
        return _this;
    }
    Object.defineProperty(UnixTerminal.prototype, "master", {
        get: function () { return this._master; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(UnixTerminal.prototype, "slave", {
        get: function () { return this._slave; },
        enumerable: false,
        configurable: true
    });
    UnixTerminal.prototype._write = function (data) {
        this._writeStream.write(data);
    };
    Object.defineProperty(UnixTerminal.prototype, "fd", {
        /* Accessors */
        get: function () { return this._fd; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(UnixTerminal.prototype, "ptsName", {
        get: function () { return this._pty; },
        enumerable: false,
        configurable: true
    });
    /**
     * openpty
     */
    UnixTerminal.open = function (opt) {
        var self = Object.create(UnixTerminal.prototype);
        opt = opt || {};
        if (arguments.length > 1) {
            opt = {
                cols: arguments[1],
                rows: arguments[2]
            };
        }
        var cols = opt.cols || terminal_1.DEFAULT_COLS;
        var rows = opt.rows || terminal_1.DEFAULT_ROWS;
        var encoding = (opt.encoding === undefined ? 'utf8' : opt.encoding);
        // open
        var term = pty.open(cols, rows);
        self._master = new tty.ReadStream(term.master);
        if (encoding !== null) {
            self._master.setEncoding(encoding);
        }
        self._master.resume();
        self._slave = new tty.ReadStream(term.slave);
        if (encoding !== null) {
            self._slave.setEncoding(encoding);
        }
        self._slave.resume();
        self._socket = self._master;
        self._pid = -1;
        self._fd = term.master;
        self._pty = term.pty;
        self._file = process.argv[0] || 'node';
        self._name = process.env.TERM || '';
        self._readable = true;
        self._writable = true;
        self._socket.on('error', function (err) {
            self._close();
            if (self.listeners('error').length < 2) {
                throw err;
            }
        });
        self._socket.on('close', function () {
            self._close();
        });
        return self;
    };
    UnixTerminal.prototype.destroy = function () {
        var _this = this;
        this._close();
        // Need to close the read stream so node stops reading a dead file
        // descriptor. Then we can safely SIGHUP the shell.
        this._socket.once('close', function () {
            _this.kill('SIGHUP');
        });
        this._socket.destroy();
        this._writeStream.dispose();
    };
    UnixTerminal.prototype.kill = function (signal) {
        try {
            process.kill(this.pid, signal || 'SIGHUP');
        }
        catch (e) { /* swallow */ }
    };
    Object.defineProperty(UnixTerminal.prototype, "process", {
        /**
         * Gets the name of the process.
         */
        get: function () {
            if (process.platform === 'darwin') {
                var title = pty.process(this._fd);
                return (title !== 'kernel_task' && title !== 'spawn_helper') ? title : this._file;
            }
            return pty.process(this._fd, this._pty) || this._file;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * TTY
     */
    UnixTerminal.prototype.resize = function (cols, rows, pixelSize) {
        var _a, _b;
        if (cols <= 0 || rows <= 0 || isNaN(cols) || isNaN(rows) || cols === Infinity || rows === Infinity) {
            throw new Error('resizing must be done using positive cols and rows');
        }
        var pixelWidth = (_a = pixelSize === null || pixelSize === void 0 ? void 0 : pixelSize.width) !== null && _a !== void 0 ? _a : 0;
        var pixelHeight = (_b = pixelSize === null || pixelSize === void 0 ? void 0 : pixelSize.height) !== null && _b !== void 0 ? _b : 0;
        pty.resize(this._fd, cols, rows, pixelWidth, pixelHeight);
        this._cols = cols;
        this._rows = rows;
    };
    UnixTerminal.prototype.clear = function () {
    };
    UnixTerminal.prototype._sanitizeEnv = function (env) {
        // Make sure we didn't start our server from inside tmux.
        delete env['TMUX'];
        delete env['TMUX_PANE'];
        // Make sure we didn't start our server from inside screen.
        // http://web.mit.edu/gnu/doc/html/screen_20.html
        delete env['STY'];
        delete env['WINDOW'];
        // Delete some variables that might confuse our terminal.
        delete env['WINDOWID'];
        delete env['TERMCAP'];
        delete env['COLUMNS'];
        delete env['LINES'];
    };
    return UnixTerminal;
}(terminal_1.Terminal));
exports.UnixTerminal = UnixTerminal;
/**
 * A custom write stream that writes directly to a file descriptor with proper
 * handling of backpressure and errors. This avoids some event loop exhaustion
 * issues that can occur when using the standard APIs in Node.
 */
var CustomWriteStream = /** @class */ (function () {
    function CustomWriteStream(_fd, _encoding) {
        this._fd = _fd;
        this._encoding = _encoding;
        this._writeQueue = [];
    }
    CustomWriteStream.prototype.dispose = function () {
        clearImmediate(this._writeImmediate);
        this._writeImmediate = undefined;
    };
    CustomWriteStream.prototype.write = function (data) {
        // Writes are put in a queue and processed asynchronously in order to handle
        // backpressure from the kernel buffer.
        var buffer = typeof data === 'string'
            ? Buffer.from(data, this._encoding)
            : Buffer.from(data);
        if (buffer.byteLength !== 0) {
            this._writeQueue.push({ buffer: buffer, offset: 0 });
            if (this._writeQueue.length === 1) {
                this._processWriteQueue();
            }
        }
    };
    CustomWriteStream.prototype._processWriteQueue = function () {
        var _this = this;
        this._writeImmediate = undefined;
        if (this._writeQueue.length === 0) {
            return;
        }
        var task = this._writeQueue[0];
        // Write to the underlying file descriptor and handle it directly, rather
        // than using the `net.Socket`/`tty.WriteStream` wrappers which swallow and
        // mask errors like EAGAIN and can cause the thread to block indefinitely.
        fs.write(this._fd, task.buffer, task.offset, function (err, written) {
            if (err) {
                if ('code' in err && err.code === 'EAGAIN') {
                    // `setImmediate` is used to yield to the event loop and re-attempt
                    // the write later.
                    _this._writeImmediate = setImmediate(function () { return _this._processWriteQueue(); });
                }
                else {
                    // Stop processing immediately on unexpected error and log
                    _this._writeQueue.length = 0;
                    console.error('Unhandled pty write error', err);
                }
                return;
            }
            task.offset += written;
            if (task.offset >= task.buffer.byteLength) {
                _this._writeQueue.shift();
            }
            // Since there is more room in the kernel buffer, we can continue to write
            // until we hit EAGAIN or exhaust the queue.
            //
            // Note that old versions of bash, like v3.2 which ships in macOS, appears
            // to have a bug in its readline implementation that causes data
            // corruption when writes to the pty happens too quickly. Instead of
            // trying to workaround that we just accept it so that large pastes are as
            // fast as possible.
            // Context: https://github.com/microsoft/node-pty/issues/833
            _this._processWriteQueue();
        });
    };
    return CustomWriteStream;
}());
//# sourceMappingURL=unixTerminal.js.map