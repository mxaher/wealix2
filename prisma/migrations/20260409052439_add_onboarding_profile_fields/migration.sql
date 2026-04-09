-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'none',
    "subscriptionEndsAt" DATETIME,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "notificationChannel" TEXT,
    "monthlyIncome" REAL,
    "riskTolerance" TEXT,
    "preferredMarkets" TEXT,
    "retirementAge" INTEGER,
    "currentAge" INTEGER,
    "retirementGoal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Liability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioHolding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "avgCostPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "isShariahCompliant" BOOLEAN NOT NULL DEFAULT true,
    "sector" TEXT,
    "country" TEXT NOT NULL DEFAULT 'SA',
    "securityType" TEXT NOT NULL DEFAULT 'stock',
    "units" REAL,
    "purchasePricePerUnit" REAL,
    "currentUnitPrice" REAL,
    "goldForm" TEXT,
    "grams" REAL,
    "karat" TEXT,
    "purchasePricePerGram" REAL,
    "currentPricePerGram" REAL,
    "assetName" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortfolioHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "holdingId" TEXT,
    "type" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "shares" REAL NOT NULL,
    "price" REAL NOT NULL,
    "fees" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "PortfolioHolding" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyLimit" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "month" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "date" DATETIME NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "month" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FireGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentNetWorth" REAL NOT NULL,
    "annualExpenses" REAL NOT NULL,
    "withdrawalRate" REAL NOT NULL DEFAULT 4.0,
    "expectedReturn" REAL NOT NULL DEFAULT 7.0,
    "inflationRate" REAL NOT NULL DEFAULT 3.0,
    "annualSavings" REAL NOT NULL,
    "targetDate" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FireGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetirementPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentAge" INTEGER NOT NULL,
    "retirementAge" INTEGER NOT NULL DEFAULT 60,
    "currentSavings" REAL NOT NULL,
    "monthlyContribution" REAL NOT NULL,
    "expectedReturn" REAL NOT NULL,
    "inflationRate" REAL NOT NULL DEFAULT 3.0,
    "targetMonthlyIncome" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetirementPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ticker" TEXT,
    "condition" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalAssets" REAL NOT NULL,
    "totalLiabilities" REAL NOT NULL,
    "netWorth" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetWorthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockTicker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "sector" TEXT,
    "isShariahCompliant" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL DEFAULT 'SA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "change" REAL NOT NULL,
    "changePercent" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SuggestionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueLower" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "meta" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FireGoal_userId_key" ON "FireGoal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RetirementPlan_userId_key" ON "RetirementPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTicker_ticker_key" ON "StockTicker"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_ticker_key" ON "MarketData"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "SuggestionEntry_type_status_idx" ON "SuggestionEntry"("type", "status");

-- CreateIndex
CREATE INDEX "SuggestionEntry_type_valueLower_idx" ON "SuggestionEntry"("type", "valueLower");

-- CreateIndex
CREATE INDEX "SuggestionEntry_submittedByUserId_type_createdAt_idx" ON "SuggestionEntry"("submittedByUserId", "type", "createdAt");
