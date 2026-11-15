/**
 * Driver PWA Feature - Public API Exports
 * This file exposes the public API of the driver feature library
 */

// API & Types
export {
  DriverApi,
  DRIVER_IDENTITY,
  type DriverIdentity,
  type DriverRecord,
  type RouteCard,
  type ActiveTrip,
  type Station,
  type Passenger,
  type VehicleInfo,
  type RouteGeometry,
  type TripStartRequest,
  type StationArrivalRequest,
  type EndTripRequest,
  type DocumentUploadRequest,
} from './lib/driver-pwa-feature/driver.api'

// Login Config
export {
  DRIVER_LOGIN_LANGUAGE,
  DRIVER_SET_LANGUAGE,
} from './lib/driver-pwa-feature/driver.login-config'

// Routes & Guards
export {
  createDriverLoginRoutes,
  createDriverRoutes,
  driverRoleGuard,
  hasDriverAccess,
  type DriverFeatureConfig,
  DRIVER_FEATURE_CONFIG,
} from './lib/driver-pwa-feature/driver.routes'

// UI Components
export { DriverLoginPage } from './lib/ui/login.page'
export { DriverShell } from './lib/ui/driver-shell'
export { RouteSelectionPage } from './lib/ui/route-selection.page'
export { RouteManagementPage } from './lib/ui/route-management.page'
export { LiveTripMapPage } from './lib/ui/live-trip-map.page'
export { StationOperationsPage } from './lib/ui/station-operations.page'
export { DriverProfilePage } from './lib/ui/profile.page'
export { VehicleProfilePage } from './lib/ui/vehicle-profile.page'
export { DocumentUploadPage } from './lib/ui/document-upload.page'
export { SupportPage } from './lib/ui/support.page'
