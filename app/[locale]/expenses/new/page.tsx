// app/[locale]/expenses/new/page.tsx
import { type Locale } from "@/i18n"
import ExpenseForm from "@/components/expenses/ExpenseForm"
import { getAuthUserWithCategories } from "@/lib/authUser"

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  // Get authenticated user + their categories
  const { user, categories } = await getAuthUserWithCategories()

  // TODO: Once we build the converter & saved rates, replace this
  const savedRatesByCurrency: Record<string, number> = {}

  return (
    <main className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-semibold">New expense</h1>
      <p className="text-sm text-gray-600">Add a personal expense.</p>

      <ExpenseForm
        locale={locale}
        mode="create"
        categories={categories}
        baseCurrency={user.baseCurrency}
        savedRatesByCurrency={savedRatesByCurrency}
      />
    </main>
  )
}
