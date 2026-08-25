-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "gatewayCredentialId" TEXT,
ADD COLUMN "qrCodeImage" TEXT,
ADD COLUMN "ticketUrl" TEXT;

-- CreateTable
CREATE TABLE "GatewayWebhookEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "gatewayCredentialId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "externalResourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_gatewayCredentialId_status_idx" ON "Payment"("gatewayCredentialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayWebhookEvent_gatewayCredentialId_externalEventId_key" ON "GatewayWebhookEvent"("gatewayCredentialId", "externalEventId");

-- CreateIndex
CREATE INDEX "GatewayWebhookEvent_workspaceId_receivedAt_idx" ON "GatewayWebhookEvent"("workspaceId", "receivedAt");

-- CreateIndex
CREATE INDEX "GatewayWebhookEvent_provider_externalResourceId_idx" ON "GatewayWebhookEvent"("provider", "externalResourceId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gatewayCredentialId_fkey" FOREIGN KEY ("gatewayCredentialId") REFERENCES "GatewayCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayWebhookEvent" ADD CONSTRAINT "GatewayWebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayWebhookEvent" ADD CONSTRAINT "GatewayWebhookEvent_gatewayCredentialId_fkey" FOREIGN KEY ("gatewayCredentialId") REFERENCES "GatewayCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
