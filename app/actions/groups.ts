// app/actions/groups.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Very simple slug generator from name
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

// Create a new group and add creator as ADMIN
export async function createGroup(locale: string, formData: FormData) {
  const { userId } = await auth()
  if (!userId) {
    // Not signed in – for safety, send to sign-in
    redirect("/sign-in")
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    throw new Error("User not found in database")
  }

  const nameRaw = formData.get("name")
  const name = typeof nameRaw === "string" ? nameRaw.trim() : ""

  if (!name) {
    // For now just redirect back; later we can add form error handling
    redirect(`/${locale}/groups`)
  }

  // Generate a unique slug
  const baseSlug = slugifyName(name) || "group"
  let slug = baseSlug
  let counter = 1

  // Ensure slug uniqueness
  // (small loop is fine here, it's rare to collide many times)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.group.findUnique({
      where: { slug },
    })

    if (!existing) break
    slug = `${baseSlug}-${counter++}`
  }

  // Create the group with the user's base currency
  const group = await prisma.group.create({
    data: {
      name,
      slug,
      defaultCurr: user.baseCurrency,
      createdById: user.id,
    },
  })

  // Add the creator as an ADMIN member
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: user.id,
      role: "ADMIN",
    },
  })

  // Redirect back to groups list so the new group shows up
  redirect(`/${locale}/groups`)
}

// Create a new group expense (minimal, equal-split later)
export async function createGroupExpenseEqualSplit(
  locale: string,
  groupId: string,
  formData: FormData
) {
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

  // Ensure this user is a member of the group
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
    include: {
      group: true,
    },
  })

  if (!membership) {
    throw new Error("You are not a member of this group")
  }

  const group = membership.group

  const titleRaw = formData.get("title")
  const amountRaw = formData.get("amount")
  const dateRaw = formData.get("date")
  const noteRaw = formData.get("note")
  const categoryIdRaw = formData.get("categoryId")

  const title = typeof titleRaw === "string" ? titleRaw.trim() : ""
  const amountNumber = typeof amountRaw === "string" ? Number(amountRaw) : NaN
  const note =
    typeof noteRaw === "string" && noteRaw.trim().length > 0
      ? noteRaw.trim()
      : null

  const categoryId =
    typeof categoryIdRaw === "string" && categoryIdRaw.length > 0
      ? categoryIdRaw
      : null

  if (!title || Number.isNaN(amountNumber) || amountNumber <= 0) {
    // In v1, if bad input just go back; later we can show form errors
    redirect(`/${locale}/groups/${groupId}`)
  }

  // For now, we assume the group currency is the "base" for this group.
  const currency = group.defaultCurr
  const fxToBase = 1
  const amountInBaseNumber = amountNumber // same as amount for now

  const date =
    typeof dateRaw === "string" && dateRaw
      ? new Date(dateRaw)
      : new Date()

  // Resolve category name snapshot if we have a categoryId
  let categoryName: string | null = null
  if (categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    })
    categoryName = cat?.name ?? null
  }

  // Create the expense itself
  const expense = await prisma.expense.create({
    data: {
      title,
      amount: new Prisma.Decimal(amountNumber),
      currency,
      fxToBase: new Prisma.Decimal(fxToBase),
      amountInBase: new Prisma.Decimal(amountInBaseNumber),
      date,
      note,
      userId: user.id, // payer is current user
      groupId, // link to group
      categoryId,
      categoryNameSnapshot: categoryName,
      splitMode: "EQUAL", // 🔹 for now we always treat as equal split
    },
  })

  // --- Create equal shares for all members of the group ---

  // Load all members of this group
  const members = await prisma.groupMember.findMany({
    where: { groupId },
  })

  if (members.length > 0) {
    const count = members.length

    // We work in cents to handle rounding nicely
    const totalCents = Math.round(amountInBaseNumber * 100)
    const baseShareCents = Math.floor(totalCents / count)
    const remainder = totalCents - baseShareCents * count

    let i = 0
    await prisma.$transaction(
      members.map((m) => {
        // Distribute the remainder +1 cent to the first "remainder" members
        const extra = i < remainder ? 1 : 0
        const shareCents = baseShareCents + extra
        i++

        const shareAmount = shareCents / 100

        return prisma.expenseShare.create({
          data: {
            expenseId: expense.id,
            userId: m.userId,
            amount: new Prisma.Decimal(shareAmount),
          },
        })
      })
    )
  }

  redirect(`/${locale}/groups/${groupId}`)
}

// Delete a group expense
export async function deleteGroupExpense(
  locale: string,
  groupId: string,
  formData: FormData
) {
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

  // Ensure this user is a member of the group
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
  })

  if (!membership) {
    throw new Error("You are not a member of this group")
  }

  const expenseIdRaw = formData.get("expenseId")
  const expenseId =
    typeof expenseIdRaw === "string" ? expenseIdRaw : null

  if (!expenseId) {
    // Nothing to do; go back
    redirect(`/${locale}/groups/${groupId}`)
  }

  // Use deleteMany so we can also enforce groupId in the where
  await prisma.expense.deleteMany({
    where: {
      id: expenseId,
      groupId,
    },
  })

  redirect(`/${locale}/groups/${groupId}`)
}

// Update group name (only ADMINs)
export async function updateGroupName(
  locale: string,
  groupId: string,
  formData: FormData
) {
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

  // Check that this user is an ADMIN in this group
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
  })

  if (!membership || membership.role !== "ADMIN") {
    // For now just send them back; later we could show a nicer error
    redirect(`/${locale}/groups/${groupId}`)
  }

  const nameRaw = formData.get("name")
  const name = typeof nameRaw === "string" ? nameRaw.trim() : ""

  if (!name) {
    // Do not update if empty – just reload the page
    redirect(`/${locale}/groups/${groupId}`)
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { name },
  })

  redirect(`/${locale}/groups/${groupId}`)
}

// Add member by email (only ADMINs)
export async function addGroupMemberByEmail(
  locale: string,
  groupId: string,
  formData: FormData
) {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const currentUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!currentUser) {
    throw new Error("User not found in database")
  }

  // Check that this user is an ADMIN in this group
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: currentUser.id,
    },
  })

  if (!membership || membership.role !== "ADMIN") {
    // No permission – just go back to the group page for now
    redirect(`/${locale}/groups/${groupId}`)
  }

  const emailRaw = formData.get("email")
  const email =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""

  if (!email) {
    redirect(`/${locale}/groups/${groupId}`)
  }

  // Look up user by email
  const userToAdd = await prisma.user.findUnique({
    where: { email },
  })

  // For MVP: only allow adding existing users
  if (!userToAdd) {
    // Later we could create an invite or show message
    redirect(`/${locale}/groups/${groupId}`)
  }

  // Check if already a member
  const existingMembership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: userToAdd.id,
    },
  })

  if (!existingMembership) {
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userToAdd.id,
        role: "MEMBER",
      },
    })
  }

  redirect(`/${locale}/groups/${groupId}`)
}
