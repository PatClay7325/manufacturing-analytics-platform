// Re-export the LiveManufacturingDashboard as the default ManufacturingDashboard
// This ensures all pages using ManufacturingDashboard get live Prisma data
export { LiveManufacturingDashboard as default, LiveManufacturingDashboard as ManufacturingDashboard } from './LiveManufacturingDashboard';