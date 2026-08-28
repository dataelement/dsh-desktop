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

    const inject = ['slots']
    function apply(ctx) {
      installStyles()
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
