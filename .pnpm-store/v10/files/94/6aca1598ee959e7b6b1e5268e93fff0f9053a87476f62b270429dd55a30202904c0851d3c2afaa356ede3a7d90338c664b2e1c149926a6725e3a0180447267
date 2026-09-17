// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

function loadStatic(pkg) {
    let native = null;

    if (pkg == 'linux-arm') {
        try {
            native = require('@koromix/koffi-linux-arm');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-arm64') {
        try {
            native = require('@koromix/koffi-linux-arm64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-ia32') {
        try {
            native = require('@koromix/koffi-linux-ia32');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-x64') {
        try {
            native = require('@koromix/koffi-linux-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-riscv64') {
        try {
            native = require('@koromix/koffi-linux-riscv64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'freebsd-ia32') {
        try {
            native = require('@koromix/koffi-freebsd-ia32');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'freebsd-x64') {
        try {
            native = require('@koromix/koffi-freebsd-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'freebsd-arm64') {
        try {
            native = require('@koromix/koffi-freebsd-arm64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'openbsd-ia32') {
        try {
            native = require('@koromix/koffi-openbsd-ia32');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'openbsd-x64') {
        try {
            native = require('@koromix/koffi-openbsd-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'win32-ia32') {
        try {
            native = require('@koromix/koffi-win32-ia32');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'win32-x64') {
        try {
            native = require('@koromix/koffi-win32-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'win32-arm64') {
        try {
            native = require('@koromix/koffi-win32-arm64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'darwin-x64') {
        try {
            native = require('@koromix/koffi-darwin-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'darwin-arm64') {
        try {
            native = require('@koromix/koffi-darwin-arm64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-loong64') {
        try {
            native = require('@koromix/koffi-linux-loong64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'android-arm64') {
        try {
            native = require('@koromix/koffi-android-arm64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'android-x64') {
        try {
            native = require('@koromix/koffi-android-x64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'linux-ppc64') {
        try {
            native = require('@koromix/koffi-linux-ppc64');
        } catch (err) {
            // Go on
        }
    }

    if (pkg == 'openbsd-arm64') {
        try {
            native = require('@koromix/koffi-openbsd-arm64');
        } catch (err) {
            // Go on
        }
    }

    return native;
}

export { loadStatic }
