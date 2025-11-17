// app/actions/fxRates.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function saveFxRate(locale: string, formData: FormData) {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    throw new Error("User not found in database")
  }

  const baseRaw = formData.get("base")
  const quoteRaw = formData.get("quote")
  const rateRaw = formData.get("rate")

  const base =
    typeof baseRaw === "string" ? baseRaw.trim().toUpperCase() : ""
  const quote =
    typeof quoteRaw === "string" ? quoteRaw.trim().toUpperCase() : ""
  const rateNumber =
    typeof rateRaw === "string" ? Number(rateRaw) : NaN

  // Basic validation
  if (!base || !quote || Number.isNaN(rateNumber) || rateNumber <= 0) {
    // For now just bounce back to the converter page
    redirect(`/${locale}/converter`)
  }

  // We store: 1 QUOTE = rate BASE
  await prisma.fxRate.upsert({
    where: {
      userId_base_quote: {
        userId: user.id,
        base,
        quote,
      },
    },
    update: {
      rate: new Prisma.Decimal(rateNumber),
      asOfDate: new Date(),
    },
    create: {
      userId: user.id,
      base,
      quote,
      rate: new Prisma.Decimal(rateNumber),
    },
  })

  redirect(`/${locale}/converter`)
}
