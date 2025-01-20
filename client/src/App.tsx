import { useState, useEffect } from 'react'
import { Auth } from './components/Auth'
import { Chat } from './components/Chat'
import './index.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUsername = localStorage.getItem('username')
    if (token && savedUsername) {
      setIsAuthenticated(true)
      setUsername(savedUsername)
    }
  }, [])

  const handleLogin = (token: string, username: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    setIsAuthenticated(true)
    setUsername(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setIsAuthenticated(false)
    setUsername('')
  }

  return (
    <div className="min-h-screen bg-background">
      {!isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Chat username={username} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
