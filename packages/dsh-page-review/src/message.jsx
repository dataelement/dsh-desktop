import { t } from './locale.mjs'
import React, { useRef, useState, useEffect } from 'react'
import { annotationTranscript } from './transcript.mjs'

function MessageAnnotations({ review, renderFactorySlot, loadImage }) {
  const trigger = useRef(null),
    popup = useRef(null),
    [anchor, setAnchor] = useState({}),
    [expanded, setExpanded] = useState(false),
    id = React.useId()
  const position = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(384, innerWidth - 24),
      below = innerHeight - r.bottom > 180
    setAnchor({
      width,
      left: Math.max(12, Math.min(r.left, innerWidth - width - 12)),
      top: below ? r.bottom + 6 : r.top - 6,
      maxHeight: Math.min(
        420,
        below ? innerHeight - r.bottom - 18 : r.top - 18,
      ),
      transform: below ? 'none' : 'translateY(-100%)',
    })
  }
  useEffect(() => {
    if (!expanded) return
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [expanded])
  return (
    <div className="pr-message-annotations">
      <button
        ref={trigger}
        className="pr-composer-chip"
        aria-label={t('review.p0.sent.annotations', {
          p0: review.notes.length,
        })}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => {
          position()
          if (!popup.current.matches(':popover-open'))
            popup.current.showPopover()
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 9h8M8 13h5" />
        </svg>
        <span>
          {review.notes.length} {t('annotations.71')}
        </span>
      </button>
      <div
        id={id}
        ref={popup}
        popover="auto"
        role="dialog"
        aria-label={t('sent.web.annotations')}
        className="pr-annotation-popover pr-message-popover"
        style={anchor}
        onToggle={(e) => setExpanded(e.newState === 'open')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            popup.current.hidePopover()
            trigger.current.focus()
          }
        }}
      >
        <div className="pr-popover-head">
          <strong>
            {review.notes.length} {t('annotations.71')}
          </strong>
          <button
            aria-label={t('close.sent.annotation.popover')}
            onClick={() => popup.current.hidePopover()}
          >
            ×
          </button>
        </div>
        <ol className="pr-annotation-items">
          {review.notes.map((note, i) => (
            <li key={i}>
              <span className="pr-annotation-index">{i + 1}.</span>
              <div className="pr-annotation-content">
                <div className="pr-annotation-target">
                  <code>{note.element.tag || t('region')}</code>
                  <span>
                    {note.element.text?.slice(0, 100) ||
                      note.element.name ||
                      t('selected.region')}
                  </span>
                </div>
                <p>{note.comment}</p>
                <div className="pr-message-image">
                  {review.images[i]?.attachment ? (
                    renderFactorySlot('conversation.chat.user.content', {
                      content: {
                        text: '',
                        attachments: [
                          {
                            type: 'image',
                            image: { attachment: review.images[i].attachment },
                          },
                        ],
                        extraBlocks: [],
                      },
                      facts: {},
                      loadImage,
                    })
                  ) : review.images[i]?.data ? (
                    <img
                      src={`data:${review.images[i].mediaType};base64,${review.images[i].data}`}
                      alt={t('screenshot.for.annotation.p0', { p0: i + 1 })}
                    />
                  ) : null}
                </div>
                <small className="pr-message-url">
                  {note.document?.path || note.url}
                </small>
                <details className="pr-annotation-evidence">
                  <summary>
                    {note.document ? t('file.location') : t('element.details')}
                  </summary>
                  <pre>
                    {note.legacyContext ||
                      JSON.stringify(
                        {
                          document: note.document,
                          selector: note.element.selector,
                          rect: note.rect,
                          viewport: note.viewport,
                          scroll: note.scroll,
                          capturedAt: note.capturedAt,
                          html: note.element.html,
                          styles: note.element.styles,
                          source: note.element.source,
                        },
                        null,
                        2,
                      )}
                  </pre>
                </details>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
export function annotationMessageRenderer(Native) {
  return function AnnotationMessage(props) {
    const review = annotationTranscript(props.node.data.content)
    if (!review) return <Native {...props} />
    const summary =
      `${review.notes.length} ${t('annotations.71')}\n` +
      review.notes.map((note, i) => `${i + 1}. ${note.comment}`).join('\n')
    const node = {
      ...props.node,
      data: {
        ...props.node.data,
        content: [
          {
            type: 'text',
            text: [review.userText, summary].filter(Boolean).join('\n\n'),
          },
          ...review.content.filter((block) => block.type !== 'text'),
        ],
      },
    }
    return (
      <div className="pr-annotated-message">
        <Native {...props} node={node} />
        <MessageAnnotations
          review={review}
          renderFactorySlot={props.renderFactorySlot}
          loadImage={props.loadImage}
        />
      </div>
    )
  }
}
