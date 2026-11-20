import { sameTag, type SheriffConfig } from '@softarc/sheriff-core'

const applicationScopes = [
  sameTag,
  'scope:shared',
  'scope:ui',
  'scope:transport',
  'scope:platform',
] as const

const featureDependencies = [
  'type:feature',
  'type:ui',
  'type:data',
  'type:models',
  'type:util',
  'type:state',
] as const

const uiDependencies = ['type:ui', 'type:models', 'type:util'] as const

const dataDependencies = ['type:data', 'type:models', 'type:util'] as const

export const config = {
  entryPoints: {
    'apps/panel/src': './apps/panel/src/main.ts',
    'apps/inspection/src': './apps/inspection/src/main.ts',
    'apps/driver/src': './apps/driver/src/main.ts',
    'apps/passenger/src': './apps/passenger/src/main.ts',
    'apps/shop/src': './apps/shop/src/main.ts',
    'apps/api/src': './apps/api/src/main.ts',
  },

  enableBarrelLess: true,

  modules: {
    'apps/<app>/src': ['scope:<app>', 'type:app'],

    'apps/panel-e2e': ['scope:panel', 'type:e2e'],
    'apps/inspection-e2e': ['scope:inspection', 'type:e2e'],
    'apps/shop-e2e': ['scope:shop', 'type:e2e'],

    'libs/shared/auth/data-access/src': ['scope:shared', 'type:data'],
    'libs/shared/auth/data-access/src/<module>': ['scope:shared', 'type:data'],
    'libs/shared/auth/feature/src': ['scope:shared', 'type:feature'],

    'libs/shared/layout/src': ['scope:shared', 'type:ui'],
    'libs/shared/ui/<component>/src': ['scope:shared', 'type:ui'],
    'libs/shared/maps/src': ['scope:shared', 'type:ui'],
    'libs/shared/route-geometry/src': ['scope:shared', 'type:util'],
    'libs/shared/tracking/src': ['scope:shared', 'type:util'],

    'libs/shared/theme/data-access/src': ['scope:shared', 'type:data'],
    'libs/shared/theme/ui/src': ['scope:shared', 'type:feature'],

    'libs/shared/platform/src': ['scope:platform', 'type:feature'],
    'libs/shared/platform/src/<module>': ['scope:platform', 'type:feature'],
    'libs/shared/platform/src/config': ['scope:platform', 'type:feature'],

    'libs/transport/http/src': ['scope:transport', 'type:data'],
    'libs/transport/<domain>/data-access/src': ['scope:transport', 'type:data'],
    'libs/transport/<domain>/feature/src': ['scope:transport', 'type:feature'],

    'libs/panel/<domain>/src': ['scope:panel', 'type:feature'],
    'libs/panel/feature/<domain>/src': ['scope:panel', 'type:feature'],
    'libs/inspection/feature/<feature>/src': ['scope:inspection', 'type:feature'],
    'libs/passenger/feature/src': ['scope:passenger', 'type:feature'],
    'libs/driver/feature/src': ['scope:driver', 'type:feature'],

    'packages/shop/feature-<feature>/src': ['scope:shop', 'type:feature'],
    'packages/shop/data/src': ['scope:shop', 'type:data'],
    'packages/shop/shared-ui/src': ['scope:shop', 'type:ui'],

    'packages/api/<feature>/src': ['scope:api', 'type:feature'],
    'packages/shared/models/src': ['scope:shared', 'type:models'],

    'libs/spartan/<component>/src': ['scope:ui', 'type:ui'],
    '@spartan-ng/helm/*': ['scope:ui', 'type:ui'],
    '@org/platform': ['scope:platform', 'type:feature'],
    '@org/platform/*': ['scope:platform', 'type:feature'],
  },

  depRules: {
    root: '*',

    'scope:panel': [...applicationScopes],
    'scope:inspection': [...applicationScopes],
    'scope:driver': [...applicationScopes],
    'scope:passenger': [...applicationScopes],

    'scope:platform': [sameTag, 'scope:shared', 'scope:ui', 'scope:transport'],

    'scope:shop': [sameTag, 'scope:shared'],
    'scope:api': [sameTag, 'scope:shared'],

    'scope:shared': [sameTag, 'scope:ui'],

    'scope:transport': [sameTag, 'scope:shared', 'scope:ui'],

    'scope:ui': [sameTag],

    'type:app': [...featureDependencies],
    'type:feature': [...featureDependencies],

    'type:ui': [...uiDependencies],
    'type:data': [...dataDependencies],

    'type:state': ['type:models', 'type:util'],

    'type:models': [],
    'type:util': [],

    'type:e2e': '*',

    noTag: ['*'],
  },
} satisfies SheriffConfig
