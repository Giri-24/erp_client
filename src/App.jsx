import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PrivateRoute from './components/PrivateRoute'
import ServerDown from './pages/ServerDown'

function App() {
  return (
    <BrowserRouter basename="/erp">
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />
        <Route path="/server-down" element={<ServerDown />} />

        {/* Protected Route */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App  