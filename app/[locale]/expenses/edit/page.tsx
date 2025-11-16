// app/[locale]/expenses/edit/page.tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { type Locale } from "@/i18n"
import ExpenseForm from "@/components/expenses/ExpenseForm"
import { expenseCurrencies } from "@/lib/validation/expense"
import { auth } from "@clerk/nextjs/server"

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ id?: string; groupId?: string }>
}) {
  const { locale } = await params
  const { id, groupId } = await searchParams

  if (!id) {
    notFound()
  }

  const { userId } = await auth()
  if (!userId) {
    // not signed in → let our auth flow handle it by redirecting
    // (you could also redirect("/sign-in") here if you like)
    notFound()
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    notFound()
  }

  const expense = await prisma.expense.findUnique({
    where: { id, groupId },
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
    currency: (expenseCurrencies.includes(
      expense.currency as (typeof expenseCurrencies)[number]
    )
      ? expense.currency
      : "SGD") as (typeof expenseCurrencies)[number],
    fxToBase: Number(expense.fxToBase),
    date: expense.date.toISOString().slice(0, 10),
    note: expense.note,
    categoryId: expense.categoryId,
    photoUrl:
      expense?.photoRef.length > 0 ? expense?.photoRef[0]?.url : undefined,
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-semibold">Edit expense</h1>
      <ExpenseForm
        locale={locale}
        mode="edit"
        initialData={initialData}
        categories={categories}
      />
    </main>
  )
}
