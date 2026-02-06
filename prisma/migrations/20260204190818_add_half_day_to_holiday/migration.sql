-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OfficialHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OfficialHoliday" ("createdAt", "date", "description", "id", "updatedAt") SELECT "createdAt", "date", "description", "id", "updatedAt" FROM "OfficialHoliday";
DROP TABLE "OfficialHoliday";
ALTER TABLE "new_OfficialHoliday" RENAME TO "OfficialHoliday";
CREATE UNIQUE INDEX "OfficialHoliday_date_key" ON "OfficialHoliday"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
