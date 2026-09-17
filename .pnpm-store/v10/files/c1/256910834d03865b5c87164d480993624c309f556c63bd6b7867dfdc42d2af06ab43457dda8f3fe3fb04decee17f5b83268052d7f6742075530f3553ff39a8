# Bugs and feature requests

Use the official repository for bugs, ideas and features requests: https://github.com/Koromix/koffi

Please note that the source code is not in this repository, instead it lives in a monorepo: https://codeberg.org/Koromix/rygel/ (in the *src/koffi* subdirectory).

# Build from source

We provide prebuilt binaries, packaged in NPM packages, so in most cases it should be as simple as `npm install koffi`. If you want to hack Koffi or use a specific platform, follow the instructions below.

Start by cloning the repository with [Git](https://git-scm.com/):

```sh
git clone https://codeberg.org/Koromix/rygel
cd rygel
```

As said before, this is a monorepository containg multiple projects, hence the name.

## Windows

First, make sure the following dependencies are met:

- The "Desktop development with C++" workload from [Visual Studio 2022 or 2019](https://visualstudio.microsoft.com/downloads/) or the "C++ build tools" workload from the [Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022), with the default optional components.
- [CMake meta build system](https://cmake.org/)
- [Node.js](https://nodejs.org/) 16 or later

Once this is done, run this command from the _src/koffi_ directory:

```sh
cd src/koffi
node ../cnoke/cnoke.js
```

> [!NOTE]
> Use `node ../cnoke/cnoke.js --debug` to make debug builds

## Other platforms

Make sure the following dependencies are met:

- `gcc` and `g++` >= 8.3 or newer
- GNU Make 3.81 or newer
- [CMake meta build system](https://cmake.org/)
- [Node.js](https://nodejs.org/) 16 or later

Once this is done, run this command from the _src/koffi_ directory:

```sh
cd src/koffi
node ../cnoke/cnoke.js
```

> [!NOTE]
> Use `node ../cnoke/cnoke.js --debug` to make debug builds

# Run tests

## On your machine

Once Koffi is built, you can build the tests and run them with the following commands:

```sh
cd src/koffi/test
node ../../cnoke/cnoke.js # Build C test code
node test.js
```

## On virtual machines

Koffi is tested on multiple architectures using emulated (accelerated when possible) QEMU machines. First, you need to install qemu packages, such as `qemu-system` (or even `qemu-system-gui`) on Ubuntu.

The Linux machines are based on Debian, they are not included in the repository but they can be created at any time with the scripts in `tools/cross/build`. For example, to create the Debian ARM64 machine, use the following commands:

```sh
cd tools/cross/build
./debian_arm64/build.sh
```

The other machines (Alpine, FreeBSD, OpenBSD, macOS and Windows) are created manually, at least for now. These machines are not included directly in this repository (for license and size reasons), but they are available here: https://download.koromix.dev/qemu/

For example, if you want to build and test for Windows, run the following commands:

```sh
cd tools/cross/
wget -q -O- https://download.koromix.dev/qemu/qemu_windows_x64.tar.zst | zstd -d | tar xv
```

Note that the machine disk content may change each time the machine runs, so the checksum test will fail once a machine has been used at least once.

And now you can run the tests with:

```sh
cd src/koffi

node tools/brew.js test # Several options are available, use --help
```

And be patient, this can be pretty slow for emulated machines. The Linux machines have and use ccache to build Koffi, so subsequent build steps will get much more tolerable.

Machines are started for each test if needed, and stay active until you stop them. You can start and stop them at any time with the following commands:

```sh
node tools/brew.js start # Start all available machines
node tools/brew.js stop # Stop everything
```

You can also restrict these commands to a subset of machines:

```sh
# Full test cycle
node tools/brew.js test debian_x64 debian_i386

# Separate start, test, shutdown
node tools/brew.js start debian_x64 debian_i386
node tools/brew.js test debian_x64 debian_i386
node tools/brew.js stop
```

Finally, you can join a running machine with SSH with the following shortcut, if you need to do some debugging or any other manual procedure:

```sh
node tools/brew.js ssh debian_i386
```

Each machine is configured to run a VNC server or SPICE, which you can use to access the display, using KRDC or any other compatible viewer. Use the `info` command to get the VNC or the SPICE port.

```sh
node tools/brew.js info debian_x64
```

# Making a release

First, you must update the code in four steps:

- Change the version number in `package.json`
- Add an entry to `CHANGELOG` to summarize the changes since last release
- Commit theses changes with the message *Bump Koffi to X.Y.Z*
- Create a signed tag on this commit with `git tag -s koffi/X.Y.Z -m 'Koffi X.Y.Z'`

Once this is done, you can publish a new release with the following commands:

```sh
cd src/koffi

node tools/brew.js test # If not done before
node tools/brew.js build

cd ../../bin/Koffi/packages

./prepare.sh
./publish.sh
```

Some platforms are emulated so this can take a few minutes until the pre-built binaries are ready. You might want to go grab a cup of coffee :)

# Code style

Koffi is programmed in a mix of C++ and assembly code (architecture-specific code). It uses [node-addon-api](https://github.com/nodejs/node-addon-api) (C++ N-API wrapper) to interact with Node.js.

My personal preference goes to a rather C-like C++ style, with careful use of templates (mainly for containers) and little object-oriented programming. I strongly prefer tagged unions and code locality over inheritance and virtual methods. Exceptions are disabled.

Find more information about code style in the [monorepository README](https://codeberg.org/Koromix/rygel/#c-flavor) file.
