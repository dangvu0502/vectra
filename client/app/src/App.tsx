import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { StoragePage } from './components/pages/storage';
import { ApiKeysPage } from './components/pages/api-keys';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from './providers/auth-provider'; // Import AuthProvider

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<StoragePage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App
