export interface GitCommandResult {
  status: number
  stdout: string
  stderr: string
}

export interface RepositoryContext {
  worktreeRoot: string
  gitDirectory: string
  commonDirectory: string
  branch: string | null
  head: string
  linkedWorktree: boolean
}

export interface RepositoryStatus {
  trackedChanges: string[]
  untrackedSources: string[]
  untrackedOutputs: string[]
  sourceClean: boolean
}

export interface RegisteredWorktree {
  path: string
  head: string
  branch: string | null
  locked: boolean
  prunable: boolean
}

export interface RangeCommit {
  commit: string
  parents: string[]
  subject: string
}

export interface NameStatusChange {
  status: string
  path: string
  previousPath?: string
}

export function runGit(repository: string, args: readonly string[], options?: { allowFailure?: boolean }): GitCommandResult
export function resolveRepositoryContext(repository: string): RepositoryContext
export function readRepositoryStatus(repository: string): RepositoryStatus
export function listRegisteredWorktrees(repository: string): RegisteredWorktree[]
export function resolveCommit(repository: string, revision: string): string
export function isAncestor(repository: string, ancestor: string, descendant: string): boolean
export function listRangeCommits(repository: string, base: string, tip: string): RangeCommit[]
export function diffNameStatus(repository: string, base: string, tip: string): NameStatusChange[]
