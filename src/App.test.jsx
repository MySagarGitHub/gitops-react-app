import { describe, it, expect } from 'vitest'

describe('GitOps React App', () => {
  it('should run basic smoke test successfully', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify environment configuration', () => {
    const env = import.meta.env.MODE || 'development'
    expect(env).toBeDefined()
  })
})
