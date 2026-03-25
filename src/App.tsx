import { useState } from 'react'
import './index.css'
import Landing from './pages/Landing'
import Catalog from './pages/Catalog'
import GenreWorld from './pages/GenreWorld'
import SearchResults from './pages/SearchResults'
import ChatWidget from './components/ChatWidget'
import { genres } from './data/genres'
import { useHashRouter } from './hooks/useHashRouter'

export default function App() {
  const { route, navigate } = useHashRouter()
  const [selectedCategory, setSelectedCategory] = useState('all')

  const handleSearch = (q: string) => {
    navigate('search', { q })
  }

  const goHome = () => navigate('landing')
  const goCatalog = () => navigate('catalog')
  const goGenre = (id: string) => navigate(id)

  const { page, params } = route

  const selectedGenre = genres.find(g => g.id === page)
  let content: React.ReactNode

  if (selectedGenre) {
    content = (
      <GenreWorld
        genre={selectedGenre}
        onBack={goCatalog}
        onHome={goHome}
        onSelectGenre={goGenre}
        onSearch={handleSearch}
      />
    )
  } else if (page === 'search') {
    content = (
      <SearchResults
        query={params.q ?? ''}
        onSelect={goGenre}
        onHome={goHome}
        onSearch={handleSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
    )
  } else if (page === 'catalog') {
    content = (
      <Catalog
        onSelect={goGenre}
        onHome={goHome}
        onSearch={handleSearch}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
    )
  } else {
    content = <Landing onEnter={goCatalog} />
  }

  return (
    <>
      {content}
      <ChatWidget onSelectGenre={goGenre} />
    </>
  )
}
