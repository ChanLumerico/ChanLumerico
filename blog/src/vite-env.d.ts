/// <reference types="vite/client" />

declare module '*.rst?raw' {
  const content: string
  export default content
}
