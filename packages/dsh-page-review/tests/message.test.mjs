import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { serializeAnnotations } from '../src/transcript.mjs'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/message.jsx', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react'],
})
const module = { exports: {} }
runInNewContext(compiled.outputFiles[0].text, {
  module,
  exports: module.exports,
  require: createRequire(import.meta.url),
})
const { annotationMessageRenderer } = module.exports

test('sent annotations remain readable without a native footer; screenshots use the authorized content factory', () => {
  const attachment = { id: 'screenshot-ref' },
    extra = { type: 'file', attachment: { name: 'qa.txt' } }
  const original = {
    data: {
      content: [
        {
          type: 'text',
          text:
            'QA_DRAFT\n\n' +
            serializeAnnotations([
              {
                url: 'https://example.com/',
                comment: 'Shorten the headline',
                element: {
                  tag: 'p',
                  selector: '#copy',
                  html: '<p>Original</p>',
                },
              },
            ]),
        },
        { type: 'image', attachment },
        extra,
      ],
    },
  }
  let nativeContent, imageFactory, imageLoader
  const loadImage = () => {
    throw Error('The plugin must delegate attachment loading to the host')
  }
  // A native renderer which does not consume messageFooter must still show the
  // comment. This caught a blank transcript in the actual Desktop build.
  const Native = ({ node }) => {
    nativeContent = node.data.content
    return React.createElement(
      'article',
      null,
      nativeContent
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join(''),
    )
  }
  const Wrapped = annotationMessageRenderer(Native)
  const html = renderToStaticMarkup(
    React.createElement(Wrapped, {
      node: original,
      loadImage,
      renderFactorySlot(name, props) {
        imageFactory = name
        imageLoader = props.loadImage
        assert.equal(props.content.attachments[0].image.attachment, attachment)
        return React.createElement('img', { alt: 'Authorized screenshot' })
      },
    }),
  )
  assert.match(html, /QA_DRAFT/)
  assert.match(html, /Shorten the headline/)
  assert.match(html, /Authorized screenshot/)
  assert.match(html, /pr-message-annotations/)
  assert.equal(imageFactory, 'conversation.chat.user.content')
  assert.equal(imageLoader, loadImage)
  assert.equal(nativeContent[1], extra)
  assert.equal(nativeContent[0].text.includes('dsh_browser_annotations'), false)
  assert.equal(nativeContent[0].text.includes('<p>'), false)
  assert.equal(original.data.content.length, 3)
  assert.match(original.data.content[0].text, /dsh_browser_annotations/)
})

test('ordinary messages and their native footer pass through intact', () => {
  const node = {
    data: { content: [{ type: 'text', text: 'Ordinary message' }] },
  }
  let received
  const Wrapped = annotationMessageRenderer((props) => {
    received = props
    return null
  })
  const footer = React.createElement('span', null, 'Native review')
  renderToStaticMarkup(
    React.createElement(Wrapped, { node, messageFooter: footer }),
  )
  assert.equal(received.node, node)
  assert.equal(received.messageFooter, footer)
})
