import AppKit
import Foundation

private let legacyBundleIdentifier = "io.dsh.desktop"
private let sherlockBundleIdentifier = "com.evanarts.sherlock"
private let embeddedRelativePath = "Contents/Resources/Sherlock.app"

private enum BridgeError: LocalizedError {
    case invalidBundle(String)
    case commandFailed(String, Int32)

    var errorDescription: String? {
        switch self {
        case .invalidBundle(let message):
            return message
        case .commandFailed(let command, let status):
            return "\(command) failed with status \(status)."
        }
    }
}

@discardableResult
private func run(_ executable: String, _ arguments: [String]) throws -> Int32 {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    try process.run()
    process.waitUntilExit()
    guard process.terminationStatus == 0 else {
        throw BridgeError.commandFailed(([executable] + arguments).joined(separator: " "), process.terminationStatus)
    }
    return process.terminationStatus
}

private func showFailure(_ error: Error) {
    let alert = NSAlert()
    alert.alertStyle = .critical
    alert.messageText = "Sherlock 更新未完成"
    alert.informativeText = "请重新打开 Sherlock 后再试。\n\n\(error.localizedDescription)"
    alert.addButton(withTitle: "好")
    alert.runModal()
}

private func migrateToNotarizedSherlock() throws {
    let fileManager = FileManager.default
    let currentApp = Bundle.main.bundleURL.standardizedFileURL
    guard Bundle.main.bundleIdentifier == legacyBundleIdentifier else {
        throw BridgeError.invalidBundle("Legacy bridge bundle identifier is invalid.")
    }

    let embeddedApp = currentApp.appendingPathComponent(embeddedRelativePath).standardizedFileURL
    guard
        let embeddedBundle = Bundle(url: embeddedApp),
        embeddedBundle.bundleIdentifier == sherlockBundleIdentifier
    else {
        throw BridgeError.invalidBundle("The notarized Sherlock application is missing.")
    }

    let parent = currentApp.deletingLastPathComponent()
    let token = UUID().uuidString
    let stagedApp = parent.appendingPathComponent(".Sherlock-migration-\(token).app")
    let backupApp = parent.appendingPathComponent(".Sherlock-legacy-\(token).app")

    try run("/usr/bin/ditto", [embeddedApp.path, stagedApp.path])
    try run("/usr/bin/codesign", ["--verify", "--deep", "--strict", stagedApp.path])

    do {
        try fileManager.moveItem(at: currentApp, to: backupApp)
        do {
            try fileManager.moveItem(at: stagedApp, to: currentApp)
        } catch {
            try? fileManager.moveItem(at: backupApp, to: currentApp)
            throw error
        }

        var openArguments = ["-na", currentApp.path]
        let forwardedArguments = ProcessInfo.processInfo.arguments.dropFirst().filter {
            $0.hasPrefix("--sherlock-") || $0.hasPrefix("--remote-debugging-port=")
        }
        if !forwardedArguments.isEmpty {
            openArguments.append("--args")
            openArguments.append(contentsOf: forwardedArguments)
        }

        do {
            try run("/usr/bin/open", openArguments)
        } catch {
            let failedApp = parent.appendingPathComponent(".Sherlock-failed-\(token).app")
            try? fileManager.moveItem(at: currentApp, to: failedApp)
            try? fileManager.moveItem(at: backupApp, to: currentApp)
            try? fileManager.removeItem(at: failedApp)
            throw error
        }

        let cleanup = Process()
        cleanup.executableURL = URL(fileURLWithPath: "/bin/sh")
        cleanup.arguments = [
            "-c",
            "sleep 8; /bin/rm -rf -- \"$1\"",
            "sherlock-bridge-cleanup",
            backupApp.path
        ]
        try cleanup.run()
    } catch {
        try? fileManager.removeItem(at: stagedApp)
        throw error
    }
}

do {
    try migrateToNotarizedSherlock()
    exit(EXIT_SUCCESS)
} catch {
    showFailure(error)
    exit(EXIT_FAILURE)
}
