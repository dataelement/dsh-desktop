window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, FishLogo } = require('@deepseek-ai/dsh-client-ui-primitives')

    const LIGHT_LOGO_URL = '/dsh-desktop-logo-light.png'
    const DARK_LOGO_URL = '/dsh-desktop-logo-dark.png'
    const STYLE_ID = 'dsh-desktop-client-ui-style'

    function installStyles() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = 'dsh-desktop-client-ui'
      style.textContent = `
        .dshDesktopBrandDark{display:none}
        body[data-ds-dark-theme] .dshDesktopBrandLight{display:none}
        body[data-ds-dark-theme] .dshDesktopBrandDark{display:block}
        .dshDesktopMobileButton{appearance:none;position:relative;width:32px;height:32px;color:var(--dsw-alias-label-secondary,#73777f);background:transparent;border:0;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
        .dshDesktopMobileButton:hover{color:var(--dsw-alias-label-primary,#202124);background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08))}
        .dshDesktopMobileButton:focus-visible{outline:2px solid #4d6bfe;outline-offset:1px}
        .dshDesktopMobileButtonDot{position:absolute;top:4px;right:4px;width:7px;height:7px;border:1.5px solid var(--dsw-specific-sidebar-fill,#fff);border-radius:50%;background:#4da66d}
      `
      document.head.appendChild(style)
    }

    function DesktopBrandMark() {
      const height = 17
      return React.createElement(
        'svg',
        {
          width: height * 1030 / 590,
          height,
          viewBox: '150 330 1030 590',
          fill: 'none',
          'aria-hidden': 'true'
        },
        React.createElement('image', {
          className: 'dshDesktopBrandLight',
          href: LIGHT_LOGO_URL,
          x: 150,
          y: 330,
          width: 1030,
          height: 590,
          preserveAspectRatio: 'xMidYMid meet'
        }),
        React.createElement('image', {
          className: 'dshDesktopBrandDark',
          href: DARK_LOGO_URL,
          x: 150,
          y: 330,
          width: 1030,
          height: 590,
          preserveAspectRatio: 'xMidYMid meet'
        })
      )
    }

    function DesktopBrandName() {
      return React.createElement(BrandWordmark, { includeMark: false })
    }

    function ConversationBrandMark(props) {
      return React.createElement(FishLogo, props)
    }

    function PhoneIcon() {
      return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', width: 19, height: 19, fill: 'none', 'aria-hidden': 'true' },
        React.createElement('rect', {
          x: 7,
          y: 2.75,
          width: 10,
          height: 18.5,
          rx: 2.25,
          stroke: 'currentColor',
          strokeWidth: 1.7
        }),
        React.createElement('path', {
          d: 'M10.2 5.5h3.6M10.5 18.35h3',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round'
        })
      )
    }

    function MobileButton({ wide }) {
      const [connected, setConnected] = React.useState(false)
      React.useEffect(() => {
        const bridge = globalThis.dshDesktop
        let mounted = true
        const status = bridge?.getMobileStatus?.()
        if (status) {
          void status.then((next) => {
            if (mounted) setConnected(next?.connected === true)
          }).catch(() => undefined)
        }
        const dispose = bridge?.onMobileStatusChanged?.((next) => {
          if (mounted) setConnected(next === true)
        })
        return () => {
          mounted = false
          if (typeof dispose === 'function') dispose()
        }
      }, [])

      if (!wide && !connected) return null
      const zh = navigator.language.toLowerCase().startsWith('zh')
      const label = connected
        ? zh ? '管理手机连接' : 'Manage phone connection'
        : zh ? '连接手机' : 'Connect phone'
      return React.createElement(
        'button',
        {
          type: 'button',
          className: 'dshDesktopMobileButton',
          title: label,
          'aria-label': label,
          onClick: () => {
            const opening = globalThis.dshDesktop?.openMobilePairing?.()
            if (opening) void opening.catch(() => undefined)
          }
        },
        React.createElement(PhoneIcon),
        connected
          ? React.createElement('span', {
              className: 'dshDesktopMobileButtonDot',
              'aria-hidden': 'true'
            })
          : null
      )
    }

    const inject = ['slots']
    function apply(ctx) {
      installStyles()
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', () =>
            ctx.slots.inject('sidebar.footer.action', function* () {
              yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
              yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
              yield ctx.slots.register(
                { name: 'conversation.hero.brand.mark' },
                ConversationBrandMark
              )
              yield ctx.slots.register(
                {
                  name: 'sidebar.footer.action',
                  id: 'dsh-desktop-mobile',
                  order: 20,
                  label: 'DSH Desktop mobile pairing'
                },
                MobileButton
              )
            })
          )
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
