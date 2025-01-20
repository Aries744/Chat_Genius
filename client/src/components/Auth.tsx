import { useState } from 'react'
import { Button } from './ui/button'

interface AuthProps {
  onLogin: (token: string, username: string) => void
}

export function Auth({ onLogin }: AuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'guest'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const endpoint = activeTab === 'register' ? '/api/register' : 
                      activeTab === 'guest' ? '/api/guest' : '/api/login'
      
      console.log('Submitting to:', endpoint, { username, password: activeTab !== 'guest' ? '***' : undefined })
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          ...(activeTab !== 'guest' && { password }),
        }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', { ...data, token: data.token ? '***' : undefined })
      
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }
      
      onLogin(data.token, data.username)
    } catch (error) {
      console.error('Auth error:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'login' ? 'default' : 'outline'}
          onClick={() => setActiveTab('login')}
        >
          Login
        </Button>
        <Button
          variant={activeTab === 'register' ? 'default' : 'outline'}
          onClick={() => setActiveTab('register')}
        >
          Register
        </Button>
        <Button
          variant={activeTab === 'guest' ? 'default' : 'outline'}
          onClick={() => setActiveTab('guest')}
        >
          Guest
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {activeTab === 'guest' ? 'Guest Name' : 'Username'}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        {activeTab !== 'guest' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          {activeTab === 'login' ? 'Login' : 
           activeTab === 'register' ? 'Register' : 
           'Join Chat'}
        </Button>
      </form>
    </div>
  )
} 