// app/[locale]/expenses/edit/page.tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { type Locale } from "@/i18n"
import ExpenseForm from "@/components/expenses/ExpenseForm"
import { auth } from "@clerk/nextjs/server"

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ id?: string }>
}) {
  const { locale } = await params
  const { id } = await searchParams

  if (!id) {
    notFound()
  }

  const { userId } = await auth()
  if (!userId) {
    notFound()
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    notFound()
  }

  const expense = await prisma.expense.findUnique({
    where: { id, userId: user.id },
    include: {
      photoRef: true,
    },
  })

  if (!expense) {
    notFound()
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  })

  const initialData = {
    id: expense.id,
    title: expense.title,
    amount: Number(expense.amount),
    currency: expense.currency,
    fxToBase: Number(expense.fxToBase),
    date: expense.date.toISOString().slice(0, 10),
    note: expense.note,
    categoryId: expense.categoryId,
    photoUrl: expense.photoRef[0]?.url ?? null,
  }

  // TODO: once we store user’s saved rates, load them here
  const savedRatesByCurrency: Record<string, number> = {}

  return (
    <main className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-semibold">Edit expense</h1>
      <ExpenseForm
        locale={locale}
        mode="edit"
        initialData={initialData}
        categories={categories}
        baseCurrency={user.baseCurrency}
        savedRatesByCurrency={savedRatesByCurrency}
      />
    </main>
  )
}
