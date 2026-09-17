"use strict";
/**
 * Copyright (c) 2019, Microsoft Corporation (MIT License).
 *
 * This module fetches the console process list for a particular PID. It must be
 * called from a different process (child_process.fork) as there can only be a
 * single console attached to a process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var getConsoleProcessList = (0, utils_1.loadNativeModule)('conpty_console_list').module.getConsoleProcessList;
var shellPid = parseInt(process.argv[2], 10);
var consoleProcessList = [];
if (shellPid > 0) {
    try {
        consoleProcessList = getConsoleProcessList(shellPid);
    }
    catch (_a) {
        // AttachConsole can fail if the process already exited or is invalid.
        consoleProcessList = [];
    }
}
process.send({ consoleProcessList: consoleProcessList });
process.exit(0);
//# sourceMappingURL=conpty_console_list_agent.js.map