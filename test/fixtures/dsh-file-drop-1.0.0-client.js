// dsh-file-drop · Client half（DSH web __ModuleLoader__ 格式）
// 两个入口共用同一套处理逻辑（壳直取原始路径 → uri-list → 上传兜底）：
// 1. 回形针按钮（conversation.input.left）：点击弹文件选择器
// 2. 拖拽（window 捕获阶段拦截，先于 DSH 自带图片拖拽处理）：
//    - 桌面壳 preload 已解析路径 → 直接取
//    - DataTransfer 自带路径（uri-list）→ 直接取
//    - 普通文件 → POST /api/dsh-file-drop 上传到工作区
window.__ModuleLoader__.load({
  id: 'dsh-file-drop',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    const TEXT_EXT = new Set([
      'md', 'markdown', 'txt', 'text', 'json', 'csv', 'tsv', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
      'py', 'pyw', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log', 'xml', 'html', 'htm', 'css',
      'scss', 'sass', 'less', 'sh', 'bash', 'zsh', 'fish', 'sql', 'go', 'rs', 'java', 'kt', 'kts',
      'c', 'h', 'cpp', 'hpp', 'cc', 'hh', 'rb', 'php', 'lua', 'r', 'swift', 'vue', 'svelte', 'env',
      'properties', 'gitignore', 'dockerfile', 'makefile', 'gradle', 'lock',
    ])
    const TEXT_MIME = new Set([
      'application/json', 'application/xml', 'application/javascript', 'application/x-yaml',
      'application/sql', 'application/x-sh', 'application/x-httpd-php', 'application/ecmascript',
    ])
    const MAX_BYTES = 25 * 1024 * 1024
    const API_PATH = '/api/dsh-file-drop'

    // ---- 文件识别与读取 ----

    function looksText(file) {
      if (file.type && file.type.startsWith('text/')) return true
      if (file.type && TEXT_MIME.has(file.type)) return true
      const dot = file.name.lastIndexOf('.')
      if (dot < 0) return false
      return TEXT_EXT.has(file.name.slice(dot + 1).toLowerCase())
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
        reader.onload = () => {
          try {
            const bytes = new Uint8Array(reader.result)
            let bin = ''
            const CHUNK = 0x8000
            for (let i = 0; i < bytes.length; i += CHUNK) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
            }
            resolve(btoa(bin))
          } catch (e) { reject(e) }
        }
        reader.readAsArrayBuffer(file)
      })
    }

    // ---- 桌面壳 ----

    // 拖拽场景：preload 在捕获阶段已用 webUtils.getPathForFile 解析好路径
    function drainShellPaths() {
      try {
        if (typeof window === 'undefined' || !window.dshDesktop) return []
        if (typeof window.dshDesktop.drainDroppedPaths === 'function') {
          const p = window.dshDesktop.drainDroppedPaths()
          return Array.isArray(p) ? p : []
        }
      } catch { /* 忽略 */ }
      return []
    }

    // 按钮/兜底场景：直接映射单个 File（preload 暴露的备用 API）
    function shellPathOf(file) {
      try {
        if (typeof window === 'undefined' || !window.dshDesktop) return null
        if (typeof window.dshDesktop.getPathForFile === 'function') {
          const p = window.dshDesktop.getPathForFile(file)
          return (typeof p === 'string' && p.length > 0) ? p : null
        }
      } catch { /* 忽略 */ }
      return null
    }

    // 拖拽自带路径（Obsidian / 文件管理器拖拽常带 uri-list）
    function extractPaths(e) {
      const paths = []
      try {
        const uris = (e.dataTransfer.getData('text/uri-list') || '').split('\n')
        for (const line of uris) {
          const t = line.trim()
          if (!t || t.startsWith('#')) continue
          if (t.startsWith('file://')) {
            try {
              paths.push(decodeURIComponent(t.slice('file://'.length).replace(/^localhost/, '')))
            } catch { paths.push(t.slice(7)) }
          } else if (t.startsWith('/')) {
            paths.push(t)
          }
        }
      } catch { /* 某些浏览器/事件阶段读不了，忽略 */ }
      if (paths.length === 0) {
        try {
          const plain = (e.dataTransfer.getData('text/plain') || '').trim()
          if (plain && (plain.startsWith('/') || /^[A-Za-z]:[\\/]/.test(plain)) && !plain.includes('\n')) {
            paths.push(plain)
          }
        } catch { /* 忽略 */ }
      }
      return paths
    }

    // ---- 共享状态（按钮上传与拖拽共用一个状态条） ----

    const statusStore = {
      value: null,
      listeners: new Set(),
      timer: null,
      set(text) {
        this.value = text
        for (const l of [...this.listeners]) l()
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.value = null
          for (const l of [...this.listeners]) l()
        }, 3500)
      },
      subscribe(fn) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
      },
    }

    function useStatus() {
      const [value, setValue] = React.useState(statusStore.value)
      React.useEffect(() => statusStore.subscribe(() => setValue(statusStore.value)), [])
      return value
    }

    function appendToDraft(inputActions, draft, paths) {
      if (!inputActions) return
      const lines = paths.map((p) => '📎 文件：`' + p + '`')
      const nl = draft === '' ? '' : '\n'
      inputActions.setDraft(draft + nl + lines.join('\n'))
    }

    // 共用处理：壳路径优先，其余走上传兜底
    async function processFiles(files, opts) {
      if (!files.length) return
      const { sessionId, inputActions, getDraft } = opts
      const direct = []
      const rest = []
      for (const f of files) {
        const p = shellPathOf(f)
        if (p) direct.push(p)
        else rest.push(f)
      }
      if (direct.length > 0) {
        appendToDraft(inputActions, getDraft(), direct)
        statusStore.set('✓ 已获取 ' + direct.length + ' 个原始路径（桌面壳）')
      }
      if (rest.length === 0) return

      statusStore.set('正在上传 ' + rest.length + ' 个文件…')
      const ok = []
      const errs = []
      for (const f of rest) {
        if (f.size > MAX_BYTES) { errs.push(f.name + '（超过 25MB 限制）'); continue }
        try {
          const payload = looksText(f)
            ? { kind: 'text', content: await f.text() }
            : { kind: 'binary', base64: await fileToBase64(f) }
          const response = await fetch(API_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              name: f.name,
              size: f.size,
              type: f.type || '',
              ...payload,
            }),
          })
          const data = await response.json().catch(() => ({}))
          if (response.ok && data.path) ok.push(data.path)
          else errs.push(f.name + '：' + (data.error || '保存失败'))
        } catch (err) {
          errs.push(f.name + '：' + String((err && err.message) || err))
        }
      }
      if (ok.length > 0) appendToDraft(inputActions, getDraft(), ok)
      const text = [
        ok.length > 0 ? '✓ ' + ok.length + ' 个文件已上传' : '',
        errs.length > 0 ? '✗ ' + errs.join('；') : '',
      ].filter(Boolean).join('　')
      statusStore.set(text || '没有文件被处理')
    }

    // ---- 组件 ----

    // 输入框工具行：回形针按钮（点开文件选择器）
    function PaperclipButton(props) {
      const pickRef = React.useRef(null)
      const optsRef = React.useRef({})
      optsRef.current = {
        sessionId: props.sessionId,
        inputActions: props.inputActions,
        getDraft: () => (props.input && props.input.draft) || '',
      }
      const onClick = () => { if (pickRef.current) pickRef.current.click() }
      const onChange = (e) => {
        const files = Array.from(e.target.files || [])
        e.target.value = ''
        if (files.length > 0) void processFiles(files, optsRef.current)
      }
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'dsh-paperclip-wrap' },
          React.createElement('button', {
            type: 'button',
            className: 'dsh-paperclip',
            'aria-label': '上传文件',
            onClick: onClick,
          },
            React.createElement('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', 'aria-hidden': true },
              React.createElement('path', {
                d: 'M5.5498 9.75V5H6.9502V9.75C6.9502 10.3299 7.4201 10.7998 8 10.7998C8.5799 10.7998 9.0498 10.3299 9.0498 9.75V4.5C9.0498 2.9536 7.7964 1.7002 6.25 1.7002C4.7036 1.7002 3.4502 2.9536 3.4502 4.5V9.75C3.4502 12.2629 5.4871 14.2998 8 14.2998C10.5129 14.2998 12.5498 12.2629 12.5498 9.75V4H13.9502V9.75C13.9502 13.0361 11.2861 15.7002 8 15.7002C4.71391 15.7002 2.0498 13.0361 2.0498 9.75V4.5C2.04981 2.1804 3.9304 0.299806 6.25 0.299805C8.5696 0.299805 10.4502 2.1804 10.4502 4.5V9.75C10.4502 11.1031 9.3531 12.2002 8 12.2002C6.6469 12.2002 5.5498 11.1031 5.5498 9.75Z',
                fill: 'currentColor',
              })
            )
          ),
          React.createElement('div', { className: 'dsh-paperclip-tip' },
            '点击选择文件 · 也可把文件拖到窗口任意位置'
          )
        ),
        React.createElement('input', {
          ref: pickRef,
          type: 'file',
          multiple: true,
          style: { display: 'none' },
          onChange: onChange,
        })
      )
    }

    // 输入框上方 dock：拖拽监听 + 浮层 + 状态条
    function DropZone(props) {
      const [drag, setDrag] = React.useState(false)
      const statusText = useStatus()
      const depthRef = React.useRef(0)
      const busyRef = React.useRef(false)
      const optsRef = React.useRef({})
      optsRef.current = {
        sessionId: props.sessionId,
        inputActions: props.inputActions,
        getDraft: () => (props.input && props.input.draft) || '',
      }

      React.useEffect(() => {
        // 全部挂在 window 捕获阶段：事件流的第一个节点，先于 DSH 自带的
        // document 级拖拽图片处理（InputBar intakeImages / DropOverlay）。
        const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
        const onDragEnter = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          depthRef.current += 1
          setDrag(true)
        }
        const onDragOver = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        }
        const onDragLeave = (e) => {
          e.stopPropagation()
          depthRef.current -= 1
          if (depthRef.current <= 0) { depthRef.current = 0; setDrag(false) }
        }
        const onDrop = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          depthRef.current = 0
          setDrag(false)
          void handleDrop(e)
        }
        window.addEventListener('dragenter', onDragEnter, true)
        window.addEventListener('dragover', onDragOver, true)
        window.addEventListener('dragleave', onDragLeave, true)
        window.addEventListener('drop', onDrop, true)
        return () => {
          window.removeEventListener('dragenter', onDragEnter, true)
          window.removeEventListener('dragover', onDragOver, true)
          window.removeEventListener('dragleave', onDragLeave, true)
          window.removeEventListener('drop', onDrop, true)
        }
      }, [])

      async function handleDrop(e) {
        if (busyRef.current) return
        const files = Array.from((e.dataTransfer && e.dataTransfer.files) || [])

        // 桌面壳（preload 捕获阶段已解析好磁盘原始路径）
        const shellPaths = drainShellPaths()
        if (shellPaths.length > 0) {
          appendToDraft(optsRef.current.inputActions, optsRef.current.getDraft(), shellPaths)
          statusStore.set('✓ 已获取 ' + shellPaths.length + ' 个原始路径（桌面壳）')
          return
        }

        // 拖拽自带路径 → 直接取地址，零上传
        const paths = extractPaths(e)
        if (paths.length > 0) {
          appendToDraft(optsRef.current.inputActions, optsRef.current.getDraft(), paths)
          statusStore.set('✓ 已获取 ' + paths.length + ' 个文件路径')
          return
        }

        // 普通文件 → 上传兜底
        if (files.length === 0) return
        busyRef.current = true
        try {
          await processFiles(files, optsRef.current)
        } finally {
          busyRef.current = false
        }
      }

      return React.createElement(React.Fragment, null,
        statusText ? React.createElement('div', { className: 'dsh-drop-status' }, statusText) : null,
        drag ? React.createElement('div', { className: 'dsh-drop-overlay' },
          React.createElement('div', { className: 'dsh-drop-overlay-inner' }, '松开鼠标，获取文件')
        ) : null
      )
    }

    const CSS = `
      .dsh-paperclip-wrap {
        position: relative;
        display: inline-flex;
      }
      .dsh-paperclip-wrap .dsh-paperclip-tip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 50;
        white-space: nowrap;
        font-size: 12px;
        line-height: 1.4;
        color: #dce1e8;
        background: rgba(20, 22, 28, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 6px 10px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
        opacity: 0;
        pointer-events: none;
      }
      /* 每次 hover 都重新播放：淡入 → 停留 → 自动淡出 */
      .dsh-paperclip-wrap:hover .dsh-paperclip-tip {
        animation: dshTipCycle 1.5s ease forwards;
      }
      @keyframes dshTipCycle {
        0% { opacity: 0; }
        10% { opacity: 1; }
        85% { opacity: 1; }
        100% { opacity: 0; }
      }
      .dsh-paperclip {
        display: grid; place-items: center; flex: none;
        width: 28px; height: 28px;
        border: none; border-radius: 999px;
        background: var(--dsw-specific-selector, rgba(128, 128, 128, 0.14));
        color: var(--dsw-alias-label-primary, inherit);
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .dsh-paperclip:hover:not(:disabled) {
        background: var(--dsw-alias-interactive-bg-hover-solid, rgba(128, 128, 128, 0.24));
      }
      .dsh-drop-status {
        position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%);
        z-index: 9998; pointer-events: none;
        max-width: 70vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        font-size: 12px; line-height: 1.5; color: #dce1e8;
        background: rgba(20, 22, 28, 0.85); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px; padding: 6px 14px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
        animation: dshDropStatusIn 0.18s ease-out;
      }
      @keyframes dshDropStatusIn {
        from { opacity: 0; transform: translateX(-50%) translateY(6px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .dsh-drop-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(24, 118, 255, 0.08);
        border: 2px dashed rgba(24, 118, 255, 0.7);
        display: flex; align-items: center; justify-content: center;
        pointer-events: none;
      }
      .dsh-drop-overlay-inner {
        background: #1876ff; color: #fff; border-radius: 10px;
        padding: 14px 28px; font-size: 15px; font-weight: 600;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
      }
    `

    const inject = ['slots']

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-file-drop'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-file-drop: styles')

      ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
        { name: 'conversation.input.left', id: 'file-drop-pick', order: 0 },
        (props) => React.createElement(PaperclipButton, props)
      ))

      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(
        { name: 'conversation.input.dock', id: 'file-drop', order: 30 },
        (props) => React.createElement(DropZone, props)
      ))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
