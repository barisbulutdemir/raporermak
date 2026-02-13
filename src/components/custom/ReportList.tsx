'use client'

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, ChevronRight, Trash2, CheckSquare, Square } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { deleteReports } from "@/app/actions/report"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Report {
    id: string
    siteName: string
    siteColor: string | null
    startDate: Date
    endDate: Date
    createdAt: Date
    user: {
        name: string | null
    }
}

interface ReportListProps {
    reports: Report[]
}

export function ReportList({ reports }: ReportListProps) {
    const [selectedReports, setSelectedReports] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    const toggleReport = (reportId: string) => {
        setSelectedReports(prev =>
            prev.includes(reportId)
                ? prev.filter(id => id !== reportId)
                : [...prev, reportId]
        )
    }

    const toggleAll = () => {
        if (selectedReports.length === reports.length) {
            setSelectedReports([])
        } else {
            setSelectedReports(reports.map(r => r.id))
        }
    }

    const handleDeleteSelected = async () => {
        if (selectedReports.length === 0) return

        setIsDeleting(true)
        try {
            const result = await deleteReports(selectedReports)
            if (result.success) {
                toast.success(`${selectedReports.length} rapor silindi.`)
                setSelectedReports([])
            } else {
                toast.error(result.message || "Silme işlemi başarısız oldu.")
            }
        } catch (error) {
            toast.error("Bir hata oluştu.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Raporlar</h1>
                    <p className="text-muted-foreground">Tüm servis raporlarınızı buradan görüntüleyebilirsiniz.</p>
                </div>
                <div className="flex gap-2">
                    {selectedReports.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isDeleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Seçilileri Sil ({selectedReports.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Seçili {selectedReports.length} rapor kalıcı olarak silinecek. Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Link href="/reports/new">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Rapor
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Rapor Listesi</CardTitle>
                        <CardDescription>Toplam {reports.length} rapor bulundu.</CardDescription>
                    </div>
                    {reports.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="selectAll"
                                checked={selectedReports.length === reports.length && reports.length > 0}
                                onCheckedChange={toggleAll}
                            />
                            <label
                                htmlFor="selectAll"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                            >
                                Tümünü Seç
                            </label>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {reports.length === 0 ? (
                            <div className="text-center py-10">
                                <FileText className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3" />
                                <p className="text-muted-foreground">Henüz hiç rapor oluşturmadınız.</p>
                                <Link href="/reports/new" className="mt-4 inline-block">
                                    <Button variant="outline">İlk Raporu Oluştur</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {reports.map(report => (
                                    <div key={report.id} className="group relative flex items-center">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                            <Checkbox
                                                checked={selectedReports.includes(report.id)}
                                                onCheckedChange={() => toggleReport(report.id)}
                                            />
                                        </div>
                                        <Link href={`/reports/${report.id}/edit`} className="w-full pl-12">
                                            <div className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors bg-card">
                                                <div className="flex items-start gap-4">
                                                    <div
                                                        className="w-2 h-12 rounded-full shrink-0"
                                                        style={{ backgroundColor: report.siteColor || '#3b82f6' }}
                                                    />
                                                    <div className="space-y-1">
                                                        <p className="font-semibold group-hover:text-primary transition-colors">{report.siteName}</p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <span>{format(new Date(report.startDate), 'dd MMM yyyy', { locale: tr })}</span>
                                                            <span>-</span>
                                                            <span>{format(new Date(report.endDate), 'dd MMM yyyy', { locale: tr })}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-medium">{report.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
