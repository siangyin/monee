// app/[locale]/converter/page.tsx
import { type Locale } from "@/i18n"
import { getAuthUserWithCategories } from "@/lib/authUser"
import { prisma } from "@/lib/prisma"
import CurrencyConverter from "@/components/converter/CurrencyConverter"

type PageProps = {
  params: { locale: Locale }
}

export default async function ConverterPage({ params }: PageProps) {
  const { locale } = await params
  const { user } = await getAuthUserWithCategories()

  // Load this user's saved rates (latest per base/quote)
  const savedRates = await prisma.fxRate.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      asOfDate: "desc",
    },
  })

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">
          Currency converter
        </h1>
        <p className="text-sm text-gray-600">
          Quickly check how much your spending currency is in your base currency
          and save your favourite rates.
        </p>
      </div>

      <CurrencyConverter
        locale={locale}
        baseCurrency={user.baseCurrency}
        savedRates={savedRates.map((r) => ({
          id: r.id,
          base: r.base,
          quote: r.quote,
          rate: Number(r.rate),
          asOfDate: r.asOfDate.toISOString(),
        }))}
      />
    </main>
  )
}
