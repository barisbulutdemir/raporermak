import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { ReportForm } from '@/components/custom/ReportForm'
import { DeleteReportButton } from '@/components/custom/DeleteReportButton'
import { getExchangeRates } from '@/app/actions/exchangeRates'

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    const { id } = await params

    const report = await prisma.serviceReport.findUnique({
        where: { id },
        include: {
            advances: true,
            expenses: true,
            user: {
                select: {
                    name: true,
                    monthlySalary: true
                }
            },
            attachments: true
        }
    })

    if (!report) {
        notFound()
    }

    // Fetch exchange rates for the report's start date (cached 24h)
    const exchangeRates = await getExchangeRates(report.startDate).catch(() => null)

    // Parse JSON fields because Prisma returns them as strings (custom schema choice)
    const parsedReport = {
        ...report,
        excludedDates: report.excludedDates ? JSON.parse(report.excludedDates) : [],
        holidays: report.holidays ? JSON.parse(report.holidays) : []
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Raporu Düzenle</h1>
                <DeleteReportButton reportId={report.id} />
            </div>
            <ReportForm
                initialData={parsedReport}
                reportId={report.id}
                defaultUserName={session.user.name || ''}
                monthlySalary={report.user.monthlySalary}
                exchangeRates={exchangeRates}
            />
        </div>
    )
}
