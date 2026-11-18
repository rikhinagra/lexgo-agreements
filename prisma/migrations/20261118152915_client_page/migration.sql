-- AlterTable
ALTER TABLE "Mou" ADD COLUMN     "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "signatureTyped" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "ip" TEXT;
