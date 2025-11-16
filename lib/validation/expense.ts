// lib/validation/expense.ts
import { z } from "zod"

export const expenseCurrencies = ["SGD", "CNY", "HKD", "MOP", "MYR", "JPY", "USD", "EUR"] as const

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be greater than 0"),
  currency: z.enum(expenseCurrencies, {
    errorMap: () => ({ message: "Please choose a currency" }),
  }),
  fxToBase: z
    .number({
      required_error: "Rate is required",
      invalid_type_error: "Rate must be a number",
    })
    .positive("Rate must be greater than 0"),
  date: z.string().min(1, "Date is required"), // ISO string from input[type=date]
  categoryId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  photoUrl: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : "")),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
