-- CreateTable
CREATE TABLE "PlugCategoryRating" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlugCategoryRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackDiscovery" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "totalSwipes" INTEGER NOT NULL DEFAULT 0,
    "lastAction" TEXT,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RejectedProduct" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcceptedProduct" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcceptedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlugCategoryRating_plugId_idx" ON "PlugCategoryRating"("plugId");

-- CreateIndex
CREATE INDEX "PlugCategoryRating_category_idx" ON "PlugCategoryRating"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PlugCategoryRating_plugId_category_key" ON "PlugCategoryRating"("plugId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TrackDiscovery_plugId_key" ON "TrackDiscovery"("plugId");

-- CreateIndex
CREATE INDEX "TrackDiscovery_plugId_idx" ON "TrackDiscovery"("plugId");

-- CreateIndex
CREATE INDEX "RejectedProduct_plugId_idx" ON "RejectedProduct"("plugId");

-- CreateIndex
CREATE INDEX "RejectedProduct_productId_idx" ON "RejectedProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedProduct_plugId_productId_key" ON "RejectedProduct"("plugId", "productId");

-- CreateIndex
CREATE INDEX "AcceptedProduct_plugId_idx" ON "AcceptedProduct"("plugId");

-- CreateIndex
CREATE INDEX "AcceptedProduct_productId_idx" ON "AcceptedProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AcceptedProduct_plugId_productId_key" ON "AcceptedProduct"("plugId", "productId");
