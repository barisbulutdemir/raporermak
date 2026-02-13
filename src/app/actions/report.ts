'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
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
    attachments: z.array(z.object({
        fileName: z.string(),
        filePath: z.string(),
        fileType: z.string(),
        fileSize: z.number()
    })).optional()
})

export type FormState = {
    message?: string
    errors?: Record<string, string[]>
}

export async function createReport(prevState: FormState, formData: any) {
    const session = await auth()

    if (!session?.user) {
        return { message: 'Unauthorized' }
    }

    // Username is in session.user.name
    const username = session.user.name
    if (!username) return { message: 'User not found' }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return { message: 'User not found in DB' }

    const validatedFields = formSchema.safeParse(formData)

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
                },
                attachments: {
                    create: data.attachments?.map(a => ({
                        fileName: a.fileName,
                        filePath: a.filePath,
                        fileType: a.fileType,
                        fileSize: a.fileSize
                    }))
                }
            }
        })
        revalidatePath('/dashboard')
        revalidatePath('/reports')
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
        // We delete Related records (Advances, Expenses, Attachments) and recreate them
        await prisma.$transaction([
            prisma.advance.deleteMany({ where: { reportId } }),
            prisma.expense.deleteMany({ where: { reportId } }),
            prisma.reportAttachment.deleteMany({ where: { reportId } }),
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
                    },
                    attachments: {
                        create: data.attachments?.map(a => ({
                            fileName: a.fileName,
                            filePath: a.filePath,
                            fileType: a.fileType,
                            fileSize: a.fileSize
                        }))
                    }
                }
            })
        ])

        revalidatePath('/dashboard')
        revalidatePath('/reports')
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
        revalidatePath('/reports')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete report", error)
        return { success: false, message: 'Failed to delete report' }
    }
}

export async function deleteReports(reportIds: string[]) {
    const session = await auth()
    if (!session?.user) return { message: 'Unauthorized' }

    if (!reportIds || reportIds.length === 0) {
        return { success: false, message: 'No reports selected' }
    }

    try {
        await prisma.serviceReport.deleteMany({
            where: {
                id: { in: reportIds },
                user: { username: session.user.name ?? undefined }
            }
        })
        revalidatePath('/dashboard')
        revalidatePath('/reports')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete reports", error)
        return { success: false, message: 'Failed to delete reports' }
    }
}
