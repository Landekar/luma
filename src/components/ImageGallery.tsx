import { useState } from 'react'
import type { GalleryImage } from '../data/genres'
import { genres, graphicalStyles } from '../data/genres'

type Props = {
  images: GalleryImage[]
  genreId: string
  onNavigateGenre: (id: string) => void
  accentColor?: string
}

export default function ImageGallery({ images, genreId, onNavigateGenre, accentColor = 'var(--accent)' }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [styleFilter, setStyleFilter] = useState('all')

  const filtered = styleFilter === 'all' ? images : images.filter(img => img.style === styleFilter)
  const activeImage = filtered[activeIdx] ?? filtered[0]

  // Styles present in this genre's images
  const availableStyles = ['all', ...Array.from(new Set(images.map(img => img.style).filter(Boolean)))] as string[]

  if (images.length === 0) {
    return (
      <div style={{
        padding: '80px 48px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '13px',
        letterSpacing: '0.1em',
      }}>
        Gallery coming soon — images are being curated.
      </div>
    )
  }

  // Cross-genre links for the active image
  const crossGenres = activeImage?.genres.filter(g => g !== genreId) ?? []

  const styleName = graphicalStyles.find(s => s.id === activeImage?.style)?.name

  return (
    <div style={{ padding: '0 48px' }}>
      {/* Style filter pills */}
      {availableStyles.length > 2 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {availableStyles.map(sid => {
            const style = graphicalStyles.find(s => s.id === sid)
            const active = styleFilter === sid
            return (
              <button
                key={sid}
                onClick={() => { setStyleFilter(sid); setActiveIdx(0) }}
                style={{
                  background: active ? 'var(--bg-pill-active)' : 'var(--bg-pill)',
                  border: active ? '1px solid var(--bg-pill-active)' : '1px solid var(--border-strong)',
                  color: active ? 'var(--text-on-pill)' : 'var(--text-pill-inactive)',
                  borderRadius: '999px',
                  padding: '6px 16px',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {style?.name ?? sid}
              </button>
            )
          })}
        </div>
      )}

      {/* Hero + side images layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px', marginBottom: '16px' }}>
        {/* Hero image */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', aspectRatio: '16/10' }}>
          {activeImage && (
            <>
              <div style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${images[0]?.genres.includes(genreId) ? 'var(--bg-card)' : '#1a1a1a'}, var(--bg-panel))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: 'var(--text-faint)',
                letterSpacing: '0.1em',
              }}>
                {/* Placeholder — will show actual image when src exists */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.15 }}>&#9634;</div>
                  <div style={{ textTransform: 'uppercase', marginBottom: '4px' }}>{activeImage.title}</div>
                  {activeImage.source && (
                    <div style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>{activeImage.source}</div>
                  )}
                </div>
              </div>

              {/* Image info overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '32px 20px 16px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '15px', color: '#e8e8e8', marginBottom: '4px' }}>
                      {activeImage.title}
                    </div>
                    {activeImage.source && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        {activeImage.source}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {styleName && (
                      <span style={{
                        fontSize: '9px',
                        letterSpacing: '0.15em',
                        color: 'rgba(255,255,255,0.6)',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                      }}>
                        {styleName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cross-genre bridges */}
                {crossGenres.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>
                      Also in
                    </span>
                    {crossGenres.map(gid => {
                      const genre = genres.find(g => g.id === gid)
                      if (!genre) return null
                      return (
                        <button
                          key={gid}
                          onClick={() => onNavigateGenre(gid)}
                          style={{
                            fontSize: '9px',
                            letterSpacing: '0.12em',
                            color: accentColor,
                            background: 'rgba(200,184,154,0.12)',
                            border: '1px solid rgba(200,184,154,0.2)',
                            padding: '3px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s',
                          }}
                        >
                          {genre.name} →
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Side images */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          maxHeight: 'calc((100vw - 220px - 96px - 320px - 12px) * 10 / 16)',
        }}>
          {filtered.map((img, i) => {
            const isActive = i === activeIdx
            return (
              <div
                key={img.id}
                onClick={() => setActiveIdx(i)}
                style={{
                  position: 'relative',
                  aspectRatio: '16/10',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                  opacity: isActive ? 1 : 0.65,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, var(--bg-card), var(--bg-panel))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {img.title}
                    </div>
                  </div>
                </div>

                {/* Cross-genre indicator dot */}
                {img.genres.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: accentColor,
                    opacity: 0.7,
                  }}
                    title={`Also in: ${img.genres.filter(g => g !== genreId).map(g => genres.find(x => x.id === g)?.name).join(', ')}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Image counter */}
      <div style={{
        fontSize: '10px',
        color: 'var(--text-faint)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '32px',
      }}>
        {activeIdx + 1} / {filtered.length} images
        {styleFilter !== 'all' && ` · ${graphicalStyles.find(s => s.id === styleFilter)?.name}`}
      </div>
    </div>
  )
}
