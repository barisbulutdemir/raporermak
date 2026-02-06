'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { STATIC_HOLIDAYS } from "@/lib/holidays"
import { createReport, deleteReport, updateReport } from '@/app/actions/report'
import { getOfficialHolidays } from '@/app/actions/holiday'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { format, eachDayOfInterval, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { Trash2, PlusCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { toast } from "sonner"
import { ReportPdfTemplate } from "./ReportPdfTemplate"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const formSchema = z.object({
    userName: z.string().min(1, 'Ad Soyad gereklidir'),
    siteName: z.string().min(1, 'Şantiye adı gereklidir'),
    siteColor: z.string().optional(),
    dateRange: z.object({
        from: z.date(),
        to: z.date().optional(),
    }).refine((data) => data.to != null, { message: "Bitiş tarihi seçilmelidir" }),
    excludedDates: z.array(z.date()).optional(),
    advances: z.array(z.object({
        amount: z.coerce.number().min(0, 'Tutar 0 dan büyük olmalı'),
        currency: z.enum(['TL', 'USD', 'EUR']),
        note: z.string().optional(),
    })),
    expenses: z.array(z.object({
        amount: z.coerce.number().min(0, 'Tutar 0 dan büyük olmalı'),
        currency: z.enum(['TL', 'USD', 'EUR']),
        description: z.string().min(1, 'Açıklama gereklidir'),
    })),
    summaryNotes: z.string().optional(),
    signature: z.string().optional(),
    totalWorkingDays: z.coerce.number().default(0),
    extraTime50: z.coerce.number().min(0).default(0),
    extraTime100: z.coerce.number().min(0).default(0),
    holidayTime100: z.coerce.number().min(0).default(0),
    holidays: z.array(z.date()).optional(),
})

export interface ReportFormProps {
    initialData?: any
    reportId?: string
    defaultUserName?: string
    defaultSignature?: string
}

export function ReportForm({ initialData, reportId, defaultUserName, defaultSignature }: ReportFormProps) {
    const [isPending, startTransition] = useTransition()
    const [createdReportId, setCreatedReportId] = useState<string | null>(null)


    const _unused_handleExportPDF = async () => {
        const data = form.getValues()
        // Quick validation
        if (!data.userName || !data.siteName) {
            toast.error("Lütfen ad soyad ve şantiye bilgilerini doldurunuz.")
            return
        }

        try {
            console.log("Starting PDF export with Template Component...")

            // dynamically import ReactDOMServer to avoid server-side issues in client component if strictly standard
            // usually in Next.js app directory client components, we can import it. 
            // If strictly needed, we can use a basic import at top level, but let's try strict isolation.
            const ReactDOMServer = (await import('react-dom/server')).default

            // Calculate special days (Mesailer) logic here in the client to ensure consistency
            // We fetch holidays directly here to ensure we have the latest data and avoid state sync issues
            const from = data.dateRange?.from
            const to = data.dateRange?.to
            let specialDaysData: any[] = []

            if (from && to) {
                // Fetch official holidays for this range to be 100% sure we have descriptions
                let fetchedHolidays: any[] = []
                try {
                    const holidayResult = await getOfficialHolidays(from, to)
                    if (holidayResult.success && holidayResult.data) {
                        fetchedHolidays = holidayResult.data
                    }
                } catch (e) {
                    console.error("PDF generation holiday fetch error", e)
                }

                // Helper for safe date comparison
                const toISODate = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd')

                const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) })
                specialDaysData = days.filter(day => {
                    // Check if it's a special day (Holiday or Weekend) AND NOT Excluded (Working)
                    if (isExcluded(day)) return false

                    // Check isHoliday against our fresh fetch AND the form's holiday list (to respect user toggles if any)
                    // Primarily rely on fresh fetch for description
                    // Use string comparison to avoid timezone issues
                    const dayIso = toISODate(day)
                    const foundInFetch = fetchedHolidays.find(h => toISODate(h.date) === dayIso)

                    const isHol = isHoliday(day) || !!foundInFetch // logic: if in list OR in fetch

                    const dayOfW = day.getDay() // 0=Sun, 6=Sat
                    return isHol || dayOfW === 0 || dayOfW === 6
                }).map(day => {
                    const dayIso = toISODate(day)
                    const foundInFetch = fetchedHolidays.find(h => toISODate(h.date) === dayIso)

                    if (foundInFetch) {
                        console.log("PDF DEBUG: Holiday match found:", dayIso, foundInFetch)
                    }

                    const isHol = isHoliday(day) || !!foundInFetch

                    let dayName = format(day, 'EEEE', { locale: tr })
                    const dateStr = format(day, 'dd.MM.yyyy')
                    let hours = "8 saat"

                    if (isHol) {
                        // Prefer fetched details
                        const isHalf = foundInFetch ? foundInFetch.isHalfDay : false
                        const description = foundInFetch ? foundInFetch.description : null

                        // Use description if available
                        if (description) {
                            dayName = description
                        }

                        hours = isHalf ? "4 saat (Yarım Gün)" : "8 saat"
                    }

                    return {
                        dateStr,
                        dayName,
                        hours,
                        isHoliday: isHol
                    }
                })
            }

            // Use default signature if available
            const signatureDataUrl = defaultSignature || ''

            const htmlContent = ReactDOMServer.renderToStaticMarkup(
                <ReportPdfTemplate data={data} specialDaysData={specialDaysData} signatureDataUrl={signatureDataUrl} />
            )

            // 1. Create a hidden iframe
            const iframe = document.createElement('iframe')
            iframe.style.position = 'fixed'
            iframe.style.left = '-9999px'
            iframe.style.top = '0'
            iframe.style.width = '210mm'
            iframe.style.height = '297mm'
            iframe.style.border = 'none'
            document.body.appendChild(iframe)

            const doc = iframe.contentDocument
            if (!doc) throw new Error("Iframe document not created")

            doc.open()
            doc.write(`
                <html>
                    <head>
                        <style>
                            body { margin: 0; padding: 0; background-color: #ffffff; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                </html>
            `)
            doc.close()

            // Wait for resources
            await new Promise(resolve => setTimeout(resolve, 500))

            // 3. Generate Canvas
            const targetElement = doc.getElementById('pdf-template-root')
            if (!targetElement) throw new Error("PDF Template root element not found in iframe")

            const canvas = await html2canvas(targetElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            // 4. Create PDF
            // Use JPEG instead of PNG to drastically reduce file size (7MB -> ~500KB)
            const imgData = canvas.toDataURL('image/jpeg', 0.8)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            pdf.save(`servis-raporu-${format(new Date(), 'dd-MM-yyyy')}.pdf`)
            toast.success("PDF indirildi")

            document.body.removeChild(iframe)

        } catch (error: any) {
            console.error("PDF export error:", error)
            toast.error(`PDF Hatası: ${error?.message || "Bilinmeyen hata"}`)
        }
    }

    // Generate a random vibrant color for new reports
    const generateRandomColor = () => {
        const vibrantColors = [
            '#ef4444', // red
            '#f97316', // orange
            '#f59e0b', // amber
            '#84cc16', // lime
            '#22c55e', // green
            '#10b981', // emerald
            '#14b8a6', // teal
            '#06b6d4', // cyan
            '#0ea5e9', // sky
            '#3b82f6', // blue
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#a855f7', // purple
            '#d946ef', // fuchsia
            '#ec4899', // pink
            '#f43f5e', // rose
        ]
        return vibrantColors[Math.floor(Math.random() * vibrantColors.length)]
    }

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            userName: initialData.userName || initialData.user?.name || '',
            siteName: initialData.siteName || '',
            siteColor: initialData.siteColor || '#3b82f6',
            dateRange: {
                from: initialData.startDate ? new Date(initialData.startDate) : undefined,
                to: initialData.endDate ? new Date(initialData.endDate) : undefined
            },
            excludedDates: initialData.excludedDates?.map((d: any) => new Date(d)) || [],
            advances: initialData.advances || [],
            expenses: initialData.expenses || [],
            summaryNotes: initialData.summaryNotes || "",
            holidays: initialData.holidays?.map((d: any) => new Date(d)) || [],
            totalWorkingDays: initialData.totalWorkingDays || 0,
            extraTime50: initialData.extraTime50 || 0,
            extraTime100: initialData.extraTime100 || 0,
            holidayTime100: initialData.holidayTime100 || 0,
        } : {
            userName: defaultUserName || '',
            siteName: '',
            siteColor: generateRandomColor(),
            dateRange: {
                from: undefined,
                to: undefined
            },
            excludedDates: [],
            advances: [],
            expenses: [],
            summaryNotes: '',
            holidays: [],
            totalWorkingDays: 0,
            extraTime50: 0,
            extraTime100: 0,
            holidayTime100: 0,
        },
    })

    // Signature is handled via defaultSignature prop from parent component

    const { fields: advanceFields, append: appendAdvance, remove: removeAdvance } = useFieldArray({
        control: form.control,
        name: "advances",
    })

    const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
        control: form.control,
        name: "expenses",
    })



    // Dialog states
    // Removed redundant local states for dateRange and excludedDates as they conflict with form.watch
    // We will use form.watch for these.
    // Holidays also should be form driven since we added it to schema
    const [selectionMode, setSelectionMode] = useState<'default' | 'holiday'>('default')

    // Store holiday details (isHalfDay, description) for calculation and display
    const [holidayDetails, setHolidayDetails] = useState<Record<string, { isHalfDay: boolean, description: string }>>({})

    const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
    const [newAdvance, setNewAdvance] = useState<{ amount: string, currency: 'TL' | 'USD' | 'EUR', note: string }>({ amount: '', currency: 'TL', note: '' })

    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
    const [newExpense, setNewExpense] = useState<{ amount: string, currency: 'TL' | 'USD' | 'EUR', description: string }>({ amount: '', currency: 'TL', description: '' })

    const handleExportPDFNew = async () => {
        const data = form.getValues()
        // Quick validation
        if (!data.userName || !data.siteName) {
            toast.error("Lütfen ad soyad ve şantiye bilgilerini doldurunuz.")
            return
        }

        try {
            console.log("Starting PDF export with Template Component (NEW HANDLER)...")

            // dynamically import ReactDOMServer to avoid server-side issues in client component if strictly standard
            // usually in Next.js app directory client components, we can import it. 
            // If strictly needed, we can use a basic import at top level, but let's try strict isolation.
            const ReactDOMServer = (await import('react-dom/server')).default

            // Calculate special days (Mesailer) logic here in the client to ensure consistency
            // We use the LOCAL STATE (holidayDetails) which we know is correct because the UI buttons are correct.
            const from = data.dateRange?.from
            const to = data.dateRange?.to
            let specialDaysData: any[] = []

            console.log("PDF DEBUG: holidayDetails state keys:", Object.keys(holidayDetails))

            if (from && to) {
                const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) })
                specialDaysData = days.filter(day => {
                    // Check if it's a special day (Holiday or Weekend) AND NOT Excluded (Working)
                    if (isExcluded(day)) return false

                    const isHol = isHoliday(day)
                    const dayOfW = day.getDay() // 0=Sun, 6=Sat
                    return isHol || dayOfW === 0 || dayOfW === 6
                }).map(day => {
                    const isHol = isHoliday(day)
                    let dayName = format(day, 'EEEE', { locale: tr })
                    const dateStr = format(day, 'dd.MM.yyyy')
                    let hours = "8 saat"

                    if (isHol) {
                        // Lookup specific details from local state using strict string key
                        const dayKey = format(day, 'yyyy-MM-dd')
                        const detail = holidayDetails[dayKey]

                        if (detail) {
                            console.log("PDF DEBUG: Found local detail for", dateStr, detail)
                        }

                        const isHalf = detail?.isHalfDay
                        const description = detail?.description

                        // Use description if available
                        if (description) {
                            dayName = description
                        }

                        hours = isHalf ? "4 saat" : "8 saat"
                    }

                    return {
                        dateStr,
                        dayName,
                        hours,
                        isHoliday: isHol
                    }
                })
            }

            // Use default signature if available
            const signatureDataUrl = defaultSignature || ''

            const htmlContent = ReactDOMServer.renderToStaticMarkup(
                <ReportPdfTemplate data={data} specialDaysData={specialDaysData} signatureDataUrl={signatureDataUrl} />
            )

            // 1. Create a hidden iframe
            const iframe = document.createElement('iframe')
            iframe.style.position = 'fixed'
            iframe.style.left = '-9999px'
            iframe.style.top = '0'
            iframe.style.width = '210mm'
            iframe.style.height = '297mm'
            iframe.style.border = 'none'
            document.body.appendChild(iframe)

            const doc = iframe.contentDocument
            if (!doc) throw new Error("Iframe document not created")

            doc.open()
            doc.write(`
                <html>
                    <head>
                        <style>
                            body { margin: 0; padding: 0; background-color: #ffffff; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                </html>
            `)
            doc.close()

            // Wait for resources
            await new Promise(resolve => setTimeout(resolve, 500))

            // 3. Generate Canvas
            const targetElement = doc.getElementById('pdf-template-root')
            if (!targetElement) throw new Error("PDF Template root element not found in iframe")

            const canvas = await html2canvas(targetElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            // 4. Create PDF
            // Use JPEG instead of PNG to drastically reduce file size (7MB -> ~500KB)
            const imgData = canvas.toDataURL('image/jpeg', 0.8)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            pdf.save(`servis-raporu-${format(new Date(), 'dd-MM-yyyy')}.pdf`)
            toast.success("PDF indirildi")

            document.body.removeChild(iframe)

        } catch (error: any) {
            console.error("PDF export error:", error)
            toast.error(`PDF Hatası: ${error?.message || "Bilinmeyen hata"}`)
        }
    }

    const _unused_handleExportPDF_2 = async () => {
        const data = form.getValues()
        // Quick validation
        if (!data.userName || !data.siteName) {
            toast.error("Lütfen ad soyad ve şantiye bilgilerini doldurunuz.")
            return
        }

        try {
            console.log("Starting PDF export with Template Component...")

            // dynamically import ReactDOMServer to avoid server-side issues in client component if strictly standard
            // usually in Next.js app directory client components, we can import it. 
            // If strictly needed, we can use a basic import at top level, but let's try strict isolation.
            const ReactDOMServer = (await import('react-dom/server')).default

            // Calculate special days (Mesailer) logic here in the client to ensure consistency
            // We use the LOCAL STATE (holidayDetails) which we know is correct because the UI buttons are correct.
            const from = data.dateRange?.from
            const to = data.dateRange?.to
            let specialDaysData: any[] = []

            console.log("PDF DEBUG: holidayDetails state keys:", Object.keys(holidayDetails))

            if (from && to) {
                const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) })
                specialDaysData = days.filter(day => {
                    // Check if it's a special day (Holiday or Weekend) AND NOT Excluded (Working)
                    if (isExcluded(day)) return false

                    const isHol = isHoliday(day)
                    const dayOfW = day.getDay() // 0=Sun, 6=Sat
                    return isHol || dayOfW === 0 || dayOfW === 6
                }).map(day => {
                    const isHol = isHoliday(day)
                    let dayName = format(day, 'EEEE', { locale: tr })
                    const dateStr = format(day, 'dd.MM.yyyy')
                    let hours = "8 saat"

                    if (isHol) {
                        // Lookup specific details from local state
                        // NOTE: holidayDetails keys are ISO strings from the db/action
                        // We need to find the matching key.
                        const detailEntry = Object.entries(holidayDetails).find(([k]) => isSameDay(new Date(k), day))
                        const detail = detailEntry ? detailEntry[1] : null

                        if (detail) {
                            console.log("PDF DEBUG: Found local detail for", dateStr, detail)
                        }

                        const isHalf = detail?.isHalfDay
                        const description = detail?.description

                        // Use description if available
                        if (description) {
                            dayName = description
                        }

                        hours = isHalf ? "4 saat (Yarım Gün)" : "8 saat"
                    }

                    return {
                        dateStr,
                        dayName,
                        hours,
                        isHoliday: isHol
                    }
                })
            }

            // Use default signature if available
            const signatureDataUrl = defaultSignature || ''

            const htmlContent = ReactDOMServer.renderToStaticMarkup(
                <ReportPdfTemplate data={data} specialDaysData={specialDaysData} signatureDataUrl={signatureDataUrl} />
            )

            // 1. Create a hidden iframe
            const iframe = document.createElement('iframe')
            iframe.style.position = 'fixed'
            iframe.style.left = '-9999px'
            iframe.style.top = '0'
            iframe.style.width = '210mm'
            iframe.style.height = '297mm'
            iframe.style.border = 'none'
            document.body.appendChild(iframe)

            const doc = iframe.contentDocument
            if (!doc) throw new Error("Iframe document not created")

            doc.open()
            doc.write(`
                <html>
                    <head>
                        <style>
                            body { margin: 0; padding: 0; background-color: #ffffff; }
                        </style>
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                </html>
            `)
            doc.close()

            // Wait for resources
            await new Promise(resolve => setTimeout(resolve, 500))

            // 3. Generate Canvas
            const targetElement = doc.getElementById('pdf-template-root')
            if (!targetElement) throw new Error("PDF Template root element not found in iframe")

            const canvas = await html2canvas(targetElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            // 4. Create PDF
            // Use JPEG instead of PNG to drastically reduce file size (7MB -> ~500KB)
            const imgData = canvas.toDataURL('image/jpeg', 0.8)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgWidth = 210
            const pageHeight = 297
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            pdf.save(`servis-raporu-${format(new Date(), 'dd-MM-yyyy')}.pdf`)
            toast.success("PDF indirildi")

            document.body.removeChild(iframe)

        } catch (error: any) {
            console.error("PDF export error:", error)
            toast.error(`PDF Hatası: ${error?.message || "Bilinmeyen hata"}`)
        }
    }



    const handleAddAdvance = () => {
        const amount = parseFloat(newAdvance.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Geçerli bir tutar giriniz")
            return
        }
        appendAdvance({
            amount,
            currency: newAdvance.currency,
            note: newAdvance.note
        })
        setNewAdvance({ amount: '', currency: 'TL', note: '' })
        setIsAdvanceDialogOpen(false)
    }

    const handleAddExpense = () => {
        const amount = parseFloat(newExpense.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Geçerli bir tutar giriniz")
            return
        }
        if (!newExpense.description) {
            toast.error("Açıklama giriniz")
            return
        }
        appendExpense({
            amount,
            currency: newExpense.currency,
            description: newExpense.description
        })
        setNewExpense({ amount: '', currency: 'TL', description: '' })
        setIsExpenseDialogOpen(false)
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!values.dateRange.to) {
            toast.error("Lütfen bir tarih aralığı seçin")
            return
        }

        startTransition(async () => {
            // Use default signature or existing signature from edit mode
            const signatureData = defaultSignature || initialData?.workerSignature || ''

            if (!signatureData) {
                toast.error("İmza gereklidir")
                return
            }

            // Transform generic dateRange to strict range
            const payload = {
                ...values,
                dateRange: { from: values.dateRange.from, to: values.dateRange.to as Date },
                signature: signatureData
            }

            let result

            // DECIDE ACTION: Update or Create
            if (reportId) {
                // EDIT MODE
                result = await updateReport(reportId, payload)
            } else if (createdReportId) {
                // Previously created in this session -> Update it
                result = await updateReport(createdReportId, payload)
            } else {
                // CREATE MODE
                result = await createReport(undefined as any, payload)
            }

            if (result?.message !== 'Success') {
                toast.error(result?.message || "Hata oluştu")
            } else {
                if (!reportId && !createdReportId && result.reportId) {
                    setCreatedReportId(result.reportId)
                }
                toast.success(reportId ? "Rapor güncellendi" : "Rapor başarıyla kaydedildi")

                // If updating, maybe we don't auto-download PDF every time?
                // But user might expect it. Let's keep it for now.
                await handleExportPDFNew()
            }
        })
    }

    const dateRange = form.watch('dateRange')
    const watchedExcludedDates = form.watch('excludedDates')
    const watchedHolidays = form.watch('holidays')

    // Stabilize arrays to prevent infinite loops in useEffect
    const excludedDates = useMemo(() => watchedExcludedDates || [], [watchedExcludedDates])
    const holidays = useMemo(() => watchedHolidays || [], [watchedHolidays])

    // Helper functions
    const isExcluded = (day: Date) => excludedDates.some(d => isSameDay(d, day))
    const isHoliday = (day: Date) => holidays.some(d => isSameDay(d, day))

    const toggleExcludedDate = (day: Date) => {
        const current = form.getValues('excludedDates') || []
        const exists = current.some(d => isSameDay(d, day))
        if (exists) {
            form.setValue('excludedDates', current.filter(d => !isSameDay(d, day)))
        } else {
            form.setValue('excludedDates', [...current, day])
        }
    }

    // Fetch official holidays (Hybrid: DB first, then Static fallback)
    useEffect(() => {
        const fetchHolidays = async () => {
            if (dateRange?.from && dateRange?.to) {
                const start = dateRange.from
                const end = dateRange.to
                let finalHolidays: any[] = []
                let source = "static"

                try {
                    const dbHolidays = await getOfficialHolidays(start, end)
                    if (dbHolidays && dbHolidays.length > 0) {
                        finalHolidays = dbHolidays
                        source = "db"
                    }
                } catch (error) {
                    console.error("DB Holiday fetch failed", error)
                }

                if (finalHolidays.length === 0) {
                    finalHolidays = STATIC_HOLIDAYS.filter(h => {
                        const d = new Date(h.date)
                        return d >= start && d <= end
                    })
                    source = "static"
                }

                const holidayDates = finalHolidays.map(h => new Date(h.date))
                form.setValue('holidays', holidayDates)

                const details: Record<string, { isHalfDay: boolean, description: string }> = {}
                finalHolidays.forEach(h => {
                    const d = new Date(h.date)
                    const key = format(d, 'yyyy-MM-dd')
                    details[key] = {
                        isHalfDay: h.isHalfDay,
                        description: h.description
                    }
                })
                setHolidayDetails(details)

                if (finalHolidays.length > 0 && source === 'db') {
                    // Only log/toast if from DB to confirm admin works
                    console.log("Using Admin Managed Holidays")
                }
            }
        }
        fetchHolidays()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange?.from, dateRange?.to])

    // Toggle functions operating directly on form state
    const handleDayClick = (day: Date) => {
        if (selectionMode === 'holiday') {
            // Toggle Holiday
            if (isHoliday(day)) {
                // Remove from holidays
                form.setValue('holidays', holidays.filter(d => !isSameDay(d, day)))
            } else {
                // Add to holidays
                form.setValue('holidays', [...holidays, day])
                // Ensure it is removed from excludedDates if present (optional but cleaner)
                if (isExcluded(day)) {
                    form.setValue('excludedDates', excludedDates.filter(d => !isSameDay(d, day)))
                }
            }
        } else {
            // Toggle Excluded (Work/Off)
            if (isExcluded(day)) {
                // Remove from excluded
                form.setValue('excludedDates', excludedDates.filter(d => !isSameDay(d, day)))
            } else {
                // Add to excluded
                form.setValue('excludedDates', [...excludedDates, day])
                // Remove from holidays if present
                if (isHoliday(day)) {
                    form.setValue('holidays', holidays.filter(d => !isSameDay(d, day)))
                }
            }
        }
    }

    const toggleDate = (day: Date) => handleDayClick(day)

    // Fetch official holidays when date range changes
    useEffect(() => {
        const fetchHolidays = async () => {
            if (dateRange?.from && dateRange?.to) {
                try {
                    const officialHolidays = await getOfficialHolidays(dateRange.from, dateRange.to)
                    if (officialHolidays && officialHolidays.length > 0) {
                        const currentHolidays = form.getValues('holidays') || []
                        const newHolidays = [...currentHolidays]
                        let changed = false

                        officialHolidays.forEach(h => {
                            const hDate = new Date(h.date) // Ensure Date object
                            // Add if not already present
                            const exists = newHolidays.some(existing => isSameDay(existing, hDate))
                            if (!exists) {
                                newHolidays.push(hDate)
                                changed = true
                            }
                        })

                        if (changed) {
                            form.setValue('holidays', newHolidays)
                            toast.success("Resmi tatiller eklendi", {
                                description: `${officialHolidays.length} adet resmi tatil bulundu ve eklendi.`
                            })
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch holidays", error)
                }
            }
        }
        fetchHolidays()
    }, [dateRange?.from, dateRange?.to, form])

    // Calculate total working days effect
    useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })

            let totalDays = 0
            let extra50 = 0
            let extra100 = 0
            let holiday100 = 0

            days.forEach(day => {
                // If day is excluded (Off day), skip everything
                if (isExcluded(day)) return

                const isHol = isHoliday(day)

                if (isHol) {
                    // Check if half day via holidayDetails
                    // Use string key for reliable lookup
                    const dayKey = format(day, 'yyyy-MM-dd')
                    const detail = holidayDetails[dayKey]
                    const isHalf = detail ? detail.isHalfDay : false

                    if (isHalf) {
                        holiday100 += 4
                    } else {
                        holiday100 += 8
                    }
                } else {
                    const dayOfW = day.getDay() // 0=Sun, 1=Mon... 6=Sat
                    if (dayOfW === 0) {
                        extra100 += 8
                    } else if (dayOfW === 6) {
                        totalDays += 1
                        extra50 += 8
                    } else {
                        totalDays += 1
                    }
                }
            })

            form.setValue('totalWorkingDays', totalDays)
            form.setValue('extraTime50', extra50)
            form.setValue('extraTime100', extra100)
            form.setValue('holidayTime100', holiday100)
        } else {
            form.setValue('totalWorkingDays', 0)
            form.setValue('extraTime50', 0)
            form.setValue('extraTime100', 0)
            form.setValue('holidayTime100', 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange?.from, dateRange?.to, excludedDates, holidays, holidayDetails])


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Genel Bilgiler</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="userName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ad Soyad</FormLabel>
                                        <FormControl><Input placeholder="Adınızı ve soyadınızı giriniz" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="siteName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Şantiye Adı</FormLabel>
                                        <FormControl><Input placeholder="Şantiye adını giriniz" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="siteColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Şantiye Rengi</FormLabel>
                                        <FormControl>
                                            <div className="flex gap-2 items-center">
                                                <Input type="color" className="w-12 h-10 p-1" {...field} />
                                                <span className="text-sm text-gray-500">{field.value}</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="dateRange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Servis Tarihleri</FormLabel>
                                        <div className="border rounded-md p-4 bg-background">
                                            <Calendar
                                                mode="range"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                numberOfMonths={1}
                                                locale={tr}
                                                className="w-full flex justify-center"
                                                modifiers={{ holiday: holidays }}
                                                modifiersStyles={{ holiday: { color: 'red', fontWeight: 'bold' } }}
                                            />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Çalışma Günleri Kontrolü</CardTitle>
                            <CardDescription>Seçili aralıktaki tatil veya çalışılmayan günleri işaretleyin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dateRange?.from && dateRange?.to ? (
                                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                                    {eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((day) => {
                                        const active = !isExcluded(day)
                                        const dayOfWeek = day.getDay()
                                        const isHol = isHoliday(day)
                                        let bgClass = "bg-gray-200 text-gray-500" // Default inactive

                                        if (active) {
                                            if (isHol) bgClass = "bg-red-500 hover:bg-red-600 text-white" // Official Holiday
                                            else if (dayOfWeek === 0) bgClass = "bg-blue-500 hover:bg-blue-600 text-white" // Sunday
                                            else if (dayOfWeek === 6) bgClass = "bg-purple-500 hover:bg-purple-600 text-white" // Saturday
                                            else bgClass = "bg-green-600 hover:bg-green-700 text-white" // Weekday
                                        }

                                        // Holiday Text Logic
                                        let dayText = format(day, 'EEE', { locale: tr })

                                        let isHolidayText = false
                                        if (isHol) {
                                            // Use string key for reliable lookup
                                            const dayKey = format(day, 'yyyy-MM-dd')
                                            const detail = holidayDetails[dayKey]
                                            const description = detail ? detail.description : null
                                            if (description) {
                                                isHolidayText = true
                                                // Improved abbreviation logic
                                                if (description.toLowerCase().includes("bayram")) {
                                                    // "Kurban Bayramı" -> "Kurban B."
                                                    const words = description.split(' ')
                                                    // Find the word before "Bayramı"
                                                    const bayramIndex = words.findIndex(w => w.toLowerCase().includes("bayram"))
                                                    if (bayramIndex > 0) {
                                                        dayText = words[bayramIndex - 1] + " B."
                                                    } else {
                                                        dayText = description.substring(0, 9)
                                                    }
                                                } else if (description.length > 9) {
                                                    // "Ulusal Egemenlik..." -> "Ulusal E."
                                                    const words = description.split(' ')
                                                    if (words.length > 1) {
                                                        dayText = words[0] + (words[1] ? ' ' + words[1][0] + '.' : '')
                                                    } else {
                                                        dayText = description.substring(0, 8) + '.'
                                                    }
                                                } else {
                                                    dayText = description
                                                }

                                                // Final safety truncate
                                                if (dayText.length > 10) dayText = dayText.substring(0, 9) + '.'
                                            }
                                        }

                                        return (
                                            <Button
                                                key={day.toISOString()}
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className={cn("w-10 h-10 p-0 text-xs", bgClass)}
                                                onClick={() => toggleExcludedDate(day)}
                                                title={format(day, 'dd MMMM yyyy', { locale: tr }) + (active ? ' (Çalışıldı)' : ' (Çalışılmadı)')}
                                            >
                                                <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden leading-tight">
                                                    <span>{format(day, 'dd')}</span>
                                                    <span className={cn("text-[8px] text-center px-0.5 leading-[0.8rem]", isHolidayText ? "font-bold" : "")}>{dayText}</span>
                                                </div>
                                            </Button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">Önce tarih aralığı seçiniz.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Mesai ve Çalışma Özeti */}
                <Card>
                    <CardHeader className="py-2">
                        <CardTitle className="text-base">Mesai ve Çalışma Özeti</CardTitle>
                        <CardDescription className="text-xs">Otomatik hesaplanan çalışma ve mesai süreleri.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {/* Toplam Çalışma */}
                            <FormField
                                control={form.control}
                                name="totalWorkingDays"
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input type="hidden" {...field} value={field.value ?? 0} />
                                        </FormControl>
                                        <div className="bg-blue-50 border border-blue-100 rounded-md p-2 text-center flex flex-col justify-center h-full">
                                            <span className="text-xs font-medium text-blue-600 mb-0.5">Toplam Çalışma</span>
                                            <span className="text-lg font-bold text-blue-900">{field.value} Gün</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* %50 Mesai */}
                            <FormField
                                control={form.control}
                                name="extraTime50"
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input type="hidden" {...field} value={field.value ?? 0} />
                                        </FormControl>
                                        <div className="bg-orange-50 border border-orange-100 rounded-md p-2 text-center flex flex-col justify-center h-full">
                                            <span className="text-xs font-medium text-orange-600 mb-0.5">%50 Mesai</span>
                                            <span className="text-lg font-bold text-orange-900">{field.value} Saat</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* %100 Mesai */}
                            <FormField
                                control={form.control}
                                name="extraTime100"
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input type="hidden" {...field} value={field.value ?? 0} />
                                        </FormControl>
                                        <div className="bg-purple-50 border border-purple-100 rounded-md p-2 text-center flex flex-col justify-center h-full">
                                            <span className="text-xs font-medium text-purple-600 mb-0.5">%100 Mesai</span>
                                            <span className="text-lg font-bold text-purple-900">{field.value} Saat</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Resmi Tatil Mesaisi */}
                            <FormField
                                control={form.control}
                                name="holidayTime100"
                                render={({ field }) => (
                                    <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input type="hidden" {...field} value={field.value ?? 0} />
                                        </FormControl>
                                        <div className="bg-red-50 border border-red-100 rounded-md p-2 text-center flex flex-col justify-center h-full">
                                            <span className="text-xs font-medium text-red-600 mb-0.5">Resmi Tatil</span>
                                            <span className="text-lg font-bold text-red-900">{field.value} Saat</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Avanslar */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Avanslar</CardTitle>
                            <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Ekle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Yeni Avans Ekle</DialogTitle>
                                        <DialogDescription>Avans detaylarını giriniz.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Tutar ve Para Birimi</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={newAdvance.amount}
                                                    onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                                                    className="flex-1"
                                                />
                                                <Select
                                                    value={newAdvance.currency}
                                                    onValueChange={(val: any) => setNewAdvance({ ...newAdvance, currency: val })}
                                                >
                                                    <SelectTrigger className="w-24">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="TL">TL</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Not</Label>
                                            <Input
                                                placeholder="Not (Opsiyonel)"
                                                value={newAdvance.note}
                                                onChange={(e) => setNewAdvance({ ...newAdvance, note: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" onClick={handleAddAdvance}>Ekle</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {advanceFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-start">
                                <FormField
                                    control={form.control}
                                    name={`advances.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder="Miktar" type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`advances.${index}.currency`}
                                    render={({ field }) => (
                                        <FormItem className="w-24">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Döviz" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="TL">TL</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`advances.${index}.note`}
                                    render={({ field }) => (
                                        <FormItem className="flex-[2]">
                                            <FormControl><Input placeholder="Not (Opsiyonel)" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeAdvance(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Harcamalar */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Harcamalar</CardTitle>
                            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Ekle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Yeni Harcama Ekle</DialogTitle>
                                        <DialogDescription>Harcama detaylarını giriniz.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Tutar</Label>
                                            <Input
                                                type="number"
                                                placeholder="Miktar"
                                                value={newExpense.amount}
                                                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Döviz</Label>
                                            <Select
                                                value={newExpense.currency}
                                                onValueChange={(val: any) => setNewExpense({ ...newExpense, currency: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="TL">TL</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Açıklama</Label>
                                            <Input
                                                placeholder="Harcama Açıklaması"
                                                value={newExpense.description}
                                                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" onClick={handleAddExpense}>Ekle</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {expenseFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-start">
                                <FormField
                                    control={form.control}
                                    name={`expenses.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder="Miktar" type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`expenses.${index}.currency`}
                                    render={({ field }) => (
                                        <FormItem className="w-24">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Döviz" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="TL">TL</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`expenses.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem className="flex-[2]">
                                            <FormControl><Input placeholder="Harcama Açıklaması" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeExpense(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Notlar */}
                <Card>
                    <CardHeader><CardTitle>Genel Notlar</CardTitle></CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="summaryNotes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Textarea placeholder="Raporla ilgili genel notlar..." className="min-h-[100px]" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rapor Önizleme - Mobile'da üstte, Desktop'ta solda */}
                    <Card className="bg-muted/50 h-full">
                        <CardHeader>
                            <CardTitle>Rapor Önizleme</CardTitle>
                            <CardDescription>Oluşturulacak raporun özeti</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <h4 className="font-semibold mb-1">Şantiye Bilgileri</h4>
                                    <p><span className="text-muted-foreground">Ad Soyad:</span> {form.watch('userName')}</p>
                                    <p><span className="text-muted-foreground">Şantiye:</span> {form.watch('siteName') || '-'}</p>
                                    <p><span className="text-muted-foreground">Tarih:</span> {dateRange?.from ? format(dateRange.from, 'dd.MM.yyyy') : '-'} - {dateRange?.to ? format(dateRange.to, 'dd.MM.yyyy') : '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Mesai Özeti</h4>
                                    <p><span className="text-muted-foreground">Çalışma Günü:</span> {form.watch('totalWorkingDays')} gün</p>
                                    <p><span className="text-muted-foreground">%50 Mesai:</span> {form.watch('extraTime50')} saat</p>
                                    <p><span className="text-muted-foreground">%100 Mesai:</span> {form.watch('extraTime100')} saat</p>
                                    <p><span className="text-muted-foreground">Resmi Tatil:</span> {form.watch('holidayTime100')} saat</p>
                                </div>
                            </div>

                            {(form.watch('advances')?.length > 0) && (
                                <div>
                                    <div className="h-px bg-border my-2" />
                                    <h4 className="font-semibold mb-1">Avanslar</h4>
                                    {form.watch('advances').map((a, i) => (
                                        <div key={i}>{a.amount} {a.currency} {a.note ? `(${a.note})` : ''}</div>
                                    ))}
                                </div>
                            )}

                            {(form.watch('expenses')?.length > 0) && (
                                <div>
                                    <div className="h-px bg-border my-2" />
                                    <h4 className="font-semibold mb-1">Harcamalar</h4>
                                    {form.watch('expenses').map((e, i) => (
                                        <div key={i}>{e.amount} {e.currency} - {e.description}</div>
                                    ))}
                                    <p className="font-bold mt-1">
                                        Toplam: {
                                            (() => {
                                                const totals = form.watch('expenses').reduce((acc, curr) => {
                                                    acc[curr.currency] = (acc[curr.currency] || 0) + curr.amount
                                                    return acc
                                                }, {} as Record<string, number>)
                                                return Object.entries(totals).map(([c, a]) => `${a} ${c}`).join(' + ')
                                            })()
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* İmza - Mobile'da altta, Desktop'ta sağda */}
                    <Card className="h-full bg-muted/20">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>İmza</CardTitle>
                                <Button type="button" variant="outline" onClick={handleExportPDFNew}>
                                    PDF İndir
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {defaultSignature ? (
                                <>
                                    <div className="border rounded-md bg-white p-4 flex items-center justify-center min-h-[150px]">
                                        <img
                                            src={defaultSignature}
                                            alt="Kayıtlı İmza"
                                            className="max-h-[120px] object-contain"
                                        />
                                    </div>
                                    <Link href="/settings">
                                        <Button type="button" variant="outline" className="w-full">
                                            İmzayı Değiştir
                                        </Button>
                                    </Link>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Bu imza otomatik olarak rapora eklenecektir.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="border rounded-md bg-muted p-4 flex items-center justify-center min-h-[150px]">
                                        <p className="text-muted-foreground text-sm text-center">
                                            Henüz kayıtlı imza yok
                                        </p>
                                    </div>
                                    <Link href="/settings">
                                        <Button type="button" variant="default" className="w-full">
                                            İmza Ekle
                                        </Button>
                                    </Link>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Ayarlar sayfasından imzanızı çizebilirsiniz.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                    {isPending ? 'Oluşturuluyor...' : 'Raporu Kaydet'}
                </Button>
            </form>
        </Form>
    )
}
