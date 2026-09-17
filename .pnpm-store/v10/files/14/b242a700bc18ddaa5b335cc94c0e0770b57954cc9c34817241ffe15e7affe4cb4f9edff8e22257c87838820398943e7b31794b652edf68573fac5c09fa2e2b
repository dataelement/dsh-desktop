# node-pty

[![Build Status](https://dev.azure.com/vscode/node-pty/_apis/build/status/Microsoft.node-pty?branchName=main)](https://dev.azure.com/vscode/node-pty/_build/latest?definitionId=11&branchName=main)

`forkpty(3)` bindings for node.js. This allows you to fork processes with pseudoterminal file descriptors. It returns a terminal object which allows reads and writes.

This is useful for:

- Writing a terminal emulator (eg. via [xterm.js](https://github.com/sourcelair/xterm.js)).
- Getting certain programs to *think* you're a terminal, such as when you need a program to send you control sequences.

`node-pty` supports Linux, macOS and Windows. Windows support is possible by utilizing the [Windows conpty API](https://blogs.msdn.microsoft.com/commandline/2018/08/02/windows-command-line-introducing-the-windows-pseudo-console-conpty/) on Windows 1809+.

> **Note:** Support for the `winpty` library has been removed. Windows 10 version 1809 (build 18309) or later is now required.

## API

The full API for node-pty is contained within the [TypeScript declaration file](https://github.com/microsoft/node-pty/blob/main/typings/node-pty.d.ts), use the branch/tag picker in GitHub (`w`) to navigate to the correct version of the API.

## Example Usage

```js
import * as os from 'node:os';
import * as pty from 'node-pty';

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

ptyProcess.onData((data) => {
  process.stdout.write(data);
});

ptyProcess.write('ls\r');
ptyProcess.resize(100, 40);
ptyProcess.write('ls\r');
```

## Real-world Uses

`node-pty` powers many different terminal emulators, including:

- [Microsoft Visual Studio Code](https://code.visualstudio.com)
- [Hyper](https://hyper.is/)
- [Upterm](https://github.com/railsware/upterm)
- [Script Runner](https://github.com/ioquatix/script-runner) for Atom.
- [Theia](https://github.com/theia-ide/theia)
- [FreeMAN](https://github.com/matthew-matvei/freeman) file manager
- [terminus](https://atom.io/packages/terminus) - An Atom plugin for providing terminals inside your Atom workspace.
- [x-terminal](https://atom.io/packages/x-terminal) - Also an Atom plugin that provides terminals inside your Atom workspace.
- [Termination](https://atom.io/packages/termination) - Also an Atom plugin that provides terminals inside your Atom workspace.
- [atom-xterm](https://atom.io/packages/atom-xterm) - Also an Atom plugin that provides terminals inside your Atom workspace.
- [electerm](https://github.com/electerm/electerm) Terminal/SSH/SFTP client(Linux, macOS, Windows).
- [Extraterm](http://extraterm.org/)
- [Wetty](https://github.com/krishnasrinivas/wetty) Browser based Terminal over HTTP and HTTPS
- [nomad](https://github.com/lukebarnard1/nomad-term)
- [DockerStacks](https://github.com/sfx101/docker-stacks) Local LAMP/LEMP stack using Docker
- [TeleType](https://github.com/akshaykmr/TeleType): cli tool that allows you to share your terminal online conveniently. Show off mad cli-fu, help a colleague, teach, or troubleshoot.
- [mesos-term](https://github.com/criteo/mesos-term): A web terminal for Apache Mesos. It allows to execute commands within containers.
- [Commas](https://github.com/CyanSalt/commas): A hackable terminal and command runner.
- [ENiGMA½ BBS Software](https://github.com/NuSkooler/enigma-bbs): A modern BBS software with a nostalgic flair!
- [Tinkerun](https://github.com/tinkerun/tinkerun): A new way of running Tinker.
- [Tess](https://tessapp.dev): Hackable, simple and rapid terminal for the new era of technology 👍
- [NxShell](https://nxshell.github.io/): An easy to use new terminal for Windows/Linux/MacOS platform.
- [OpenSumi](https://github.com/opensumi/core): A framework helps you quickly build Cloud or Desktop IDE products.
- [Enjoy Git](https://github.com/huangcs427/enjoy-git-release): A modern Git client featuring an intuitive user interface, built with Electron, Vue 3, and TypeScript.
- [Logos](https://github.com/zixiao-labs/logos): A Modern, Lightweight Code Editor, built with Electron, Vue 3, and TypeScript.

Do you use node-pty in your application as well? Please open a [Pull Request](https://github.com/Tyriar/node-pty/pulls) to include it here. We would love to have it in our list.

## Building

```bash
# Install dependencies and build C++
npm install
# Compile TypeScript -> JavaScript
npm run build
```

## Dependencies

Node.JS 16 or Electron 19 is required to use `node-pty`. What version of node is supported is currently mostly bound to [whatever version Visual Studio Code is using](https://github.com/microsoft/node-pty/issues/557#issuecomment-1332193541).

### Linux (apt)

```sh
sudo apt install -y make python build-essential
```

### macOS

Xcode is needed to compile the sources, this can be installed from the App Store.

### Windows

`npm install` requires some tools to be present in the system like Python and C++ compiler. Windows users can easily install them by running the following command in PowerShell as administrator. For more information see https://github.com/felixrieseberg/windows-build-tools:

```sh
npm install --global --production windows-build-tools
```

The following are also needed:

- [Windows SDK](https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk) - only the "Desktop C++ Apps" components are needed to be installed
- Spectre-mitigated libraries - In order to avoid the build error "MSB8040: Spectre-mitigated libraries are required for this project", open the Visual Studio Installer, press the Modify button, navigate to the "Individual components" tab, search "Spectre", and install an option like "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)" (the exact option to install will depend on your version of Visual Studio as well as your operating system architecture)

## Debugging

[The wiki](https://github.com/Microsoft/node-pty/wiki/Debugging) contains instructions for debugging node-pty.

## Security

All processes launched from node-pty will launch at the same permission level of the parent process. Take care particularly when using node-pty inside a server that's accessible on the internet. We recommend launching the pty inside a container to protect your host machine.

## Thread Safety

Note that node-pty is not thread safe so running it across multiple worker threads in node.js could cause issues.

## Flow Control

Automatic flow control can be enabled by either providing `handleFlowControl = true` in the constructor options or setting it later on:

```js
const PAUSE = '\x13';   // XOFF
const RESUME = '\x11';  // XON

const ptyProcess = pty.spawn(shell, [], {handleFlowControl: true});

// flow control in action
ptyProcess.write(PAUSE);  // pty will block and pause the child program
...
ptyProcess.write(RESUME); // pty will enter flow mode and resume the child program

// temporarily disable/re-enable flow control
ptyProcess.handleFlowControl = false;
...
ptyProcess.handleFlowControl = true;
```

By default `PAUSE` and `RESUME` are XON/XOFF control codes (as shown above). To avoid conflicts in environments that use these control codes for different purposes the messages can be customized as `flowControlPause: string` and `flowControlResume: string` in the constructor options. `PAUSE` and `RESUME` are not passed to the underlying pseudoterminal if flow control is enabled.

## Troubleshooting

### Powershell gives error 8009001d

> Internal Windows PowerShell error.  Loading managed Windows PowerShell failed with error 8009001d.

This happens when PowerShell is launched with no `SystemRoot` environment variable present.

## pty.js

This project is forked from [chjj/pty.js](https://github.com/chjj/pty.js) with the primary goals being to provide better support for later Node.js versions and Windows.

## License

Copyright (c) 2012-2015, Christopher Jeffrey (MIT License).<br>
Copyright (c) 2016, Daniel Imms (MIT License).<br>
Copyright (c) 2018, Microsoft Corporation (MIT License).
