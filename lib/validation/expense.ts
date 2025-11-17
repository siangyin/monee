// lib/validation/expense.ts
import { z } from "zod"

export const expenseCurrencies = ["SGD", "CNY", "HKD", "MOP", "MYR", "JPY", "USD", "EUR"] as const

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1),
  fxToBase: z.number().positive(),
  date: z.string().min(1, "Date is required"), // ISO string from input[type=date]
  categoryId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  photoUrl: z
    .string()
    .trim()
    .optional().nullable()
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
