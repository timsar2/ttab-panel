import { sameTag, type SheriffConfig } from '@softarc/sheriff-core'

export const config: SheriffConfig = {
  entryPoints: {
    'apps/panel/src': './apps/panel/src/main.ts',
    'apps/shop/src': './apps/shop/src/main.ts',
    'apps/api/src': './apps/api/src/main.ts',
  },

  enableBarrelLess: true,

  modules: {
    'apps/panel/src': ['scope:panel', 'type:app'],
    'apps/shop/src': ['scope:shop', 'type:app'],
    'apps/api/src': ['scope:api', 'type:app'],
    'apps/panel-e2e': ['scope:panel', 'type:e2e'],
    'apps/shop-e2e': ['scope:shop', 'type:e2e'],

    'libs/shared/auth/data-access/src': ['scope:shared', 'type:data'],
    'libs/shared/auth/feature/src': ['scope:shared', 'type:feature'],
    'libs/shared/layout/src': ['scope:shared', 'type:ui'],
    'libs/shared/ui/forms/src': ['scope:shared', 'type:ui'],

    'packages/shop/feature-<feature>/src': ['scope:shop', 'type:feature'],
    'packages/shop/data/src': ['scope:shop', 'type:data'],
    'packages/shop/shared-ui/src': ['scope:shop', 'type:ui'],
    'packages/api/<feature>/src': ['scope:api', 'type:feature'],
    'packages/shared/models/src': ['scope:shared', 'type:models'],

    'libs/spartan/<component>/src': ['scope:ui', 'type:ui'],
    '@spartan-ng/helm/*': ['scope:ui', 'type:ui'],
  },

  depRules: {
    root: '*',

    'scope:panel': [sameTag, 'scope:shared', 'scope:ui'],
    'scope:shop': [sameTag, 'scope:shared'],
    'scope:api': [sameTag, 'scope:shared'],
    'scope:shared': [sameTag, 'scope:ui'],
    'scope:ui': [sameTag],

    'type:app': ['type:feature', 'type:ui', 'type:data', 'type:models', 'type:util', 'type:state'],
    'type:feature': ['type:ui', 'type:data', 'type:models', 'type:util', 'type:state'],
    'type:ui': ['type:ui', 'type:models', 'type:util'],
    'type:data': ['type:data', 'type:models', 'type:util'],
    'type:state': ['type:models', 'type:util'],
    'type:models': [],
    'type:util': [],
    'type:e2e': '*',
    noTag: ['*'],
  },
}
