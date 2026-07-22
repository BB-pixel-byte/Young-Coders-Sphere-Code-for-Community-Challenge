import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
    proxy: {
      '/users': 'http://127.0.0.1:8000',
      '/chores': 'http://127.0.0.1:8000',
      '/volunteers': 'http://127.0.0.1:8000',
      '/rewards': 'http://127.0.0.1:8000',
      '/profiles': 'http://127.0.0.1:8000',
      '/skills': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
      '/analytics': 'http://127.0.0.1:8000',
    },
  },
})
