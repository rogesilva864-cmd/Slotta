-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "channels" TEXT,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReminderSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "reviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewUrl" TEXT,
    "reviewDelayMinutes" INTEGER NOT NULL DEFAULT 120,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReminderSetting" ("companyId", "createdAt", "enabled", "id", "testMode", "updatedAt") SELECT "companyId", "createdAt", "enabled", "id", "testMode", "updatedAt" FROM "ReminderSetting";
DROP TABLE "ReminderSetting";
ALTER TABLE "new_ReminderSetting" RENAME TO "ReminderSetting";
CREATE UNIQUE INDEX "ReminderSetting_companyId_key" ON "ReminderSetting"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_appointmentId_key" ON "ReviewRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "ReviewRequest_companyId_createdAt_idx" ON "ReviewRequest"("companyId", "createdAt");
