// app/actions/expenses.ts
"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "@/lib/validation/expense"
import { auth } from "@clerk/nextjs/server"


export async function createExpense(locale: string, input: CreateExpenseInput) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Not authenticated")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    throw new Error("User not found in database")
  }


  const data = createExpenseSchema.parse(input)

  // Resolve category name, if any
  let categoryName: string | null = null
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { name: true },
    })
    categoryName = cat?.name ?? null
  }

  const amountInBaseNumber = Number((data.amount * data.fxToBase).toFixed(2))

  const created = await prisma.expense.create({
    data: {
      title: data.title,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency,
      fxToBase: new Prisma.Decimal(data.fxToBase),
      amountInBase: new Prisma.Decimal(amountInBaseNumber),
      date: new Date(data.date),
      note: data.note || null,
      userId: user.id,
      categoryId: data.categoryId || null,
      categoryNameSnapshot: categoryName,
    },
    select: { id: true },
  })

  // NEW: create PhotoRef if photoUrl provided
  if (data.photoUrl && data.photoUrl?.length > 0) {
    await prisma.photoRef.create({
      data: {
        expenseId: created.id,
        url: data.photoUrl,
      },
    })
  }

}

export async function updateExpense(
  locale: string,
  id: string,
  input: CreateExpenseInput
) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Not authenticated")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    throw new Error("User not found in database")
  }

  const existing = await prisma.expense.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })

  if (!existing) {
    throw new Error("Expense not found or not owned by this user")
  }

  const data = createExpenseSchema.parse(input)

  let categoryName: string | null = null
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { name: true },
    })
    categoryName = cat?.name ?? null
  }

  const amountInBaseNumber = Number((data.amount * data.fxToBase).toFixed(2))

  await prisma.expense.update({
    where: { id },
    data: {
      title: data.title,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency,
      fxToBase: new Prisma.Decimal(data.fxToBase),
      amountInBase: new Prisma.Decimal(amountInBaseNumber),
      date: new Date(data.date),
      note: data.note || null,
      categoryId: data.categoryId || null,
      categoryNameSnapshot: categoryName,
    },
  })
  // Sync PhotoRef: remove old and add new if provided
  await prisma.photoRef.deleteMany({
    where: { expenseId: id },
  })

  if (data.photoUrl) {
    await prisma.photoRef.create({
      data: {
        expenseId: id,
        url: data.photoUrl,
      },
    })
  }
}


export async function deleteExpense(locale: string, id: string) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Not authenticated")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    throw new Error("User not found")
  }

  await prisma.expense.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  })
}
