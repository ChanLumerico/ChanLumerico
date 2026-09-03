import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` is '/' for the user-root Pages repo (ChanLumerico.github.io). Set
// BASE_PATH=/<repo>/ when serving from a project-pages repo instead — routing
// is hash-based, so only asset URLs are affected.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
})
