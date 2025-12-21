import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { DocumentChatPage } from './pages/DocumentChatPage'
import { useDocuments } from './hooks/useDocuments'

function App() {
  const { fetchDocuments } = useDocuments()

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat/:documentId" element={<DocumentChatPage />} />
    </Routes>
  )
}

export default App
