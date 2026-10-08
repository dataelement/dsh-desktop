# Workbench development: six-step quickstart

Version: 2026-09-29 · For full rules, see the [Workbench Development Standard](https://dshdesktop.com/workbench/docs/development-en/); for listing, see the [Workbench Market Acceptance Standard](https://dshdesktop.com/workbench/docs/market-acceptance-en/).

1. **Confirm requirements**: From the user's current request and confirmed context, identify the business scenario, target users, and core steps to complete one task. Generic development instructions, a directory name, and existing code do not establish the user's intent. If any item is missing, ask one combined question and wait before designing business features.
2. **Inspect the project**: Check `pwd`, directory contents, `git status --short` if this is a Git repository, existing scripts, package manager, and Desktop version. Preserve uncommitted changes.
3. **Define the smallest business flow**: Identify the entry point, primary action, completion state, and failure recovery before choosing a panel and host capabilities.
4. **Implement**: Build the plugin package and business panel under Section 3 of the development standard. Follow Sections 4–7 for the session, workspace, and UI capabilities actually used.
5. **Verify the package**: Run `pnpm pack`. Confirm the `.tgz` contains the declared server and client entries and `cordis.patch.yml`, and excludes credentials and user data.
6. **Install and test locally**: Under Section 3.6, check which local installation method the current Desktop supports, install the package, and restart Harness. Open it from “Installed workbenches” and the sidebar, then record actual results under Section 8. If installation is unavailable, deliver the verified package and list every untested item.

**Empty-directory example**: The user only pasted Desktop's generic development instructions; the directory is empty and there is no business goal. The agent's next step is one combined question: “Who is this workbench for, what business scenario should it address, and what are the core steps from entry to task completion?” While waiting, the agent may run `pwd`, `ls`, `git status`, or check the Desktop version. Until the user answers, do not create `package.json`, business code, or UI, and do not build, install, or submit anything.
