'use client'

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { format, isWithinInterval, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
// import { deleteReport } from "@/app/actions/report" // If needed, or pass as prop
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, Pencil } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DayClickEventHandler, Modifiers, ModifiersStyles } from "react-day-picker"

// Type definitions matching usage in page.tsx
export interface ReportRange {
    id: string
    siteName: string
    siteColor: string | null
    startDate: Date
    endDate: Date
    excludedDates: Date[]
}

export interface Holiday {
    id: string
    date: Date
    description: string | null
    isHalfDay: boolean
}

interface DashboardCalendarProps {
    reports: ReportRange[]
    holidays: Holiday[]
}

export function DashboardCalendar({ reports, holidays = [] }: DashboardCalendarProps) {
    const router = useRouter()
    // const [deletingId, setDeletingId] = useState<string | null>(null) // Deletion logic might need to be passed down or re-implemented if actions are available
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

    // Helper to find report for a day (filtered for 'worked' visual)
    const getReportForDay = (day: Date) => {
        // Check if Holiday (full day only) - holidays take precedence for "work" status? 
        // Or do we show both? Usually holiday blocks work.
        const holiday = holidays.find(h => isSameDay(new Date(h.date), day))
        if (holiday && !holiday.isHalfDay) return undefined

        return reports.find(r =>
            isWithinInterval(day, { start: new Date(r.startDate), end: new Date(r.endDate) }) &&
            !r.excludedDates.some(ex => isSameDay(new Date(ex), day))
        )
    }

    // Handler for date selection
    const handleDayClick: DayClickEventHandler = (day, modifiers) => {
        const report = getReportForDay(day)
        setSelectedDate(day)
    }

    // Custom modifiers for react-day-picker
    const reportModifiers: Modifiers = {
        hasReport: (date) => !!getReportForDay(date),
        isHoliday: (date) => holidays.some(h => isSameDay(new Date(h.date), date)),
        isHalfDayHoliday: (date) => holidays.some(h => isSameDay(new Date(h.date), date) && h.isHalfDay),
    }

    const reportModifiersStyles: ModifiersStyles = {
        hasReport: {
            fontWeight: 'bold',
        },
        isHoliday: {
            color: '#dc2626', // red-600
        },
        isHalfDayHoliday: {
            color: '#ea580c', // orange-600
        }
    }

    const selectedReport = selectedDate ? getReportForDay(selectedDate) : null

    return (
        <div className="flex flex-col gap-4">
            <div className="p-2 border rounded-md w-full">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onDayClick={handleDayClick}
                    locale={tr}
                    className="rounded-md border p-2 w-full flex justify-center"
                    modifiers={reportModifiers}
                    modifiersStyles={{
                        selected: { backgroundColor: 'transparent', border: '2px solid var(--primary)', borderRadius: '100%' },
                        ...reportModifiersStyles
                    }}
                    formatters={{
                        formatDay: (date) => {
                            const report = getReportForDay(date)
                            const isToday = isSameDay(date, new Date())

                            return (
                                <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer group gap-0.5">
                                    {/* Date Number */}
                                    <span className={cn(
                                        "text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center transition-all",
                                        isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:bg-muted"
                                    )}>
                                        {format(date, 'd')}
                                    </span>

                                    {/* Colored Dot/Bar if Report Exists */}
                                    {report && (
                                        <div
                                            className="w-full max-w-[90%] h-1.5 rounded-full shadow-sm transition-all hover:brightness-110"
                                            style={{ backgroundColor: report.siteColor || '#3b82f6' }}
                                            title={report.siteName}
                                        />
                                    )}
                                </div>
                            )
                        }
                    }}
                    footer={
                        <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Rapor</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-red-600 font-bold">●</span>
                                <span>Tatil</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-orange-600 font-bold">●</span>
                                <span>Yarım Gün</span>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Info Section - Toggles between Total Summary and Selected Details */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {selectedDate ? format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr }) : "Toplam Rapor"}
                    </CardTitle>
                    {selectedDate && selectedReport && (
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedReport.siteColor || '#3b82f6' }}
                        />
                    )}
                </CardHeader>
                <CardContent>
                    {selectedDate ? (
                        selectedReport ? (
                            <div className="space-y-2">
                                <div className="text-xl font-bold">{selectedReport.siteName}</div>
                                <p className="text-xs text-muted-foreground">
                                    Bu tarihte şantiyedesiniz.
                                </p>
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    <Button size="sm" variant="outline" className="h-8 text-xs w-full" asChild>
                                        <Link href={`/reports/${selectedReport.id}/edit`}>
                                            <Pencil className="w-3 h-3 mr-2" />
                                            Raporu Düzenle
                                        </Link>
                                    </Button>
                                    {/* Delete button removed for simplicity as it requires server action passing or implementation. Can be added back if needed. */}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="text-lg font-semibold text-muted-foreground">Çalışma Yok</div>
                                <p className="text-xs text-muted-foreground">
                                    Seçilen tarihte herhangi bir rapor kaydı bulunamadı.
                                </p>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="text-2xl font-bold">{reports.length}</div>
                            <p className="text-xs text-muted-foreground">Son oluşturulan raporlarınız.</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
