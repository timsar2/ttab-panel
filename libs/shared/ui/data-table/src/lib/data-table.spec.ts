import { TestBed } from '@angular/core/testing'
import { DataTable } from '../index'

describe('DataTable public composition', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [DataTable] }).compileComponents()
    const fixture = TestBed.createComponent(DataTable)
    fixture.componentRef.setInput('rows', [{ id: 'company-2', name: 'Company Two' }])
    fixture.componentRef.setInput('columns', [{ accessorKey: 'name', header: 'Company' }])
    fixture.componentRef.setInput('rowId', (row: { id: string }) => row.id)
    fixture.componentRef.setInput('rowLabel', (row: { name: string }) => row.name)
    fixture.componentRef.setInput('page', {
      pageIndex: 0,
      pageSize: 10,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    })
    fixture.componentRef.setInput('caption', 'Companies')
    await fixture.whenStable()
    return fixture
  }
  it('renders native semantics, stable IDs, columns, and accessible row actions', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('actionLabel', 'Select')
    const action = vi.fn()
    fixture.componentInstance.rowAction.subscribe(action)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('caption')?.textContent).toContain('Companies')
    expect(element.querySelector('th')?.getAttribute('scope')).toBe('col')
    expect(element.querySelector('tbody tr')?.getAttribute('data-row-id')).toBe('company-2')
    const button = element.querySelector<HTMLButtonElement>('tbody button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Select: Company Two')
    button.click()
    expect(action).toHaveBeenCalledWith({ id: 'company-2', name: 'Company Two' })
  })
  it('paginates by intent without locally slicing the returned server page', async () => {
    const fixture = await setup()
    const change = vi.fn()
    fixture.componentInstance.pageChange.subscribe(change)
    const buttons = fixture.nativeElement.querySelectorAll(
      'nav button',
    ) as NodeListOf<HTMLButtonElement>
    expect(buttons[0].disabled).toBe(true)
    buttons[1].click()
    expect(change).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 })
    expect(fixture.nativeElement.querySelectorAll('tbody [data-row-id]')).toHaveLength(1)
  })
  it('supports another domain, column configuration, and stable identity', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('rows', [{ code: 'v-8', plate: 'ABC' }])
    fixture.componentRef.setInput('columns', [{ accessorKey: 'plate', header: 'Plate' }])
    fixture.componentRef.setInput('rowId', (row: { code: string }) => row.code)
    fixture.componentRef.setInput('caption', 'Vehicles')
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('tbody tr')?.getAttribute('data-row-id')).toBe('v-8')
    expect(fixture.nativeElement.textContent).toContain('ABC')
    expect(fixture.nativeElement.textContent).not.toContain('Company Two')
  })
  it('omits page claims and paging controls for bounded unpaged server lists', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('showPagination', false)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('nav')).toBeNull()
    expect(fixture.nativeElement.textContent).toContain('Company Two')
  })
  it('renders mutually exclusive loading, empty, error and retry states', async () => {
    const fixture = await setup()
    fixture.componentRef.setInput('loading', true)
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Loading records...')
    expect(fixture.nativeElement.querySelector('[data-row-id]')).toBeNull()
    fixture.componentRef.setInput('loading', false)
    fixture.componentRef.setInput('rows', [])
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('No records found.')
    fixture.componentRef.setInput('error', 'Access denied')
    const retry = vi.fn()
    fixture.componentInstance.retry.subscribe(retry)
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).not.toContain('No records found.')
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain(
      'Access denied',
    )
    fixture.nativeElement.querySelector('[role=alert] button').click()
    expect(retry).toHaveBeenCalledOnce()
  })
})
