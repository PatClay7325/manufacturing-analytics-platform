-- CreateTable
CREATE TABLE "Equipment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "manufacturerCode" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "installationDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'operational',
  "location" TEXT,
  "description" TEXT,
  "model" TEXT,
  "lastMaintenanceAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "productionLineId" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "targetStartDate" TIMESTAMP(3) NOT NULL,
  "targetEndDate" TIMESTAMP(3) NOT NULL,
  "actualStartDate" TIMESTAMP(3),
  "actualEndDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "priority" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "maintenanceType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "technician" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "parts" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT,
  "productionLineId" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "availability" DOUBLE PRECISION,
  "performance" DOUBLE PRECISION,
  "quality" DOUBLE PRECISION,
  "oeeScore" DOUBLE PRECISION,
  "runTime" DOUBLE PRECISION,
  "plannedDowntime" DOUBLE PRECISION,
  "unplannedDowntime" DOUBLE PRECISION,
  "idealCycleTime" DOUBLE PRECISION,
  "actualCycleTime" DOUBLE PRECISION,
  "totalParts" INTEGER,
  "goodParts" INTEGER,
  "shift" TEXT,
  "operator" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityMetric" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "parameter" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "uom" TEXT NOT NULL,
  "lowerLimit" DOUBLE PRECISION,
  "upperLimit" DOUBLE PRECISION,
  "nominal" DOUBLE PRECISION,
  "isWithinSpec" BOOLEAN NOT NULL,
  "deviation" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QualityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityCheck" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "checkType" TEXT NOT NULL,
  "inspector" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result" TEXT NOT NULL,
  "notes" TEXT,
  "defectTypes" TEXT[],
  "defectCounts" INTEGER[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT,
  "alertType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "department" TEXT,
  "passwordHash" TEXT NOT NULL,
  "lastLogin" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EquipmentToProductionLine" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");

-- CreateIndex
CREATE INDEX "Equipment_serialNumber_idx" ON "Equipment"("serialNumber");

-- CreateIndex
CREATE INDEX "Equipment_type_idx" ON "Equipment"("type");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "ProductionLine_department_idx" ON "ProductionLine"("department");

-- CreateIndex
CREATE INDEX "ProductionLine_status_idx" ON "ProductionLine"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ProductionOrder_productionLineId_idx" ON "ProductionOrder"("productionLineId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_orderNumber_idx" ON "ProductionOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_idx" ON "MaintenanceRecord"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_status_idx" ON "MaintenanceRecord"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_maintenanceType_idx" ON "MaintenanceRecord"("maintenanceType");

-- CreateIndex
CREATE INDEX "PerformanceMetric_equipmentId_timestamp_idx" ON "PerformanceMetric"("equipmentId", "timestamp");

-- CreateIndex
CREATE INDEX "PerformanceMetric_productionLineId_timestamp_idx" ON "PerformanceMetric"("productionLineId", "timestamp");

-- CreateIndex
CREATE INDEX "PerformanceMetric_timestamp_idx" ON "PerformanceMetric"("timestamp");

-- CreateIndex
CREATE INDEX "QualityMetric_equipmentId_timestamp_idx" ON "QualityMetric"("equipmentId", "timestamp");

-- CreateIndex
CREATE INDEX "QualityMetric_parameter_idx" ON "QualityMetric"("parameter");

-- CreateIndex
CREATE INDEX "QualityMetric_isWithinSpec_idx" ON "QualityMetric"("isWithinSpec");

-- CreateIndex
CREATE INDEX "QualityCheck_productionOrderId_idx" ON "QualityCheck"("productionOrderId");

-- CreateIndex
CREATE INDEX "QualityCheck_result_idx" ON "QualityCheck"("result");

-- CreateIndex
CREATE INDEX "QualityCheck_checkType_idx" ON "QualityCheck"("checkType");

-- CreateIndex
CREATE INDEX "Alert_equipmentId_idx" ON "Alert"("equipmentId");

-- CreateIndex
CREATE INDEX "Alert_alertType_idx" ON "Alert"("alertType");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_timestamp_idx" ON "Alert"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_category_idx" ON "Setting"("category");

-- CreateIndex
CREATE UNIQUE INDEX "_EquipmentToProductionLine_AB_unique" ON "_EquipmentToProductionLine"("A", "B");

-- CreateIndex
CREATE INDEX "_EquipmentToProductionLine_B_index" ON "_EquipmentToProductionLine"("B");

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "ProductionLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityMetric" ADD CONSTRAINT "QualityMetric_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToProductionLine" ADD CONSTRAINT "_EquipmentToProductionLine_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToProductionLine" ADD CONSTRAINT "_EquipmentToProductionLine_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductionLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;