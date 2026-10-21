import { prisma } from "@/lib/prisma";

export interface AnalyticsOverviewData {
  tableCounts: Record<string, number>;
  totals: {
    totalQuotesValue: number;
    totalCollected: number;
    totalAiTokens: number;
    totalAiCostUsd: number;
    totalFinancialVolume: number;
  };
  latestActivity: {
    lastQuoteDate: string | null;
    lastMessageDate: string | null;
    lastTransactionDate: string | null;
  };
}

export async function getAnalyticsDataOverviewService(): Promise<AnalyticsOverviewData> {
  try {
    const [
      clientsCount,
      quotesCount,
      quoteConceptsCount,
      financialTransactionsCount,
      receiptsCount,
      whatsAppContactsCount,
      whatsAppMessagesCount,
      aiUsageLogsCount,
      materialsCount,
      productsCount,
      tasksCount,
      surveysCount,
      quoteTotals,
      aiTotals,
      financialTotals,
      lastQuote,
      lastMessage,
      lastTx
    ] = await Promise.all([
      prisma.client.count().catch(() => 0),
      prisma.quote.count().catch(() => 0),
      prisma.quoteConcept.count().catch(() => 0),
      prisma.financialTransaction.count({ where: { isDeleted: false } }).catch(() => 0),
      prisma.receipt.count().catch(() => 0),
      prisma.whatsAppContact.count().catch(() => 0),
      prisma.whatsAppMessage.count().catch(() => 0),
      prisma.aiUsageLog.count().catch(() => 0),
      prisma.material.count().catch(() => 0),
      prisma.product.count().catch(() => 0),
      prisma.task.count().catch(() => 0),
      prisma.surveyResponse.count().catch(() => 0),
      prisma.quote.aggregate({
        _sum: {
          total: true,
          realAmountCollected: true,
        },
        where: { active: true },
      }).catch(() => ({ _sum: { total: 0, realAmountCollected: 0 } })),
      prisma.aiUsageLog.aggregate({
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
      }).catch(() => ({ _sum: { totalTokens: 0, estimatedCost: 0 } })),
      prisma.financialTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: { isDeleted: false },
      }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.quote.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }).catch(() => null),
      prisma.whatsAppMessage.findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }).catch(() => null),
      prisma.financialTransaction.findFirst({
        orderBy: { date: "desc" },
        select: { date: true },
      }).catch(() => null),
    ]);

    return {
      tableCounts: {
        Quote: quotesCount,
        QuoteConcept: quoteConceptsCount,
        Client: clientsCount,
        FinancialTransaction: financialTransactionsCount,
        Receipt: receiptsCount,
        WhatsAppContact: whatsAppContactsCount,
        WhatsAppMessage: whatsAppMessagesCount,
        AiUsageLog: aiUsageLogsCount,
        Material: materialsCount,
        Product: productsCount,
        Task: tasksCount,
        SurveyResponse: surveysCount,
      },
      totals: {
        totalQuotesValue: quoteTotals._sum.total || 0,
        totalCollected: quoteTotals._sum.realAmountCollected || 0,
        totalAiTokens: aiTotals._sum.totalTokens || 0,
        totalAiCostUsd: aiTotals._sum.estimatedCost || 0,
        totalFinancialVolume: financialTotals._sum.amount || 0,
      },
      latestActivity: {
        lastQuoteDate: lastQuote?.createdAt ? lastQuote.createdAt.toISOString() : null,
        lastMessageDate: lastMessage?.timestamp ? lastMessage.timestamp.toISOString() : null,
        lastTransactionDate: lastTx?.date ? lastTx.date.toISOString() : null,
      },
    };
  } catch (error) {
    console.error("Error in getAnalyticsDataOverviewService:", error);
    return {
      tableCounts: {},
      totals: {
        totalQuotesValue: 0,
        totalCollected: 0,
        totalAiTokens: 0,
        totalAiCostUsd: 0,
        totalFinancialVolume: 0,
      },
      latestActivity: {
        lastQuoteDate: null,
        lastMessageDate: null,
        lastTransactionDate: null,
      },
    };
  }
}
