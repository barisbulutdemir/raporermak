import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { DashboardCalendar } from "@/components/custom/DashboardCalendar"

export default async function DashboardPage() {
    const session = await auth()
    if (!session?.user?.name) return null

    const reports = await prisma.serviceReport.findMany({
        where: {
            user: { username: session.user.name }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })

    const holidays = await prisma.officialHoliday.findMany()

    return (
        <div className="grid gap-4 md:gap-8 md:grid-cols-2">
            <DashboardCalendar
                reports={reports.map(r => ({
                    id: r.id,
                    siteName: r.siteName,
                    siteColor: r.siteColor,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    excludedDates: r.excludedDates ? JSON.parse(r.excludedDates).map((d: string) => new Date(d)) : []
                }))}
                holidays={holidays}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Son Raporlar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {reports.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Henüz rapor oluşturmadınız.</p>
                        ) : (
                            reports.map(report => (
                                <Link key={report.id} href={`/reports/${report.id}`} className="block">
                                    <div className="flex items-center justify-between border-b pb-2 last:border-0 hover:bg-muted/50 p-2 rounded-md transition-colors">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{report.siteName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(report.startDate, 'dd MMM yyyy', { locale: tr })} - {format(report.endDate, 'dd MMM yyyy', { locale: tr })}
                                            </p>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {/* Status or other info */}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
