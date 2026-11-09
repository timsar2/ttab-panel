import { HttpErrorResponse } from '@angular/common/http'
import { identity } from 'rxjs'
import {
  decodeTransportPage,
  normalizeTransportError,
  transportInteger,
  transportPageRequest,
  unwrapTransport,
} from '../index'

describe('transport adapters', () => {
  it('keeps endpoint-specific null/scalar/array results without coercion', () => {
    for (const result of [null, 0, false, [], { id: 1 }]) {
      expect(unwrapTransport({ code: '2000', massage: null, result }, identity)).toBe(result)
    }
  })
  it.each([
    null,
    [],
    {},
    { code: 2000, massage: 'Success', result: 1 },
    { code: '2000', message: 'Success', result: 1 },
  ])('rejects malformed envelope %j', value => {
    expect(() => unwrapTransport(value, identity)).toThrow()
  })
  it('does not run decoders on business failure', () => {
    const decode = vi.fn()
    expect(() =>
      unwrapTransport({ code: '400', massage: 'Denied', result: false }, decode),
    ).toThrow('Denied')
    expect(decode).not.toHaveBeenCalled()
  })
  it('retains actual HTTP status separately from transport codes', () => {
    expect(
      normalizeTransportError(
        new HttpErrorResponse({
          status: 403,
          error: { code: '400', massage: 'Denied', result: 0 },
        }),
      ),
    ).toMatchObject({ kind: 'business', status: 403, code: '400', message: 'Denied' })
  })
  it('handles empty, text, network, and exception errors without diagnostics', () => {
    expect(normalizeTransportError(new HttpErrorResponse({ status: 0 }))).toMatchObject({
      kind: 'network',
    })
    for (const error of [
      null,
      'internal sql',
      { messages: ['secret sql'], source: 'private', exception: 'stack' },
    ]) {
      const result = normalizeTransportError(new HttpErrorResponse({ status: 500, error }))
      expect(result).toMatchObject({
        kind: 'http',
        status: 500,
        message: 'The request could not be completed.',
      })
      expect(result).not.toHaveProperty('source')
    }
    expect(
      normalizeTransportError(
        new HttpErrorResponse({ status: 404, error: { messages: ['Record missing'] } }),
      ).message,
    ).toBe('Record missing')
  })
  it('ignores malformed field error values', () => {
    expect(
      normalizeTransportError(
        new HttpErrorResponse({ status: 400, error: { errors: { Name: 'wrong', Id: [1] } } }),
      ),
    ).toMatchObject({ kind: 'http', fieldErrors: {} })
  })
  it.each([NaN, Infinity, 1.5, -1, '1', null, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe integer %j without converting it',
    value => {
      expect(() => transportInteger(value)).toThrow()
    },
  )
  it('validates domain-specific ranges and preserves zero when allowed', () => {
    expect(transportInteger(0)).toBe(0)
    expect(() => transportInteger(0, 1, 32767)).toThrow()
    expect(() => transportInteger(32768, 1, 32767)).toThrow()
    expect(transportPageRequest(0, 10)).toEqual({ pageNumber: 1, pageSize: 10 })
    expect(transportPageRequest(4, 25)).toEqual({ pageNumber: 5, pageSize: 25 })
    expect(() => transportPageRequest(Number.MAX_SAFE_INTEGER, 10)).toThrow()
    expect(() => transportPageRequest(0, 0)).toThrow()
  })
  const pagination = {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    pageSize: 10,
    hasPreviousPage: false,
    hasNextPage: false,
  }
  it('normalizes null list but never fabricates counts for an empty page', () => {
    expect(decodeTransportPage({ list: null, pagination }, identity)).toEqual({
      items: [],
      pagination,
    })
    const outOfRange = { ...pagination, currentPage: 9, hasPreviousPage: true }
    expect(decodeTransportPage({ list: [], pagination: outOfRange }, identity).pagination).toEqual(
      outOfRange,
    )
  })
  it.each([
    { list: [] },
    { list: {}, pagination },
    { list: [], pagination: { ...pagination, totalCount: -1 } },
    { list: [], pagination: { ...pagination, hasNextPage: 'false' } },
  ])('rejects malformed page %j', value => {
    expect(() => decodeTransportPage(value, identity)).toThrow()
  })
})
