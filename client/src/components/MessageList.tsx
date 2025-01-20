import { useEffect, useRef } from 'react'

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

interface MessageListProps {
  messages: Message[]
  onReaction: (messageId: string, emoji: string) => void
  onReply: (messageId: string) => void
}

export function MessageList({ messages, onReaction, onReply }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="group flex items-start space-x-3 hover:bg-accent/50 rounded-lg p-2 transition-colors"
        >
          {/* Avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            {message.username[0].toUpperCase()}
          </div>

          <div className="flex-1 space-y-1">
            {/* Message header */}
            <div className="flex items-center space-x-2">
              <span className="font-medium">{message.username}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Message content */}
            <p className="text-sm">{message.text}</p>

            {/* File attachment */}
            {message.fileUrl && (
              <div className="mt-2">
                {message.fileType?.startsWith('image/') ? (
                  <img
                    src={message.fileUrl}
                    alt={message.fileName}
                    className="max-w-sm rounded-lg border"
                  />
                ) : (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    📎 {message.fileName}
                  </a>
                )}
              </div>
            )}

            {/* Message actions */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onReaction(message.id, '👍')}
                className="text-xs hover:bg-accent rounded px-1.5 py-0.5"
              >
                👍
              </button>
              <button
                onClick={() => onReaction(message.id, '❤️')}
                className="text-xs hover:bg-accent rounded px-1.5 py-0.5"
              >
                ❤️
              </button>
              <button
                onClick={() => onReply(message.id)}
                className="text-xs hover:bg-accent rounded px-1.5 py-0.5"
              >
                💬 {message.replyCount || ''}
              </button>
            </div>

            {/* Reactions */}
            {Object.entries(message.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(message.reactions).map(([emoji, users]) => (
                  <div
                    key={emoji}
                    className="flex items-center space-x-1 text-xs bg-accent rounded-full px-2 py-0.5"
                  >
                    <span>{emoji}</span>
                    <span className="text-muted-foreground">{users.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
} 