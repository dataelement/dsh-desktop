/** Desktop transport expected by the upstream ui-sidebar-browser Electron provider. */
export const SIDEBAR_BROWSER_IPC = {
  acquire: 'sidebar-browser:acquire',
  release: 'sidebar-browser:release',
  openRequested: 'sidebar-browser:open-requested'
} as const

export interface SidebarBrowserReservation {
  lease: string
  partition: string
}

export interface SidebarBrowserBridge {
  acquire(workspace: string): Promise<SidebarBrowserReservation>
  release(lease: string): Promise<void>
  onOpenRequested(lease: string, listener: (url: string) => void): () => void
}
