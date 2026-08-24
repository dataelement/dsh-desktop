import { Window } from 'happy-dom'
import { describe, expect, it, vi } from 'vitest'
import { SidebarUpdateControl } from '../src/preload/sidebar-update-control'

function fixture(): Document {
  const window = new Window()
  window.document.body.innerHTML = `
    <aside data-dsh-sidebar-root>
      <footer data-dsh-sidebar-footer><button id="settings">设置</button></footer>
    </aside>`
  return window.document as unknown as Document
}

function currentHarnessFixture(): Document {
  const window = new Window()
  window.document.body.innerHTML = `
    <aside data-dsh-sidebar-root>
      <div class="hHd-Xa_footArea">
        <div class="hHd-Xa_footerActions">
          <div data-slot="sidebar.footer.action" style="display: contents"></div>
        </div>
        <div class="hHd-Xa_settingsArea">
          <div data-slot="sidebar.settings" style="display: contents">
            <button id="settings">设置</button>
          </div>
        </div>
      </div>
    </aside>`
  return window.document as unknown as Document
}

function actions() {
  return {
    download: vi.fn(),
    install: vi.fn(),
    retry: vi.fn()
  }
}

describe('Sherlock sidebar update control', () => {
  it('mounts one hidden control at the end of the sidebar footer', () => {
    const document = fixture()
    const control = new SidebarUpdateControl(document, 'zh', actions())

    expect(control.mount()).toBe(true)
    expect(control.mount()).toBe(true)

    const footer = document.querySelector('[data-dsh-sidebar-footer]')!
    const button = footer.lastElementChild as HTMLButtonElement
    expect(button.id).toBe('sherlock-sidebar-update-button')
    expect(button.hidden).toBe(true)
    expect(document.querySelectorAll('#sherlock-sidebar-update-button')).toHaveLength(1)
    expect(footer.firstElementChild?.id).toBe('settings')
  })

  it('mounts beside Settings in the current Harness sidebar structure', () => {
    const document = currentHarnessFixture()
    const control = new SidebarUpdateControl(document, 'zh', actions())

    expect(control.mount()).toBe(true)

    const settingsArea = document.querySelector('.hHd-Xa_settingsArea')!
    const button = settingsArea.lastElementChild as HTMLButtonElement
    expect(settingsArea.hasAttribute('data-sherlock-update-footer')).toBe(true)
    expect(button.id).toBe('sherlock-sidebar-update-button')
    expect(settingsArea.querySelector('#settings')).not.toBeNull()
  })

  it('centers a compact update control on the Harness Settings row', () => {
    const document = currentHarnessFixture()
    const control = new SidebarUpdateControl(document, 'zh', actions())

    control.mount()

    const styles = document.querySelector<HTMLStyleElement>(
      '#sherlock-sidebar-update-style'
    )!.textContent
    expect(styles).toMatch(
      /#sherlock-sidebar-update-button\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*position:\s*absolute;[^}]*right:\s*0;[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\);/s
    )
    expect(styles).toMatch(
      /#sherlock-sidebar-update-button\s*\{[^}]*box-shadow:\s*none;/s
    )
  })

  it('shows the blue download action only for an available update', () => {
    const document = fixture()
    const callbacks = actions()
    const control = new SidebarUpdateControl(document, 'zh', callbacks)
    control.mount()

    control.render({
      phase: 'available',
      currentVersion: '0.5.0',
      availableVersion: '0.6.0',
      manual: false
    })

    const button = document.querySelector<HTMLButtonElement>(
      '#sherlock-sidebar-update-button'
    )!
    expect(button.hidden).toBe(false)
    expect(button.dataset.action).toBe('download')
    expect(button.getAttribute('aria-label')).toBe('下载 Sherlock 0.6.0 更新')
    button.click()
    expect(callbacks.download).toHaveBeenCalledOnce()
  })

  it('renders determinate download progress on the same control', () => {
    const document = fixture()
    const control = new SidebarUpdateControl(document, 'zh', actions())
    control.mount()

    control.render({
      phase: 'downloading',
      currentVersion: '0.5.0',
      availableVersion: '0.6.0',
      percent: 42.6,
      manual: false
    })

    const button = document.querySelector<HTMLButtonElement>(
      '#sherlock-sidebar-update-button'
    )!
    expect(button.dataset.action).toBe('progress')
    expect(button.getAttribute('role')).toBe('progressbar')
    expect(button.getAttribute('aria-valuenow')).toBe('43')
    expect(button.disabled).toBe(true)
  })

  it('asks before restarting to install a downloaded update', () => {
    const document = fixture()
    const callbacks = actions()
    const control = new SidebarUpdateControl(document, 'zh', callbacks)
    control.mount()

    control.render({
      phase: 'downloaded',
      currentVersion: '0.5.0',
      availableVersion: '0.6.0',
      manual: false
    })

    const button = document.querySelector<HTMLButtonElement>(
      '#sherlock-sidebar-update-button'
    )!
    expect(button.innerHTML).toContain('M12 3v11')
    button.click()
    const panel = document.querySelector<HTMLElement>('#sherlock-sidebar-update-panel')!
    expect(panel.hidden).toBe(false)
    expect(panel.textContent).toContain('Sherlock 0.6.0 已下载完成')

    panel.querySelector<HTMLButtonElement>('[data-update-confirm]')!.click()
    expect(callbacks.install).toHaveBeenCalledOnce()
  })

  it('remounts after Harness replaces the sidebar footer', () => {
    const document = fixture()
    const control = new SidebarUpdateControl(document, 'zh', actions())
    control.mount()
    control.render({
      phase: 'available',
      currentVersion: '0.5.0',
      availableVersion: '0.6.0',
      manual: false
    })

    document.querySelector('[data-dsh-sidebar-root]')!.innerHTML = `
      <footer data-dsh-sidebar-footer><button id="new-settings">设置</button></footer>`

    expect(control.mount()).toBe(true)
    const button = document.querySelector<HTMLButtonElement>(
      '#sherlock-sidebar-update-button'
    )!
    expect(button.hidden).toBe(false)
    expect(button.dataset.action).toBe('download')
  })
})
