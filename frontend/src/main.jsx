import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#e2e8f0',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 32px rgba(0, 210, 255, 0.15)',
              },
              success: {
                iconTheme: { primary: '#00d2ff', secondary: '#0f172a' },
              },
              error: {
                iconTheme: { primary: '#f43f5e', secondary: '#fff' },
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
