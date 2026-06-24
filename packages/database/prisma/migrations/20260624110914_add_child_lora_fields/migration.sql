-- AlterTable
ALTER TABLE "child_profiles" ADD COLUMN     "loraTrainedAt" TIMESTAMP(3),
ADD COLUMN     "loraTriggerWord" TEXT,
ADD COLUMN     "loraUrl" TEXT;