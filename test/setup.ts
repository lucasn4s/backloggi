import { vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (handler: Function) => handler)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('getRouterParam', () => '')
vi.stubGlobal('readBody', () => ({}))
vi.stubGlobal('getCookie', () => null)
vi.stubGlobal('setCookie', () => {})
vi.stubGlobal('sendRedirect', () => {})
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const error = new Error(message)
  ;(error as any).statusCode = statusCode
  return error
})