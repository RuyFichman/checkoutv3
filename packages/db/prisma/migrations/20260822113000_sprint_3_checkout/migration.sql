-- AlterEnum
ALTER TYPE "CheckoutEventType" ADD VALUE 'RECEIPT_UPLOADED';

-- AlterTable
ALTER TABLE "CheckoutSession"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "subtotalInCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalInCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unitPriceInCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "receiptFileName" TEXT,
ADD COLUMN "receiptUploadedAt" TIMESTAMP(3),
ADD COLUMN "receiptUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_productId_visitorId_key"
ON "CheckoutSession"("productId", "visitorId");
