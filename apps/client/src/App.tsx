import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StoragePage } from './components/pages/storage'
import { ApiKeysPage } from './components/pages/api-keys'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<StoragePage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
