UPDATE "Product"
SET "priceUpdatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'APPROVED';