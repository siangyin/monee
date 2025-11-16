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

// Create a new group expense with split modes (EQUAL / PERCENT)
// MANUAL will come later.
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

  // 🔹 Load all members of this group for splitting
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: true,
    },
  })

  if (members.length === 0) {
    throw new Error("Group has no members; cannot split expense")
  }

  const titleRaw = formData.get("title")
  const amountRaw = formData.get("amount")
  const dateRaw = formData.get("date")
  const noteRaw = formData.get("note")
  const categoryIdRaw = formData.get("categoryId")
  const splitModeRaw = formData.get("splitMode")

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

  // 🔹 Normalise split mode – fallback to EQUAL if anything weird
  let splitMode: "EQUAL" | "PERCENT" | "MANUAL" = "EQUAL"
  if (typeof splitModeRaw === "string") {
    const upper = splitModeRaw.toUpperCase()
    if (upper === "EQUAL" || upper === "PERCENT" || upper === "MANUAL") {
      splitMode = upper
    }
  }

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

  // 🔹 Create the expense first, storing splitMode
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
      splitMode, // stored even if we later fall back to equal
    },
  })

  // 🔹 Build shares array depending on splitMode
  type ShareItem = { userId: string; amount: number }
  let shares: ShareItem[] = []

  if (splitMode === "PERCENT") {
    // Read percents per member: fields like percent_<userId>
    const percents = members.map((m) => {
      const fieldName = `percent_${m.userId}`
      const raw = formData.get(fieldName)
      let value = 0

      if (typeof raw === "string" && raw.trim() !== "") {
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && parsed >= 0) {
          value = parsed
        }
      }

      return { userId: m.userId, percent: value }
    })

    const totalPercent = percents.reduce(
      (sum, p) => sum + p.percent,
      0
    )

    if (totalPercent > 0.0001) {
      // Normalise: user doesn't have to hit exactly 100
      shares = percents.map((p) => {
        const fraction = p.percent / totalPercent
        const rawShare = amountInBaseNumber * fraction
        const amount = Number(rawShare.toFixed(2))
        return { userId: p.userId, amount }
      })
    }
  } else if (splitMode === "MANUAL") {
    // Read manual amounts per member: fields like manual_<userId>
    const manualItems = members.map((m) => {
      const fieldName = `manual_${m.userId}`
      const raw = formData.get(fieldName)
      let value = 0

      if (typeof raw === "string" && raw.trim() !== "") {
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && parsed >= 0) {
          value = parsed
        }
      }

      return { userId: m.userId, value }
    })

    const totalManual = manualItems.reduce(
      (sum, m) => sum + m.value,
      0
    )

    // Allow a bit of tolerance when comparing manual total vs expense total
    const tolerance = Math.max(0.05, Math.abs(amountInBaseNumber) * 0.01)

    if (
      totalManual > 0 &&
      Math.abs(totalManual - amountInBaseNumber) <= tolerance
    ) {
      // Use the manual values directly (rounded to 2dp)
      shares = manualItems.map((m) => ({
        userId: m.userId,
        amount: Number(m.value.toFixed(2)),
      }))
    }
    // If totalManual is 0 or very different from amountInBaseNumber,
    // we'll fall back to equal split below.
  }

  // 🔸 Fallback to equal split if we didn't create any shares
  if (shares.length === 0) {
    const memberCount = members.length
    const rawShare = amountInBaseNumber / memberCount
    const sharePerMember = Number(rawShare.toFixed(2))

    shares = members.map((m) => ({
      userId: m.userId,
      amount: sharePerMember,
    }))
  }

  // 🔹 Persist shares
  await prisma.expenseShare.createMany({
    data: shares.map((s) => ({
      expenseId: expense.id,
      userId: s.userId,
      amount: new Prisma.Decimal(s.amount),
    })),
  })

  redirect(`/${locale}/groups/${groupId}`)
}



// Delete a group expense (and its shares & photos)
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

  // Optionally, only allow ADMIN or payer to delete:
  // if (membership.role !== "ADMIN") { ... }

  // Clean up shares and photos first
  await prisma.expenseShare.deleteMany({
    where: { expenseId },
  })

  await prisma.photoRef.deleteMany({
    where: { expenseId },
  })

  // Then delete the expense itself, scoped to this group for safety
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
