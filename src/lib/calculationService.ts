import { eachDayOfInterval, isSaturday, isSunday, format, isSameDay } from 'date-fns'
import { PrismaClient } from '@prisma/client'

// We need a simplified Holiday interface or fetch it from DB inside used component/action
// Ideally this service takes the list of holidays as input to be pure/testable
// or fetches them itself (async).

interface Holiday {
    date: Date
    description: string
    multiplier: number // 1.0 for full day, 0.5 for half day
}

export type CalculationResult = {
    normalDays: number
    saturdayHours: number
    sundayHours: number
    holidayHours: number
    details: DayDetail[]
}

export type DayDetail = {
    date: Date
    dateStr: string
    dayName: string
    type: 'Normal' | 'Saturday' | 'Sunday' | 'Holiday' | 'HolidayHalf' | 'Excluded'
    description?: string
    hours: number
    rate: number // 1.0 (normal), 1.5 (sat), 2.0 (sun/holiday)
}

export function calculateServiceReport(
    startDate: Date,
    endDate: Date,
    excludedDates: Date[], // Dates user explicitly unchecked
    holidays: Holiday[]
): CalculationResult {
    const result: CalculationResult = {
        normalDays: 0,
        saturdayHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        details: []
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate })

    for (const day of days) {
        const isExcluded = excludedDates.some(d => isSameDay(d, day))
        const holiday = holidays.find(h => isSameDay(h.date, day))

        // Day logic
        let type: DayDetail['type'] = 'Normal'
        let hours = 0
        let rate = 0
        let description = ''

        if (isExcluded) {
            type = 'Excluded'
            hours = 0
            rate = 0
            description = 'Çalışılmadı'
        } else if (holiday) {
            // Holiday Logic
            // "Arife" (Eve) is usually half day (started afternoon).
            // User screenshot: "28.10.2025 Cumhuriyet Bayramı Arifesi - 4 saat"

            if (holiday.multiplier === 0.5) {
                type = 'HolidayHalf'
                // If it's half day holiday, it means:
                // 4 hours work (morning) + 4 hours Holiday Overtime? 
                // OR 4 hours Holiday Overtime only?
                // User says: "Resmi tatil mesailerini de ayrı şekilde yazıp belirtmemiz gerekiyor"
                // Typically Arife: 13:00 onwards is holiday. Morning is worked.
                // If standard day is 8 hours: 4 hours worked (normal/sat/sun rate), 4 hours holiday (2.0 rate).
                // But let's simplify based on USER REQUEST interpretation:
                // "Resmi tatil... sadece 8 saat %100 mesai olarak yazılıyor. normal servis günü yazılmıyor"
                // This suggests REPLACE normal day with Holiday day.

                // For Half Day (Arife):
                // Let's assume it adds to "Holiday Hours" (4 hours)
                // Does it count as Normal Day? 
                // If I look at screenshot: "28.10.2025... 4 saat" in "Mesai ayrıntıları".
                // It seems to be purely additive or specific.

                // Implementation: Add 4 hours to holidayHours. 
                // Does it count as 0.5 normal day?
                // Let's assume Yes for Morning?? 
                // User input "normal servis günü yazılmıyor" applies to FULL holidays.
                // For simplicity and safety: 
                // Full Holiday -> 0 Normal Day, 8 Holiday Hours.
                // Half Holiday -> 0.5 Normal Day, 4 Holiday Hours? 
                // Or maybe just 0 Normal Day, 4 Holiday Hours (if we consider afternoon only paid extra).

                // SAFE BET: Count 4 hours as holiday.
                // What about the other 4 hours?
                // If it's Monday-Friday: 0.5 Normal Day.
                // If it's Saturday: 4 hours Sat overtime.
                // If it's Sunday: 4 hours Sun overtime.

                // HOWEVER, simpler approach first:
                // Holiday (Full) -> 8h Holiday Overtime (rate 2.0). 0 Normal Day.
                // Holiday (Half) -> 4h Holiday Overtime. 0.5 Normal Day?
                // Let's wait for user feedback on "Arife" specifically if needed, but for now:
                hours = 4
                description = holiday.description
                result.holidayHours += 4
            } else {
                type = 'Holiday'
                hours = 8
                description = holiday.description
                result.holidayHours += 8
            }

        } else if (isSunday(day)) {
            type = 'Sunday'
            hours = 8
            result.sundayHours += 8
            description = 'Pazar Mesaisi'
        } else if (isSaturday(day)) {
            type = 'Saturday'
            hours = 8
            result.saturdayHours += 8
            description = 'Cumartesi Mesaisi'
        } else {
            type = 'Normal'
            hours = 1 // Counts as 1 day
            result.normalDays += 1
            description = 'Normal Çalışma'
        }

        result.details.push({
            date: day,
            dateStr: format(day, 'dd.MM.yyyy'),
            dayName: format(day, 'EEEE'), // We might want Turkish locale
            type,
            description,
            hours,
            rate
        })
    }

    return result
}
