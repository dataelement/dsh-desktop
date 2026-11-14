const { withSherpaOverlay } = require('./scripts/release/sherpa-linux-overlay.cjs')
module.exports = withSherpaOverlay(require('./electron-builder.dev.cjs'))
