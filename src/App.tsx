import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/Layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import TextureResourceManagement from './pages/TextureResourceManagement'
import TextureAtlasManagement from './pages/TextureAtlasManagement'
import EmptyPage from './components/EmptyPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<EmptyPage title="用户管理" />} />
          <Route path="texture-resources" element={<TextureResourceManagement />} />
          <Route path="texture-atlas" element={<TextureAtlasManagement />} />
          <Route path="settings" element={<EmptyPage title="系统设置" />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App