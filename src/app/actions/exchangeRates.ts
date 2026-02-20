'use server'

import { format } from 'date-fns'

export interface ExchangeRates {
    USD: number
    EUR: number
    date: string
}

/**
 * Fetches USD and EUR → TL exchange rates from TCMB (Turkish Central Bank)
 * for the given date. Falls back to previous working days if the requested
 * date is a weekend or holiday.
 */
export async function getExchangeRates(date: Date): Promise<ExchangeRates | null> {
    // Try up to 5 days back (for weekends / holidays)
    for (let i = 0; i < 5; i++) {
        const d = new Date(date)
        d.setDate(d.getDate() - i)

        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()

        // TCMB URL format: /kurlar/YYYYMM/DDMMYYYY.xml
        const url = `https://www.tcmb.gov.tr/kurlar/${year}${month}/${day}${month}${year}.xml`

        try {
            const res = await fetch(url, { next: { revalidate: 86400 } }) // cache 24h
            if (!res.ok) continue

            const xml = await res.text()

            // Parse USD rate
            const usdMatch = xml.match(/<Currency.*?CurrencyCode="USD"[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/i)
            const eurMatch = xml.match(/<Currency.*?CurrencyCode="EUR"[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/i)

            if (usdMatch && eurMatch) {
                return {
                    USD: parseFloat(usdMatch[1]),
                    EUR: parseFloat(eurMatch[1]),
                    date: format(d, 'dd.MM.yyyy'),
                }
            }
        } catch (e) {
            console.error(`[exchange-rates] Failed to fetch for ${day}/${month}/${year}:`, e)
        }
    }

    return null
}
