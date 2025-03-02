import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { StoragePage } from './components/pages/storage'
import { ApiKeysPage } from './components/pages/api-keys'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StoragePage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
      </Routes>
    </Router>
  )
}

export default App
