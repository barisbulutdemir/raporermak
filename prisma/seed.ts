import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const holidays = [
    // 2026
    { date: '2026-01-01', description: 'Yılbaşı' },
    { date: '2026-03-19', description: 'Ramazan Bayramı Arifesi (Yarım Gün)' },
    { date: '2026-03-20', description: 'Ramazan Bayramı 1. Gün' },
    { date: '2026-03-21', description: 'Ramazan Bayramı 2. Gün' },
    { date: '2026-03-22', description: 'Ramazan Bayramı 3. Gün' },
    { date: '2026-04-23', description: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: '2026-05-01', description: 'Emek ve Dayanışma Günü' },
    { date: '2026-05-19', description: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
    { date: '2026-05-26', description: 'Kurban Bayramı Arifesi (Yarım Gün)' },
    { date: '2026-05-27', description: 'Kurban Bayramı 1. Gün' },
    { date: '2026-05-28', description: 'Kurban Bayramı 2. Gün' },
    { date: '2026-05-29', description: 'Kurban Bayramı 3. Gün' },
    { date: '2026-05-30', description: 'Kurban Bayramı 4. Gün' },
    { date: '2026-07-15', description: 'Demokrasi ve Milli Birlik Günü' },
    { date: '2026-08-30', description: 'Zafer Bayramı' },
    { date: '2026-10-28', description: 'Cumhuriyet Bayramı Arifesi (Yarım Gün)' },
    { date: '2026-10-29', description: 'Cumhuriyet Bayramı' },

    // 2027
    { date: '2027-01-01', description: 'Yılbaşı' },
    { date: '2027-03-09', description: 'Ramazan Bayramı Arifesi (Yarım Gün)' },
    { date: '2027-03-10', description: 'Ramazan Bayramı 1. Gün' },
    { date: '2027-03-11', description: 'Ramazan Bayramı 2. Gün' },
    { date: '2027-03-12', description: 'Ramazan Bayramı 3. Gün' },
    { date: '2027-04-23', description: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: '2027-05-01', description: 'Emek ve Dayanışma Günü' },
    { date: '2027-05-15', description: 'Kurban Bayramı Arifesi (Yarım Gün)' },
    { date: '2027-05-16', description: 'Kurban Bayramı 1. Gün' },
    { date: '2027-05-17', description: 'Kurban Bayramı 2. Gün' },
    { date: '2027-05-18', description: 'Kurban Bayramı 3. Gün' },
    { date: '2027-05-19', description: 'Kurban Bayramı 4. Gün & Atatürk\'ü Anma' }, // Coincides
    { date: '2027-07-15', description: 'Demokrasi ve Milli Birlik Günü' },
    { date: '2027-08-30', description: 'Zafer Bayramı' },
    { date: '2027-10-28', description: 'Cumhuriyet Bayramı Arifesi (Yarım Gün)' },
    { date: '2027-10-29', description: 'Cumhuriyet Bayramı' },
]

async function main() {
    const password = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: password,
            name: 'Admin User',
            role: 'ADMIN',
        },
    })

    console.log({ admin })

    console.log('Seeding holidays...')
    // Clear existing to avoid duplicates if re-running without clean DB or just upsert
    // Upsert is safer. matching by date (assumed unique in schema, wait I added @unique to date? Yes I did)

    for (const h of holidays) {
        const dt = new Date(h.date)
        await prisma.holiday.upsert({
            where: { date: dt },
            update: { description: h.description },
            create: {
                date: dt,
                description: h.description,
                multiplier: h.description.includes('Yarım Gün') ? 0.5 : 1.0,
                // Logic: if multiplier is for "Holiday Credit", full day is 1.0 (8 hours), half day 0.5 (4 hours)
                // Note: The logic for PAY is handled in calculationService, here we just mark how much "holiday" it is.
            },
        })
    }
    console.log('Holidays seeded.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
