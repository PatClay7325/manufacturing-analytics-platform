/*
  Warnings:

  - You are about to drop the column `equipmentId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `equipmentId` on the `MaintenanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `equipmentId` on the `PerformanceMetric` table. All the data in the column will be lost.
  - You are about to drop the column `productionLineId` on the `PerformanceMetric` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PerformanceMetric` table. All the data in the column will be lost.
  - You are about to drop the column `productionLineId` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the column `equipmentId` on the `QualityMetric` table. All the data in the column will be lost.
  - You are about to drop the `Equipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductionLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EquipmentToProductionLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dashboards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `metrics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `workUnitId` to the `MaintenanceRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workUnitId` to the `PerformanceMetric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workCenterId` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workUnitId` to the `QualityMetric` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRecord" DROP CONSTRAINT "MaintenanceRecord_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_productionLineId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionOrder" DROP CONSTRAINT "ProductionOrder_productionLineId_fkey";

-- DropForeignKey
ALTER TABLE "QualityMetric" DROP CONSTRAINT "QualityMetric_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "_EquipmentToProductionLine" DROP CONSTRAINT "_EquipmentToProductionLine_A_fkey";

-- DropForeignKey
ALTER TABLE "_EquipmentToProductionLine" DROP CONSTRAINT "_EquipmentToProductionLine_B_fkey";

-- DropForeignKey
ALTER TABLE "dashboards" DROP CONSTRAINT "dashboards_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_equipmentId_fkey";

-- DropIndex
DROP INDEX "Alert_equipmentId_idx";

-- DropIndex
DROP INDEX "Alert_timestamp_idx";

-- DropIndex
DROP INDEX "MaintenanceRecord_equipmentId_idx";

-- DropIndex
DROP INDEX "PerformanceMetric_equipmentId_timestamp_idx";

-- DropIndex
DROP INDEX "PerformanceMetric_productionLineId_timestamp_idx";

-- DropIndex
DROP INDEX "ProductionOrder_productionLineId_idx";

-- DropIndex
DROP INDEX "QualityMetric_equipmentId_timestamp_idx";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "equipmentId",
ADD COLUMN     "workUnitId" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceRecord" DROP COLUMN "equipmentId",
ADD COLUMN     "workUnitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PerformanceMetric" DROP COLUMN "equipmentId",
DROP COLUMN "productionLineId",
DROP COLUMN "updatedAt",
ADD COLUMN     "workUnitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "productionLineId",
ADD COLUMN     "workCenterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QualityMetric" DROP COLUMN "equipmentId",
ADD COLUMN     "workUnitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "siteId" TEXT;

-- DropTable
DROP TABLE "Equipment";

-- DropTable
DROP TABLE "ProductionLine";

-- DropTable
DROP TABLE "_EquipmentToProductionLine";

-- DropTable
DROP TABLE "dashboards";

-- DropTable
DROP TABLE "metrics";

-- CreateTable
CREATE TABLE "Enterprise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enterprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseKPISummary" (
    "id" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "mtbf" DOUBLE PRECISION NOT NULL,
    "mttr" DOUBLE PRECISION NOT NULL,
    "productionCount" BIGINT NOT NULL,
    "scrapRate" DOUBLE PRECISION NOT NULL,
    "energyConsumption" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteKPISummary" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "mtbf" DOUBLE PRECISION NOT NULL,
    "mttr" DOUBLE PRECISION NOT NULL,
    "productionCount" BIGINT NOT NULL,
    "scrapRate" DOUBLE PRECISION NOT NULL,
    "energyConsumption" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaKPISummary" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "mtbf" DOUBLE PRECISION NOT NULL,
    "mttr" DOUBLE PRECISION NOT NULL,
    "productionCount" BIGINT NOT NULL,
    "scrapRate" DOUBLE PRECISION NOT NULL,
    "energyConsumption" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCenter" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCenterKPISummary" (
    "id" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "mtbf" DOUBLE PRECISION NOT NULL,
    "mttr" DOUBLE PRECISION NOT NULL,
    "productionCount" BIGINT NOT NULL,
    "scrapRate" DOUBLE PRECISION NOT NULL,
    "energyConsumption" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCenterKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkUnit" (
    "id" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "manufacturerCode" TEXT NOT NULL,
    "installationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'operational',
    "location" TEXT,
    "description" TEXT,
    "lastMaintenanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkUnitKPISummary" (
    "id" TEXT NOT NULL,
    "workUnitId" TEXT NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "mtbf" DOUBLE PRECISION NOT NULL,
    "mttr" DOUBLE PRECISION NOT NULL,
    "productionCount" BIGINT NOT NULL,
    "scrapRate" DOUBLE PRECISION NOT NULL,
    "energyConsumption" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkUnitKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DowntimeCause" (
    "id" TEXT NOT NULL,
    "workUnitId" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionData" (
    "id" TEXT NOT NULL,
    "workUnitId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productionDataId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cycleTime" INTEGER NOT NULL,
    "output" INTEGER NOT NULL,
    "rejects" INTEGER NOT NULL,
    "oee" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "workUnitId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "tags" JSONB,
    "source" TEXT,
    "quality" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "panels" JSONB NOT NULL,
    "variables" JSONB,
    "time" JSONB,
    "refresh" TEXT,
    "tags" TEXT[],
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enterprise_code_key" ON "Enterprise"("code");

-- CreateIndex
CREATE INDEX "Enterprise_code_idx" ON "Enterprise"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseKPISummary_enterpriseId_key" ON "EnterpriseKPISummary"("enterpriseId");

-- CreateIndex
CREATE INDEX "EnterpriseKPISummary_enterpriseId_periodStart_periodEnd_idx" ON "EnterpriseKPISummary"("enterpriseId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "Site_enterpriseId_idx" ON "Site"("enterpriseId");

-- CreateIndex
CREATE INDEX "Site_code_idx" ON "Site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SiteKPISummary_siteId_key" ON "SiteKPISummary"("siteId");

-- CreateIndex
CREATE INDEX "SiteKPISummary_siteId_periodStart_periodEnd_idx" ON "SiteKPISummary"("siteId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Area_code_key" ON "Area"("code");

-- CreateIndex
CREATE INDEX "Area_siteId_idx" ON "Area"("siteId");

-- CreateIndex
CREATE INDEX "Area_code_idx" ON "Area"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AreaKPISummary_areaId_key" ON "AreaKPISummary"("areaId");

-- CreateIndex
CREATE INDEX "AreaKPISummary_areaId_periodStart_periodEnd_idx" ON "AreaKPISummary"("areaId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_code_key" ON "WorkCenter"("code");

-- CreateIndex
CREATE INDEX "WorkCenter_areaId_idx" ON "WorkCenter"("areaId");

-- CreateIndex
CREATE INDEX "WorkCenter_code_idx" ON "WorkCenter"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenterKPISummary_workCenterId_key" ON "WorkCenterKPISummary"("workCenterId");

-- CreateIndex
CREATE INDEX "WorkCenterKPISummary_workCenterId_periodStart_periodEnd_idx" ON "WorkCenterKPISummary"("workCenterId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WorkUnit_code_key" ON "WorkUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkUnit_serialNumber_key" ON "WorkUnit"("serialNumber");

-- CreateIndex
CREATE INDEX "WorkUnit_workCenterId_idx" ON "WorkUnit"("workCenterId");

-- CreateIndex
CREATE INDEX "WorkUnit_code_idx" ON "WorkUnit"("code");

-- CreateIndex
CREATE INDEX "WorkUnit_equipmentType_idx" ON "WorkUnit"("equipmentType");

-- CreateIndex
CREATE INDEX "WorkUnit_status_idx" ON "WorkUnit"("status");

-- CreateIndex
CREATE INDEX "WorkUnit_serialNumber_idx" ON "WorkUnit"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkUnitKPISummary_workUnitId_key" ON "WorkUnitKPISummary"("workUnitId");

-- CreateIndex
CREATE INDEX "WorkUnitKPISummary_workUnitId_periodStart_periodEnd_idx" ON "WorkUnitKPISummary"("workUnitId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "DowntimeCause_workUnitId_periodStart_periodEnd_idx" ON "DowntimeCause"("workUnitId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "DowntimeCause_cause_idx" ON "DowntimeCause"("cause");

-- CreateIndex
CREATE INDEX "ProductionData_workUnitId_year_month_idx" ON "ProductionData"("workUnitId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionData_workUnitId_year_month_key" ON "ProductionData"("workUnitId", "year", "month");

-- CreateIndex
CREATE INDEX "Product_productionDataId_idx" ON "Product"("productionDataId");

-- CreateIndex
CREATE INDEX "Product_partNumber_idx" ON "Product"("partNumber");

-- CreateIndex
CREATE INDEX "Metric_workUnitId_name_timestamp_idx" ON "Metric"("workUnitId", "name", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "Metric_timestamp_idx" ON "Metric"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Metric_name_timestamp_idx" ON "Metric"("name", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_uid_key" ON "Dashboard"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_slug_key" ON "Dashboard"("slug");

-- CreateIndex
CREATE INDEX "Dashboard_slug_idx" ON "Dashboard"("slug");

-- CreateIndex
CREATE INDEX "Dashboard_tags_idx" ON "Dashboard"("tags");

-- CreateIndex
CREATE INDEX "Alert_workUnitId_idx" ON "Alert"("workUnitId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_workUnitId_idx" ON "MaintenanceRecord"("workUnitId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_workUnitId_timestamp_idx" ON "PerformanceMetric"("workUnitId", "timestamp");

-- CreateIndex
CREATE INDEX "ProductionOrder_workCenterId_idx" ON "ProductionOrder"("workCenterId");

-- CreateIndex
CREATE INDEX "QualityMetric_workUnitId_timestamp_idx" ON "QualityMetric"("workUnitId", "timestamp");

-- CreateIndex
CREATE INDEX "User_siteId_idx" ON "User"("siteId");

-- AddForeignKey
ALTER TABLE "EnterpriseKPISummary" ADD CONSTRAINT "EnterpriseKPISummary_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteKPISummary" ADD CONSTRAINT "SiteKPISummary_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaKPISummary" ADD CONSTRAINT "AreaKPISummary_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCenter" ADD CONSTRAINT "WorkCenter_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCenterKPISummary" ADD CONSTRAINT "WorkCenterKPISummary_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkUnit" ADD CONSTRAINT "WorkUnit_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkUnitKPISummary" ADD CONSTRAINT "WorkUnitKPISummary_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DowntimeCause" ADD CONSTRAINT "DowntimeCause_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionData" ADD CONSTRAINT "ProductionData_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productionDataId_fkey" FOREIGN KEY ("productionDataId") REFERENCES "ProductionData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityMetric" ADD CONSTRAINT "QualityMetric_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_workUnitId_fkey" FOREIGN KEY ("workUnitId") REFERENCES "WorkUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
