const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'com.evanarts.sherlock',
  productName: 'Sherlock',
  artifactName: 'sherlock-${os}-${arch}.${ext}',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-notarized'
  },
  extraResources: [
    ...(packageJson.build.extraResources || []),
    {
      from: 'build/sherlock-plugin-profile',
      to: 'sherlock-plugin-profile'
    }
  ],
  extraMetadata: {
    name: 'sherlock',
    productName: 'Sherlock',
    dshDesktopChannel: 'notarized'
  },
  mac: {
    ...packageJson.build.mac,
    notarize: true,
    target: ['dmg', 'zip']
  },
  dmg: {
    ...packageJson.build.dmg,
    sign: true
  },
  publish: [
    {
      provider: 'generic',
      url: 'https://updates.evanarts.com/notarized/latest/'
    }
  ]
}
