import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  text: string
  username: string
  createdAt: string
  fileUrl?: string
  fileName?: string
  fileType?: string
  reactions: Record<string, string[]>
  replyCount?: number
}

interface Channel {
  id: string
  name: string
}

interface User {
  id: string
  username: string
  online: boolean
}

interface ChatProps {
  username: string
  onLogout: () => void
}

export function Chat({ username, onLogout }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const newSocket = io({
      auth: { token }
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Set up socket event handlers
  useEffect(() => {
    if (!socket) return

    const handleInitialize = (data: any) => {
      console.log('Received initialize data:', data)
      const channelsList = data.channels || []
      setChannels(channelsList)
      setUsers(data.users || [])
      
      // Find and set the general channel
      const generalChannel = channelsList.find((ch: Channel) => ch.name === 'general')
      if (generalChannel) {
        setActiveChannel(generalChannel)
        setMessages(data.messages || [])
      }
    }

    const handleChatMessage = (data: any) => {
      console.log('Received message:', data)
      if (data.channelId === activeChannel?.id) {
        setMessages(prev => [...prev, data.message])
      }
    }

    const handleUserStatus = (data: any) => {
      setUsers(prev => 
        prev.map(user => 
          user.id === data.userId 
            ? { ...user, online: data.isOnline }
            : user
        )
      )
    }

    const handleReactionUpdate = (data: any) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      )
    }

    const handleError = (err: Error) => {
      console.error('Socket connection error:', err)
      setError('Failed to connect to chat server')
    }

    // Register event handlers
    socket.on('connect_error', handleError)
    socket.on('initialize', handleInitialize)
    socket.on('chat message', handleChatMessage)
    socket.on('user status', handleUserStatus)
    socket.on('reaction_updated', handleReactionUpdate)

    // Cleanup event handlers
    return () => {
      socket.off('connect_error', handleError)
      socket.off('initialize', handleInitialize)
      socket.off('chat message', handleChatMessage)
      socket.off('user status', handleUserStatus)
      socket.off('reaction_updated', handleReactionUpdate)
    }
  }, [socket, activeChannel])

  const handleSendMessage = async (text: string, file?: File) => {
    if (!socket || !activeChannel) return

    setIsLoading(true)
    try {
      let fileData
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) throw new Error('Failed to upload file')
        fileData = await response.json()
      }

      console.log('Sending message:', {
        text,
        channelId: activeChannel.id,
        fileData
      })

      socket.emit('chat message', {
        text,
        channelId: activeChannel.id,
        ...(fileData && {
          fileUrl: fileData.url,
          fileType: fileData.type,
          fileName: fileData.name
        })
      })
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket) return
    socket.emit('add reaction', { messageId, emoji })
  }

  const handleReply = (messageId: string) => {
    // Will implement thread view later
    console.log('Reply to:', messageId)
  }

  const handleChannelSelect = (channel: Channel) => {
    setActiveChannel(channel)
    setMessages([]) // Clear messages when changing channels
    socket?.emit('join channel', { channelId: channel.id })
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-secondary p-4 flex flex-col">
        {/* User info */}
        <div className="mb-6 flex items-center justify-between">
          <span className="font-medium">{username}</span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Logout
          </Button>
        </div>

        {/* Channels */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Channels</h2>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelSelect(channel)}
                className={`w-full text-left px-2 py-1 rounded ${
                  activeChannel?.id === channel.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                # {channel.name}
              </button>
            ))}
          </div>
        </div>

        {/* Users */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Users</h2>
          <div className="space-y-1">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center px-2 py-1"
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  user.online ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span>{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="h-14 border-b px-4 flex items-center">
          <h1 className="font-semibold">#{activeChannel?.name || ''}</h1>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          onReaction={handleReaction}
          onReply={handleReply}
        />

        {/* Message input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-4 right-4 p-4 bg-destructive text-destructive-foreground rounded-md animate-in">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError('')}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  )
} 