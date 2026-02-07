import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { calculateServiceReport } from "@/lib/calculationService"
import { format, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { PrintButton } from "@/components/custom/PrintButton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit } from "lucide-react"

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const { id } = await params
    const report = await prisma.serviceReport.findUnique({
        where: { id },
        include: { advances: true, expenses: true, user: true }
    })

    if (!report) notFound()

    // Fetch holidays for calculation
    // Ideally fetch holidays overlapping the range, but fetching all 2026/2027 is small enough
    const officialHolidays = await prisma.officialHoliday.findMany()

    const excludedDates = report.excludedDates ? JSON.parse(report.excludedDates) : []
    // Parse DB dates to JS Date objects
    const parsedExcluded = excludedDates.map((d: string) => new Date(d))

    // Transform Prisma holidays to Holiday interface format
    const holidays = officialHolidays.map(h => ({
        date: h.date,
        description: h.description,
        multiplier: h.isHalfDay ? 0.5 : 1.0
    }))

    const calculation = calculateServiceReport(
        report.startDate,
        report.endDate,
        parsedExcluded,
        holidays
    )

    const printStyles = `
    @media print {
      @page { 
        margin: 15mm; 
        size: A4 portrait;
      }
      @page :first {
        margin: 15mm;
      }
      body { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0;
        padding: 0;
      }
      .no-print { display: none !important; }
      .print-border { border: 1px solid #000; }
      html, body {
        height: auto;
        overflow: visible;
      }
      .print-container {
        page-break-after: avoid;
        page-break-inside: avoid;
        break-after: avoid;
        break-inside: avoid;
        orphans: 9999;
        widows: 9999;
      }
      table, .mb-8, .mb-12 {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  `

    return (
        <div className="max-w-[210mm] mx-auto bg-white p-6 text-black print-container">
            <style>{printStyles}</style>

            <div className="flex justify-end gap-2 mb-8 no-print">
                <Link href={`/reports/${report.id}/edit`}>
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" /> Düzenle
                    </Button>
                </Link>
                <PrintButton />
            </div>

            {/* Header */}
            <div className="flex justify-between items-end mb-4 border-b pb-2">
                <div>
                    <h1 className="text-xl font-bold">Kuveyt National Servis Raporu</h1>
                    <p className="not-italic mt-1 font-semibold">{report.user.name}</p>
                </div>
                <div className="text-right">
                    <p>{format(new Date(), 'dd.MM.yyyy')}</p>
                </div>
            </div>

            {/* Avans Table */}
            {report.advances.length > 0 && (
                <div className="mb-4">
                    <table className="w-full border-collapse border border-black text-xs">
                        <tbody>
                            {report.advances.map((adv, idx) => (
                                <tr key={adv.id}>
                                    <td className="border border-black p-1 w-1/4 font-semibold">{idx === 0 ? 'Avans:' : ''}</td>
                                    <td className="border border-black p-1">
                                        {adv.amount} {adv.currency} {adv.note ? `(${adv.note})` : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Harcamalar Table */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-xs">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 w-1/4 font-semibold align-top">Harcamalar:</td>
                            <td className="border border-black p-0">
                                <div className="flex flex-col">
                                    {report.expenses.map((exp, idx) => (
                                        <div key={exp.id} className="p-1 border-b border-black last:border-b-0">
                                            {exp.amount} {exp.currency} - {exp.description}
                                        </div>
                                    ))}
                                    {report.expenses.length === 0 && <div className="p-1">-</div>}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-semibold">Toplam Harcama</td>
                            <td className="border border-black p-1 font-bold">
                                {/* Simple aggregation by currency */}
                                {(() => {
                                    const totals = report.expenses.reduce((acc, curr) => {
                                        acc[curr.currency] = (acc[curr.currency] || 0) + curr.amount
                                        return acc
                                    }, {} as Record<string, number>)

                                    return Object.entries(totals).map(([curr, amount]) => `${amount} ${curr}`).join(' + ') || '0 TL'
                                })()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Mesai Özeti Table */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-xs">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 w-1/3">Şantiye gidiş tarihi</td>
                            <td className="border border-black p-1">
                                {format(report.startDate, 'dd.MM.yyyy')}
                                {/* Check if start day was worked? Assume check details. */}
                                {calculation.details.find(d => isSameDay(d.date, report.startDate))?.type !== 'Excluded' ? ' (Çalışıldı)' : ' (Çalışılmadı)'}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1">Şantiye dönüş tarihi</td>
                            <td className="border border-black p-1">
                                {format(report.endDate, 'dd.MM.yyyy')}
                                {calculation.details.find(d => isSameDay(d.date, report.endDate))?.type !== 'Excluded' ? ' (Çalışıldı)' : ' (Çalışılmadı)'}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1">Toplam çalışma günü</td>
                            <td className="border border-black p-1">{calculation.normalDays} gün</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1">Toplam cumartesi</td>
                            <td className="border border-black p-1">{calculation.saturdayHours} saat</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1">Toplam pazar</td>
                            <td className="border border-black p-1">{calculation.sundayHours} saat</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1">Toplam resmi tatil</td>
                            <td className="border border-black p-1">{calculation.holidayHours} saat</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Mesai Ayrıntıları (List of holidays/weekends) */}
            <div className="mb-6">
                <h3 className="font-bold mb-2 text-sm">Mesai ayrıntıları:</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                    {calculation.details
                        .filter(d => d.rate > 1.0 || d.type === 'Holiday' || d.type === 'HolidayHalf')
                        .map((d, idx) => (
                            <div key={idx}>
                                {d.dateStr} {d.description || d.dayName} - {d.hours} saat
                            </div>
                        ))}
                </div>
            </div>

            {/* Signature and Note */}
            <div className="flex justify-end mt-8">
                <div className="text-center w-[200px]">
                    {report.workerSignature ? (
                        <img src={report.workerSignature} alt="İmza" className="max-h-[80px] mx-auto mb-2" />
                    ) : (
                        <div className="h-[60px] mb-2"></div>
                    )}
                    <p className="font-semibold text-sm">{report.user.name}</p>
                </div>
            </div>

            {report.summaryNotes && (
                <div className="mt-8 border-t pt-4 text-sm">
                    <p className="font-semibold">Notlar:</p>
                    <p>{report.summaryNotes}</p>
                </div>
            )}
        </div>
    )
}
