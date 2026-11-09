import { Injectable, inject } from '@angular/core'
import {
  TransportError,
  TransportHttp,
  decodeTransportPage,
  transportInteger,
  transportPageRequest,
  unwrapTransport,
} from '@org/transport-http'
import { map } from 'rxjs'
import { CompanySearch, decodeCompanyDetail, decodeCompanyRow } from './company.models'

@Injectable()
export class CompanyApi {
  private readonly http = inject(TransportHttp)

  search(query: CompanySearch) {
    const paging = transportPageRequest(query.pageIndex, query.pageSize)
    return this.http
      .request(
        'POST',
        'companys/search',
        value => unwrapTransport(value, page => decodeTransportPage(page, decodeCompanyRow)),
        {
          name: query.name.trim() || null,
          ...paging,
        },
      )
      .pipe(
        map(page => {
          if (
            page.pagination.currentPage !== paging.pageNumber ||
            page.pagination.pageSize !== paging.pageSize ||
            new Set(page.items.map(company => company.id)).size !== page.items.length
          ) {
            throw new TransportError(
              'contract',
              0,
              'The server returned an inconsistent company page.',
            )
          }
          return page
        }),
      )
  }

  detail(id: number) {
    const requestedId = transportInteger(id, 1, 32767)
    return this.http
      .request('GET', `companys/${requestedId}`, value =>
        unwrapTransport(value, detail => (detail === null ? null : decodeCompanyDetail(detail))),
      )
      .pipe(
        map(detail => {
          // The operator controller may substitute its claim for the requested company.
          if (detail && detail.id !== requestedId) {
            throw new TransportError(
              'contract',
              0,
              'The requested company does not match the server response.',
            )
          }
          return detail
        }),
      )
  }
}
