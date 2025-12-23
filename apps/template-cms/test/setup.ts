import { vi } from 'vitest'

// Mock global objects
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-object-url'),
    revokeObjectURL: vi.fn()
  }
})

// Mock FileReader
global.FileReader = class {
  readAsDataURL = vi.fn()
  onload = vi.fn()
  onerror = vi.fn()
  result = 'data:image/png;base64,mock-base64-data'
} as any

// Mock fetch
global.fetch = vi.fn()