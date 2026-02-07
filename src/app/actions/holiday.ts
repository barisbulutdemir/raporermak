'use server'

import { prisma } from '@/lib/prisma'
import { OfficialHoliday } from '@prisma/client'

// Fixed holidays
// Fixed holidays
const FIXED_HOLIDAYS = [
    { day: 1, month: 1, desc: "Yılbaşı", isHalfDay: false },
    { day: 23, month: 4, desc: "23 Nisan", isHalfDay: false },
    { day: 1, month: 5, desc: "1 Mayıs", isHalfDay: false },
    { day: 19, month: 5, desc: "19 Mayıs", isHalfDay: false },
    { day: 15, month: 7, desc: "15 Temmuz", isHalfDay: false },
    { day: 30, month: 8, desc: "30 Ağustos", isHalfDay: false },
    { day: 28, month: 10, desc: "29 Ekim Arifesi", isHalfDay: true },
    { day: 29, month: 10, desc: "29 Ekim", isHalfDay: false },
]

// Religious Holidays (Hardcoded for 2025-2028)
const RELIGIOUS_HOLIDAYS: { date: string, desc: string, isHalfDay?: boolean }[] = [
    // 2025
    { date: "2025-03-29", desc: "Ramazan B. Arifesi", isHalfDay: true },
    { date: "2025-03-30", desc: "Ramazan B." },
    { date: "2025-03-31", desc: "Ramazan B." },
    { date: "2025-04-01", desc: "Ramazan B." },
    { date: "2025-06-05", desc: "Kurban B. Arifesi", isHalfDay: true },
    { date: "2025-06-06", desc: "Kurban B." },
    { date: "2025-06-07", desc: "Kurban B." },
    { date: "2025-06-08", desc: "Kurban B." },
    { date: "2025-06-09", desc: "Kurban B." },

    // 2026
    { date: "2026-03-19", desc: "Ramazan B. Arifesi", isHalfDay: true },
    { date: "2026-03-20", desc: "Ramazan B." },
    { date: "2026-03-21", desc: "Ramazan B." },
    { date: "2026-03-22", desc: "Ramazan B." },
    { date: "2026-05-26", desc: "Kurban B. Arifesi", isHalfDay: true },
    { date: "2026-05-27", desc: "Kurban B." },
    { date: "2026-05-28", desc: "Kurban B." },
    { date: "2026-05-29", desc: "Kurban B." },
    { date: "2026-05-30", desc: "Kurban B." },

    // 2027
    { date: "2027-03-08", desc: "Ramazan B. Arifesi", isHalfDay: true },
    { date: "2027-03-09", desc: "Ramazan B." },
    { date: "2027-03-10", desc: "Ramazan B." },
    { date: "2027-03-11", desc: "Ramazan B." },
    { date: "2027-05-15", desc: "Kurban B. Arifesi", isHalfDay: true },
    { date: "2027-05-16", desc: "Kurban B." },
    { date: "2027-05-17", desc: "Kurban B." },
    { date: "2027-05-18", desc: "Kurban B." },
    { date: "2027-05-19", desc: "Kurban B." },

    // 2028
    { date: "2028-02-26", desc: "Ramazan B. Arifesi", isHalfDay: true },
    { date: "2028-02-27", desc: "Ramazan B." },
    { date: "2028-02-28", desc: "Ramazan B." },
    { date: "2028-02-29", desc: "Ramazan B." },
    { date: "2028-05-04", desc: "Kurban B. Arifesi", isHalfDay: true },
    { date: "2028-05-05", desc: "Kurban B." },
    { date: "2028-05-06", desc: "Kurban B." },
    { date: "2028-05-07", desc: "Kurban B." },
    { date: "2028-05-08", desc: "Kurban B." },
]

export const getOfficialHolidays = async (start: Date, end: Date) => {
    // Ensure seeding is checked (lightweight check)
    await seedHolidaysIfNeeded()

    const holidays = await prisma.officialHoliday.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            }
        }
    })
    return holidays
}

const seedHolidaysIfNeeded = async () => {
    // Check if we have arifes seeded (simple check for one known arife)
    // Or just always run the loop and use upsert, it's safe and ensures data integrity.
    // For performance, we can check count. If count is low (e.g. < 50), re-seed.
    // 4 years * ~15 holidays = 60. Using 20 as threshold is safe to trigger update if only basic ones exist.
    // But since we want to force update IS_HALF_DAY, let's just run it. Upsert is fast enough for <100 items.



    const holidaysToCreate = []

    // Generate Fixed Holidays for 2025-2028
    for (let year = 2025; year <= 2028; year++) {
        for (const h of FIXED_HOLIDAYS) {
            // Month is 0-indexed in JS Date constructor
            const date = new Date(Date.UTC(year, h.month - 1, h.day))
            holidaysToCreate.push({
                date: date,
                description: h.desc,
                isHalfDay: h.isHalfDay || false
            })
        }
    }

    // Add Religious Holidays
    for (const h of RELIGIOUS_HOLIDAYS) {
        holidaysToCreate.push({
            date: new Date(h.date), // ISO string works
            description: h.desc,
            isHalfDay: h.isHalfDay || false
        })
    }

    for (const h of holidaysToCreate) {
        await prisma.officialHoliday.upsert({
            where: { date: h.date },
            update: {
                description: h.description,
                isHalfDay: h.isHalfDay
            },
            create: {
                date: h.date,
                description: h.description,
                isHalfDay: h.isHalfDay
            }
        })
    }

}

import { revalidatePath } from "next/cache"

export const addOfficialHoliday = async (data: { date: Date, description: string, isHalfDay: boolean }) => {
    try {
        await prisma.officialHoliday.create({
            data: {
                date: data.date,
                description: data.description,
                isHalfDay: data.isHalfDay
            }
        })
        revalidatePath('/admin/holidays')
        return { success: true }
    } catch (error) {
        console.error("Failed to add holiday:", error)
        return { success: false, error: "Tatil eklenemedi." }
    }
}

export const updateOfficialHoliday = async (id: string, data: { date: Date, description: string, isHalfDay: boolean }) => {
    try {
        await prisma.officialHoliday.update({
            where: { id },
            data: {
                date: data.date,
                description: data.description,
                isHalfDay: data.isHalfDay
            }
        })
        revalidatePath('/admin/holidays')
        return { success: true }
    } catch (error) {
        console.error("Failed to update holiday:", error)
        return { success: false, error: "Tatil güncellenemedi." }
    }
}

export const deleteOfficialHoliday = async (id: string) => {
    try {
        await prisma.officialHoliday.delete({
            where: { id }
        })
        revalidatePath('/admin/holidays')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete holiday:", error)
        return { success: false, error: "Tatil silinemedi." }
    }
}
