export { VehiclesApi, provideVehiclesData, VEHICLES_ACCESS_DENIED } from './lib/vehicles-api'
export type {
  VehicleAccessRequest,
  VehiclesAuthorize,
  VehiclesDataConfig,
} from './lib/vehicles-api'
export { VehiclesStore } from './lib/vehicles.store'
export type { VehicleDetailStatus, VehicleSaveOutcome } from './lib/vehicles.store'
export {
  CAR_DOCUMENT_FIELDS,
  CAR_MAX_BODY_BYTES,
  carTypeId,
  carCompanyId,
  carId,
  carTypeWrite,
  decodeCarType,
  decodeVehicleDetail,
  decodeVehicleRow,
  vehicleWrite,
  vehicleTypeId,
} from './lib/vehicle.models'
export type {
  CarDocumentField,
  CarType,
  CarTypeId,
  CarTypeDraft,
  VehicleCompanyId,
  VehicleDetail,
  VehicleDraft,
  VehicleId,
  VehicleImagePayload,
  VehicleRow,
  VehicleSearch,
  VehicleTypeId,
  VehicleWriteBody,
} from './lib/vehicle.models'
