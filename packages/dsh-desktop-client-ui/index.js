/**
 * Host half for the browser-only DSH Desktop UI occupants.
 *
 * The hero composer only gets a live editor, paperclip, and drop target after
 * a Session exists, and a Session is created when a Workspace is opened.
 * First-run Desktop has no registered Workspace, so the input used to stay
 * locked. Seed the Harness cwd (the Desktop launch-root) as that Workspace;
 * create is idempotent by path.
 */
export const name = 'dsh-desktop-client-ui'

export const inject = ['workspaceController']

export async function ensureDefaultWorkspace(workspaceController, directoryPath) {
  return workspaceController.create({ path: directoryPath })
}

export async function apply(ctx) {
  try {
    await ensureDefaultWorkspace(ctx.workspaceController, process.cwd())
  } catch (error) {
    console.warn('dsh-desktop-client-ui: default workspace seed failed:', error)
  }
}
