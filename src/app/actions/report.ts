'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Define schema for validation
const formSchema = z.object({
    siteName: z.string().min(1, 'Şantiye adı gereklidir'),
    siteColor: z.string().optional(),
    dateRange: z.object({
        from: z.date(),
        to: z.date(),
    }),
    excludedDates: z.array(z.date()).optional(),
    holidays: z.array(z.date()).optional(),
    advances: z.array(z.object({
        amount: z.number().min(0),
        currency: z.enum(['TL', 'USD', 'EUR']),
        note: z.string().optional(),
    })).optional(),
    expenses: z.array(z.object({
        amount: z.number().min(0),
        currency: z.enum(['TL', 'USD', 'EUR']),
        description: z.string().min(1, 'Açıklama gereklidir'),
    })).optional(),
    summaryNotes: z.string().optional(),
    signature: z.string().optional(), // Base64
    totalWorkingDays: z.number().default(0),
    extraTime50: z.number().default(0),
    extraTime100: z.number().default(0),
    holidayTime100: z.number().default(0),
})

export type FormState = {
    message?: string
    errors?: Record<string, string[]>
}

export async function createReport(prevState: FormState, formData: any) {
    const session = await auth()
    if (!session?.user?.email && !session?.user?.name) { // Adapt based on what we store
        // We stored username in token.name in auth.ts
        // Actually we verify by just checking session.user
    }

    if (!session?.user) {
        return { message: 'Unauthorized' }
    }

    // Username is in session.user.name (mapped from token.name which is user.username)
    const username = session.user.name
    if (!username) return { message: 'User not found' }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return { message: 'User not found in DB' }

    // Manual parsing because formData is complex JSON sent from client component usually?
    // Or if we use standard formData with server actions, passing arrays is tricky.
    // Best to passing raw data from client component's transition or hidden inputs.
    // Actually, for complex forms, it's easier to pass the data object directly if using bind,
    // OR just receive the state and use the second argument as the PAYLOAD if invoked directly.
    // BUT useActionState hook sends FormData.

    // Let's assume the client sends a JSON string in a hidden field 'data' 
    // OR we define the action to take (prevState, payload) and call it from a transition, not directly as form action
    // BUT useActionState expects (state, payload). 

    // Actually, simpler: define action as `formAction(payload: z.infer<typeof formSchema>)`
    // and use it in `startTransition`.

    // However, I'll stick to receiving the object directly since I'll call it from client code.
    // Note: Server actions can be called like functions.

    // Wait, `createReport` signature for useActionState is `(state, payload)`.

    const validatedFields = formSchema.safeParse(formData) // formData here is the payload if we call it effectively

    if (!validatedFields.success) {
        return {
            message: 'Validation Error',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const data = validatedFields.data

    try {
        const report = await prisma.serviceReport.create({
            data: {
                userId: user.id,
                siteName: data.siteName,
                siteColor: data.siteColor,
                startDate: data.dateRange.from,
                endDate: data.dateRange.to,
                excludedDates: data.excludedDates ? JSON.stringify(data.excludedDates) : null,
                holidays: data.holidays ? JSON.stringify(data.holidays) : null,
                summaryNotes: data.summaryNotes,
                workerSignature: data.signature,
                totalWorkingDays: data.totalWorkingDays,
                extraTime50: data.extraTime50,
                extraTime100: data.extraTime100,
                holidayTime100: data.holidayTime100,
                advances: {
                    create: data.advances?.map(a => ({
                        amount: a.amount,
                        currency: a.currency,
                        note: a.note
                    }))
                },
                expenses: {
                    create: data.expenses?.map(e => ({
                        amount: e.amount,
                        currency: e.currency,
                        description: e.description
                    }))
                }
            }
        })
        revalidatePath('/dashboard')
        return { message: 'Success', reportId: report.id } // Return ID instead of redirecting
    } catch (error) {
        console.error('Failed to create report:', error)
        return { message: 'Database Error: Failed to create report.' }
    }
}

export async function updateReport(reportId: string, formData: any) {
    const session = await auth()
    if (!session?.user) return { message: 'Unauthorized' }

    // Validate using the same schema
    const validatedFields = formSchema.safeParse(formData)

    if (!validatedFields.success) {
        return {
            message: 'Validation Error',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const data = validatedFields.data

    try {
        // We delete Related records (Advances, Expenses) and recreate them
        // This is a simple strategy for full update.
        // Wrap in transaction if possible, but simple sequential operations are okay here.

        await prisma.$transaction([
            prisma.advance.deleteMany({ where: { reportId } }),
            prisma.expense.deleteMany({ where: { reportId } }),
            prisma.serviceReport.update({
                where: { id: reportId },
                data: {
                    siteName: data.siteName,
                    siteColor: data.siteColor,
                    startDate: data.dateRange.from,
                    endDate: data.dateRange.to,
                    excludedDates: data.excludedDates ? JSON.stringify(data.excludedDates) : null,
                    holidays: data.holidays ? JSON.stringify(data.holidays) : null,
                    summaryNotes: data.summaryNotes,
                    workerSignature: data.signature,
                    totalWorkingDays: data.totalWorkingDays,
                    extraTime50: data.extraTime50,
                    extraTime100: data.extraTime100,
                    holidayTime100: data.holidayTime100,
                    advances: {
                        create: data.advances?.map(a => ({
                            amount: a.amount,
                            currency: a.currency,
                            note: a.note
                        }))
                    },
                    expenses: {
                        create: data.expenses?.map(e => ({
                            amount: e.amount,
                            currency: e.currency,
                            description: e.description
                        }))
                    }
                }
            })
        ])

        revalidatePath('/dashboard')
        revalidatePath(`/reports/${reportId}`)
        return { message: 'Success', reportId: reportId }
    } catch (error) {
        console.error('Failed to update report:', error)
        return { message: 'Database Error: Failed to update report.' }
    }
}

export async function deleteReport(reportId: string) {
    const session = await auth()
    if (!session?.user) return { message: 'Unauthorized' }

    try {
        await prisma.serviceReport.delete({
            where: { id: reportId }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete report", error)
        return { success: false, message: 'Failed to delete report' }
    }
}
