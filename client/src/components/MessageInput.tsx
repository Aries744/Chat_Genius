import { useState, useRef } from 'react'
import { Button } from './ui/button'

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => void
  isLoading?: boolean
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || file) {
      onSendMessage(message, file || undefined)
      setMessage('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        e.target.value = ''
        return
      }
      setFile(selectedFile)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          📎
        </Button>
        <Button type="submit" disabled={isLoading || (!message.trim() && !file)}>
          Send
        </Button>
      </div>
      {file && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            📎 {file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
          >
            ✕
          </Button>
        </div>
      )}
    </form>
  )
} 