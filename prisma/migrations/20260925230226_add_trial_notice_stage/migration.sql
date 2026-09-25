-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logo" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" DATETIME,
    "trialNoticeStage" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Company" ("createdAt", "currentPeriodEnd", "description", "email", "id", "logo", "name", "phone", "slug", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "trialEndsAt", "updatedAt") SELECT "createdAt", "currentPeriodEnd", "description", "email", "id", "logo", "name", "phone", "slug", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "trialEndsAt", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
