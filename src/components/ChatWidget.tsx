import { useEffect, useRef, useState } from 'react'
import { galleryImages, genres, graphicalStyles } from '../data/genres'

type Props = {
  onSelectGenre: (id: string) => void
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  genreIds?: string[]
  styleIds?: string[]
  promptSuggestions?: string[]
}

const STORAGE_KEY = 'coalesce_chat_messages_v1'
const OPEN_KEY = 'coalesce_chat_open_v1'

const STARTER_PROMPTS = [
  'Fog-heavy PS2-era direction',
  'Hauntology vs Analogism',
  'Quiet exploration game',
]

const genreKeywordMap: Record<string, string[]> = {
  'gothic-dark-fantasy': ['gothic', 'cathedral', 'ruin', 'ritual', 'graveyard', 'medieval'],
  'retro-futurism': ['retro', 'atomic', 'space age', 'googie', 'utopia'],
  analogism: ['analog', 'tape', 'signal', 'cassette', 'vhs', 'hardware'],
  cyberpunk: ['cyberpunk', 'neon', 'megacity', 'augment', 'corporate', 'rain'],
  hauntology: ['hauntology', 'fog', 'memory', 'liminal', 'abandoned', 'nostalgia'],
  'pastoral-folk': ['pastoral', 'folk', 'village', 'meadow', 'field', 'craft'],
  'digital-pastoral': ['digital pastoral', 'voxel', 'minecraft', 'proteus', 'calm build'],
}

const styleKeywordMap: Record<string, string[]> = {
  'ps1-era': ['ps1', 'playstation 1', 'psx', 'jagged'],
  'ps2-era': ['ps2', 'playstation 2', 'fog design'],
  'pixel-art': ['pixel', 'pixel art', 'sprite', '8-bit', '16-bit'],
  'low-poly': ['low poly', 'voxel', 'geometric', 'faceted'],
  'cel-shaded': ['cel shaded', 'toon', 'anime render'],
  photorealism: ['photoreal', 'realistic', 'photo'],
  'hand-painted': ['hand painted', 'painted', 'brushwork'],
  'pre-rendered': ['pre-rendered', 'fixed camera', 'baked background'],
  dithered: ['dither', 'stipple', 'halftone'],
  'concept-art': ['concept art', 'concept', 'key art'],
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function includesAny(query: string, values: string[]) {
  return values.some(value => query.includes(value))
}

function createAssistantMessage(text: string, extra?: Omit<ChatMessage, 'id' | 'role' | 'text'>): ChatMessage {
  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    text,
    ...extra,
  }
}

function createUserMessage(text: string): ChatMessage {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    text,
  }
}

function getWelcomeMessage() {
  return createAssistantMessage(
    'Coalesce chat is a compact direction navigator. Ask for a genre, compare worlds, or test a visual style.',
    {
      genreIds: ['hauntology', 'cyberpunk'],
      styleIds: ['ps2-era', 'pixel-art'],
      promptSuggestions: STARTER_PROMPTS,
    },
  )
}

function getStoredMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [getWelcomeMessage()]
    const parsed = JSON.parse(raw) as ChatMessage[]
    return parsed.length > 0 ? parsed : [getWelcomeMessage()]
  } catch {
    return [getWelcomeMessage()]
  }
}

function getStoredOpenState() {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function matchGenres(query: string) {
  const direct = genres
    .filter(genre => genre.status === 'available')
    .filter(genre => {
      const haystack = [
        genre.id,
        genre.name,
        genre.tagline,
        genre.description,
        genre.abstract ?? '',
        genre.category,
        ...genre.analogues.map(analogue => `${analogue.title} ${analogue.note}`),
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })

  const keyword = genres
    .filter(genre => genre.status === 'available')
    .filter(genre => includesAny(query, genreKeywordMap[genre.id] ?? []))

  return unique([...direct, ...keyword])
}

function matchStyles(query: string) {
  const styles = graphicalStyles.filter(style => style.id !== 'all')
  const direct = styles.filter(style => `${style.id} ${style.name} ${style.description}`.toLowerCase().includes(query))
  const keyword = styles.filter(style => includesAny(query, styleKeywordMap[style.id] ?? []))
  return unique([...direct, ...keyword])
}

function relatedGenres(genreId: string) {
  const current = genres.find(genre => genre.id === genreId)
  if (!current) return []

  return genres
    .filter(genre => genre.status === 'available' && genre.id !== genreId)
    .map(genre => {
      const sharedCategory = genre.category === current.category ? 2 : 0
      const sharedImages = galleryImages.filter(image => image.genres.includes(genreId) && image.genres.includes(genre.id)).length
      return { genre, score: sharedCategory + sharedImages }
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.genre)
    .slice(0, 2)
}

function genresForStyle(styleId: string) {
  return unique(
    galleryImages
      .filter(image => image.style === styleId)
      .flatMap(image => image.genres)
      .map(id => genres.find(genre => genre.id === id))
      .filter((genre): genre is NonNullable<typeof genre> => Boolean(genre?.status === 'available')),
  )
}

function buildGenreSummary(genreId: string) {
  const genre = genres.find(item => item.id === genreId)
  if (!genre) return null
  const related = relatedGenres(genreId)

  return createAssistantMessage(
    `${genre.name}: ${genre.tagline}\nPalette: ${genre.color.labels.slice(0, 3).join(', ')}.\nSound: ${genre.sonic.instruments.slice(0, 2).map(item => item.name).join(', ') || 'still sparse'}.`,
    {
      genreIds: unique([genre.id, ...related.map(item => item.id)]),
      promptSuggestions: [`Compare ${genre.name} with ${related[0]?.name ?? 'Hauntology'}`],
    },
  )
}

function buildStyleSummary(styleId: string) {
  const style = graphicalStyles.find(item => item.id === styleId)
  if (!style) return null
  const examples = genresForStyle(styleId)

  return createAssistantMessage(
    `${style.name}: ${style.description}\nBest current pairings: ${examples.slice(0, 3).map(item => item.name).join(', ') || 'still sparse'}.`,
    {
      genreIds: examples.slice(0, 2).map(item => item.id),
      styleIds: [style.id],
    },
  )
}

function buildComparison(firstId: string, secondId: string) {
  const first = genres.find(genre => genre.id === firstId)
  const second = genres.find(genre => genre.id === secondId)
  if (!first || !second) return null

  return createAssistantMessage(
    `${first.name} vs ${second.name}\n\n${first.name}: ${first.tagline}\n${second.name}: ${second.tagline}\n\nA good hybrid keeps the emotional center of one and surface language of the other.`,
    {
      genreIds: [first.id, second.id],
      promptSuggestions: [`Mix ${first.name} with ${second.name}`],
    },
  )
}

function buildHybridReply(genreMatches: ReturnType<typeof matchGenres>, styleMatches: ReturnType<typeof matchStyles>) {
  if (genreMatches.length >= 2) {
    const [first, second] = genreMatches
    return createAssistantMessage(
      `${first.name} x ${second.name}\nStart from palette and sound of ${first.name}, then borrow materials or references from ${second.name}.`,
      {
        genreIds: [first.id, second.id],
      },
    )
  }

  if (genreMatches.length >= 1 && styleMatches.length >= 1) {
    const [genre] = genreMatches
    const [style] = styleMatches
    return createAssistantMessage(
      `${genre.name} in ${style.name}\nTreat the genre as the world thesis and ${style.name} as the rendering lens.`,
      {
        genreIds: [genre.id, ...relatedGenres(genre.id).map(item => item.id)],
        styleIds: [style.id],
      },
    )
  }

  return null
}

function buildRecommendationReply(query: string) {
  const matched = matchGenres(query)
  const recommendations = matched.length > 0
    ? matched.slice(0, 3)
    : ([
        genres.find(genre => genre.id === 'hauntology'),
        genres.find(genre => genre.id === 'digital-pastoral'),
        genres.find(genre => genre.id === 'cyberpunk'),
      ].filter((genre): genre is NonNullable<typeof genre> => Boolean(genre)))

  return createAssistantMessage(
    `Start here:\n1. ${recommendations[0]?.name ?? 'Hauntology'}\n2. ${recommendations[1]?.name ?? 'Digital Pastoral'}\n3. ${recommendations[2]?.name ?? 'Cyberpunk'}`,
    {
      genreIds: recommendations.map(item => item.id),
      styleIds: ['ps2-era', 'pixel-art'],
    },
  )
}

function generateReply(input: string) {
  const query = normalizeText(input)
  const genreMatches = matchGenres(query)
  const styleMatches = matchStyles(query)

  if ((includesAny(query, ['difference', 'compare', 'versus', ' vs ', 'between']) || genreMatches.length >= 2) && genreMatches.length >= 2) {
    const comparison = buildComparison(genreMatches[0].id, genreMatches[1].id)
    if (comparison) return comparison
  }

  if (includesAny(query, ['mix', 'blend', 'combine', 'hybrid', 'fusion', 'cross'])) {
    const hybrid = buildHybridReply(genreMatches, styleMatches)
    if (hybrid) return hybrid
  }

  if (genreMatches.length >= 1 && styleMatches.length >= 1) {
    const hybrid = buildHybridReply(genreMatches, styleMatches)
    if (hybrid) return hybrid
  }

  if (genreMatches.length === 1) {
    const summary = buildGenreSummary(genreMatches[0].id)
    if (summary) return summary
  }

  if (styleMatches.length === 1) {
    const summary = buildStyleSummary(styleMatches[0].id)
    if (summary) return summary
  }

  if (includesAny(query, ['recommend', 'suggest', 'start', 'direction'])) {
    return buildRecommendationReply(query)
  }

  return createAssistantMessage(
    'Ask for a genre, compare two worlds, or test a style mix. Example: "Hauntology in PS1".',
    {
      genreIds: ['hauntology', 'analogism'],
      styleIds: ['ps1-era'],
      promptSuggestions: STARTER_PROMPTS,
    },
  )
}

function AssistantMessageBlock({
  message,
  onSelectGenre,
  onUsePrompt,
}: {
  message: ChatMessage
  onSelectGenre: (id: string) => void
  onUsePrompt: (prompt: string) => void
}) {
  const suggestedGenres = unique(
    (message.genreIds ?? [])
      .map(id => genres.find(genre => genre.id === id))
      .filter((genre): genre is NonNullable<typeof genre> => Boolean(genre)),
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          maxWidth: '100%',
          padding: '12px 14px',
          border: '1px solid var(--border-card)',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, var(--bg-card), rgba(200, 184, 154, 0.04))',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
          fontSize: '13px',
        }}
      >
        {message.text}
      </div>

      {(message.promptSuggestions?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {message.promptSuggestions?.slice(0, 2).map(prompt => (
            <button
              key={prompt}
              onClick={() => onUsePrompt(prompt)}
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '7px 10px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {suggestedGenres.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {suggestedGenres.slice(0, 2).map(genre => (
            <button
              key={genre.id}
              onClick={() => onSelectGenre(genre.id)}
              style={{
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent-dim)',
                color: 'var(--accent)',
                padding: '7px 10px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Open {genre.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatWidget({ onSelectGenre }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(getStoredMessages)
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isOpen, setIsOpen] = useState(getStoredOpenState)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, isOpen ? '1' : '0')
    } catch {}
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isThinking, isOpen])

  const submitPrompt = (rawValue: string) => {
    const value = rawValue.trim()
    if (!value || isThinking) return

    setMessages(current => [...current, createUserMessage(value)])
    setDraft('')
    setIsThinking(true)

    window.setTimeout(() => {
      setMessages(current => [...current, generateReply(value)])
      setIsThinking(false)
    }, 220)
  }

  const clearChat = () => {
    const initial = [getWelcomeMessage()]
    setMessages(initial)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    } catch {}
  }

  return (
    <div className="chat-widget-shell">
      {isOpen && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <div>
              <div className="chat-widget-kicker">Coalesce Chat</div>
              <div className="chat-widget-title">Direction viewport</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="chat-widget-icon" onClick={clearChat} title="Reset chat">
                Reset
              </button>
              <button className="chat-widget-icon" onClick={() => setIsOpen(false)} title="Close chat">
                Close
              </button>
            </div>
          </div>

          <div ref={threadRef} className="chat-widget-thread no-scrollbar">
            {messages.map(message => (
              <div key={message.id} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {message.role === 'user' ? (
                  <div className="chat-widget-user-bubble">
                    {message.text}
                  </div>
                ) : (
                  <AssistantMessageBlock
                    message={message}
                    onSelectGenre={onSelectGenre}
                    onUsePrompt={submitPrompt}
                  />
                )}
              </div>
            ))}

            {isThinking && <div className="chat-widget-thinking">Thinking...</div>}
          </div>

          <div className="chat-widget-starters">
            {STARTER_PROMPTS.map(prompt => (
              <button key={prompt} className="chat-widget-starter" onClick={() => submitPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-widget-composer">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitPrompt(draft)
                }
              }}
              placeholder="Ask Coalesce..."
              className="chat-widget-input"
            />

            <button
              onClick={() => submitPrompt(draft)}
              disabled={isThinking || !draft.trim()}
              className="chat-widget-send"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(open => !open)}
        className="chat-widget-toggle"
        aria-label={isOpen ? 'Close chat widget' : 'Open chat widget'}
      >
        {isOpen ? '×' : 'Chat'}
      </button>
    </div>
  )
}
