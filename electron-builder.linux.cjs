const { withSherpaOverlay } = require('./scripts/release/sherpa-linux-overlay.cjs')
module.exports = withSherpaOverlay(require('./package.json').build)
