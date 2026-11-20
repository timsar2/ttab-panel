import { isDevMode } from '@angular/core'
import { developmentEnvironment, productionEnvironment } from '@org/platform/config'
import { environment } from './environment'

describe('Inspection environment selection', () => {
  it('selects the dev or production API according to the Angular build mode', () => {
    expect(environment).toBe(isDevMode() ? developmentEnvironment : productionEnvironment)
  })
})
