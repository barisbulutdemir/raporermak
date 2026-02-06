
import { Suspense } from 'react'
import { getOfficialHolidays } from '@/app/actions/holiday' // This implicitly seeds
import { HolidayManagement } from '@/components/admin/HolidayManagement'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AdminHolidaysPage() {
    // Fetch a wide range to cover likely relevant years (2024-2030)
    // This call also triggers the seed check in getOfficialHolidays
    const holidays = await getOfficialHolidays(new Date('2024-01-01'), new Date('2030-12-31'))

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Resmi Tatil Yönetimi</h1>
                <p className="text-muted-foreground">
                    Raporlarda kullanılacak resmi tatil günlerini buradan yönetebilirsiniz.
                    (Burada yapılan değişiklikler rapor sayfasına anında yansır.)
                </p>
            </div>

            <Suspense fallback={<div>Yükleniyor...</div>}>
                <HolidayManagement initialHolidays={holidays} />
            </Suspense>
        </div>
    )
}
