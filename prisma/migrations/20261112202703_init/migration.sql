-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('ADVANCE', 'ARREARS');

-- CreateEnum
CREATE TYPE "MouStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('INITIAL', 'MONTHLY', 'FINAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mou" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "MouStatus" NOT NULL DEFAULT 'DRAFT',
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "agents" INTEGER NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "billingMode" "BillingMode" NOT NULL DEFAULT 'ADVANCE',
    "paymentDueDays" INTEGER NOT NULL DEFAULT 7,
    "governingLaw" TEXT,
    "paymentMethod" TEXT,
    "customScope" TEXT,
    "clientEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ NOT NULL,
    "tokenRevokedAt" TIMESTAMPTZ,
    "sentAt" TIMESTAMPTZ,
    "viewedAt" TIMESTAMPTZ,
    "signedAt" TIMESTAMPTZ,
    "startDate" DATE,
    "signerName" TEXT,
    "signerTitle" TEXT,
    "signerEmail1" TEXT,
    "signerPhone1" TEXT,
    "signerEmail2" TEXT,
    "signerPhone2" TEXT,
    "signerIp" TEXT,
    "signerUserAgent" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ,
    "termsVersion" TEXT,
    "documentHash" TEXT,
    "providerLegalName" TEXT,
    "providerSignatoryName" TEXT,
    "providerSignatoryTitle" TEXT,
    "terminationNoticeAt" TIMESTAMPTZ,
    "endDate" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Mou_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "mouId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "replyEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentChange" (
    "id" TEXT NOT NULL,
    "mouId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "agentsAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "mouId" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "serviceYear" INTEGER NOT NULL,
    "serviceMonth" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "daysBilled" INTEGER NOT NULL,
    "daysInMonth" INTEGER NOT NULL,
    "agents" INTEGER NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "sentAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "voidedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "yearMonth" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("yearMonth")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "toAddresses" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "error" TEXT,
    "mouId" TEXT,
    "invoiceId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mou_tokenHash_key" ON "Mou"("tokenHash");

-- CreateIndex
CREATE INDEX "Mou_status_idx" ON "Mou"("status");

-- CreateIndex
CREATE INDEX "Mou_clientId_idx" ON "Mou"("clientId");

-- CreateIndex
CREATE INDEX "Question_mouId_idx" ON "Question"("mouId");

-- CreateIndex
CREATE INDEX "AgentChange_mouId_effectiveDate_idx" ON "AgentChange"("mouId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_mouId_serviceYear_serviceMonth_kind_key" ON "Invoice"("mouId", "serviceYear", "serviceMonth", "kind");

-- CreateIndex
CREATE INDEX "EmailLog_mouId_idx" ON "EmailLog"("mouId");

-- CreateIndex
CREATE INDEX "EmailLog_invoiceId_idx" ON "EmailLog"("invoiceId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Mou" ADD CONSTRAINT "Mou_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_mouId_fkey" FOREIGN KEY ("mouId") REFERENCES "Mou"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentChange" ADD CONSTRAINT "AgentChange_mouId_fkey" FOREIGN KEY ("mouId") REFERENCES "Mou"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_mouId_fkey" FOREIGN KEY ("mouId") REFERENCES "Mou"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
