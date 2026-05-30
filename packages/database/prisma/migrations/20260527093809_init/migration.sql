-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('BOY', 'GIRL', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "StoryTheme" AS ENUM ('ADVENTURE', 'LEARNING', 'PROFESSIONS', 'FESTIVALS', 'FAMILY_LOVE', 'IMAGINATION', 'BEDTIME');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ENGLISH', 'TAMIL', 'BILINGUAL');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('DRAFT', 'GENERATING_PREVIEW', 'PREVIEW_READY', 'GENERATING_FULL', 'PENDING_APPROVAL', 'APPROVED', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'REGEN_REQUESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'AWAITING_APPROVAL', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookFormat" AS ENUM ('SOFTCOVER', 'HARDCOVER', 'PREMIUM_HARDCOVER_GIFT_BOX');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PDF_GENERATING', 'PDF_READY', 'PRINTING', 'BINDING', 'QC_CHECK', 'READY_TO_SHIP', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REDEEMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "gender" "Gender" NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "skinTone" TEXT,
    "hairColor" TEXT,
    "hasGlasses" BOOLEAN NOT NULL DEFAULT false,
    "referencePhotoUrls" TEXT[],
    "faceEmbedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleTamil" TEXT,
    "description" TEXT NOT NULL,
    "descriptionTamil" TEXT,
    "coverImageUrl" TEXT,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "theme" "StoryTheme" NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 28,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "basePriceInr" INTEGER NOT NULL,
    "premiumPriceInr" INTEGER NOT NULL,
    "giftPriceInr" INTEGER NOT NULL,
    "artStyle" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_page_templates" (
    "id" TEXT NOT NULL,
    "storyTemplateId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "textEnglish" TEXT NOT NULL,
    "textTamil" TEXT,
    "illustrationPrompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "styleTokens" JSONB NOT NULL,
    "isCoverPage" BOOLEAN NOT NULL DEFAULT false,
    "isPreviewPage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "storyTemplateId" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'ENGLISH',
    "status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
    "previewGeneratedAt" TIMESTAMP(3),
    "fullGeneratedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "totalImageGenCostCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_pages" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "finalImageUrl" TEXT,
    "generationAttempts" JSONB[],
    "status" "PageStatus" NOT NULL DEFAULT 'PENDING',
    "generationCostCents" INTEGER,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "book_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotalInr" INTEGER NOT NULL,
    "discountInr" INTEGER NOT NULL DEFAULT 0,
    "shippingInr" INTEGER NOT NULL DEFAULT 0,
    "taxInr" INTEGER NOT NULL DEFAULT 0,
    "totalInr" INTEGER NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "courier" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "format" "BookFormat" NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "giftMessage" TEXT,
    "giftWrap" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "printReadyPdfUrl" TEXT,
    "coverPdfUrl" TEXT,
    "interiorPdfUrl" TEXT,
    "pressOperator" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyTemplateId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "referralCode" TEXT NOT NULL,
    "rewardAmountInr" INTEGER NOT NULL DEFAULT 20000,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resendId" TEXT,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "bookId" TEXT,
    "pageNumber" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "imageCount" INTEGER,
    "costCents" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "story_templates_slug_key" ON "story_templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "story_page_templates_storyTemplateId_pageNumber_key" ON "story_page_templates"("storyTemplateId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "book_pages_bookId_pageNumber_key" ON "book_pages"("bookId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayOrderId_key" ON "orders"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayPaymentId_key" ON "orders"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_bookId_key" ON "order_items"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_orderItemId_key" ON "print_jobs"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralCode_key" ON "referrals"("referralCode");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_page_templates" ADD CONSTRAINT "story_page_templates_storyTemplateId_fkey" FOREIGN KEY ("storyTemplateId") REFERENCES "story_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "child_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_storyTemplateId_fkey" FOREIGN KEY ("storyTemplateId") REFERENCES "story_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
