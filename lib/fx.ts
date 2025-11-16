// lib/fx.ts
import { prisma } from "@/lib/prisma"

/**
 * Returns a map of latest rates for a given base currency.
 * Example: { JPY: 0.0091, THB: 0.0375 }
 */
export async function getSavedRatesMap(baseCurrency: string) {
  const rows = await prisma.fxRate.findMany({
    where: { base: baseCurrency },
    orderBy: { asOfDate: "desc" },
  })

  const map: Record<string, number> = {}

  for (const row of rows) {
    // First time we see this quote → keep the latest (because sorted desc)
    if (map[row.quote] == null) {
      map[row.quote] = Number(row.rate)
    }
  }

  return map
}
