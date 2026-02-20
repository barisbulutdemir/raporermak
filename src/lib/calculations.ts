/**
 * Constants for calculation
 */
const MONTHLY_DAYS = 30;
const MONTHLY_WORKING_HOURS = 225; // 30 days * 7.5 hours
const SATURDAY_MULTIPLIER = 1.5;
const SUNDAY_MULTIPLIER = 2.0;

/**
 * Calculates the service fees based on the user's monthly salary and report details.
 * 
 * @param monthlySalary The user's monthly salary (Net or Gross as provided).
 * @param workedDays Number of standard working days (Weekdays).
 * @param saturdayHours Total hours worked on Saturdays (extraTime50).
 * @param sundayHours Total hours worked on Sundays (extraTime100).
 * @param holidayHours Total hours worked on Official Holidays (holidayTime100).
 */
export function calculateServiceFees(
    monthlySalary: number,
    workedDays: number,
    saturdayHours: number,
    sundayHours: number,
    holidayHours: number
) {
    if (!monthlySalary || monthlySalary <= 0) {
        return {
            hourlyRate: 0,
            dailyRate: 0,
            dailyServiceFee: 0,
            standardServiceFee: 0,
            saturdayServiceFee: 0,
            sundayServiceFee: 0,
            holidayServiceFee: 0,
            totalServiceFee: 0,
            currency: 'TL'
        };
    }

    // Basic Rates
    const hourlyRate = monthlySalary / MONTHLY_WORKING_HOURS;
    const dailyRate = monthlySalary / MONTHLY_DAYS; // Not directly used in service fee but good to have

    // 1. Günlük Servis Ücreti Hesabı: (Aylık Maaş / 30) / 2
    const dailyServiceFee = dailyRate / 2;

    // Standard Weekdays Total Fee
    const standardServiceFee = dailyServiceFee * workedDays;

    // 2. Cumartesi Mesai Ücreti: (Saatlik Ücret * 1.5) * Saat
    const saturdayServiceFee = (hourlyRate * SATURDAY_MULTIPLIER) * saturdayHours;

    // 3. Pazar Mesai Ücreti: (Saatlik Ücret * 2) * Saat
    const sundayServiceFee = (hourlyRate * SUNDAY_MULTIPLIER) * sundayHours;

    // 4. Resmi Tatil Ücreti: (Saatlik Ücret * 2) * Saat (Assuming same as Sunday based on description)
    const holidayServiceFee = (hourlyRate * SUNDAY_MULTIPLIER) * holidayHours;

    // Total
    const totalServiceFee = standardServiceFee + saturdayServiceFee + sundayServiceFee + holidayServiceFee;

    return {
        hourlyRate,
        dailyRate,
        dailyServiceFee,
        standardServiceFee,
        saturdayServiceFee,
        sundayServiceFee,
        holidayServiceFee,
        totalServiceFee,
        currency: 'TL'
    };
}

/**
 * Formats a number as currency string (e.g., "6.133,33 TL")
 */
export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' TL';
}
