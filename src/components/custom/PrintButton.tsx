'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export function PrintButton() {
    const handleDownloadPDF = async () => {
        const element = document.querySelector('.print-container') as HTMLElement
        if (!element) return

        try {
            // Hide no-print elements
            const noPrintElements = document.querySelectorAll('.no-print')
            noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none')

            // Capture the element as canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff', // Force white background
                // CRITICAL FIX: Force the CAPTURE height to be exactly one page
                // We use onclone to modify the element before screenshot
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('.print-container') as HTMLElement
                    if (clonedElement) {
                        // Hard limit height to 275mm (slightly less than A4 297mm)
                        // This physically cuts off anything that would cause a 2nd page
                        clonedElement.style.height = '275mm'
                        clonedElement.style.maxHeight = '275mm'
                        clonedElement.style.overflow = 'hidden'
                        clonedElement.style.margin = '0'
                        clonedElement.style.padding = '20px' // Ensure padding is consistent
                    }
                }
            })

            // Show no-print elements again
            noPrintElements.forEach(el => (el as HTMLElement).style.display = '')

            // Calculate dimensions
            const PAGE_WIDTH = 210 // A4 width in mm
            const PAGE_HEIGHT = 297 // A4 height in mm
            const MARGIN = 0 // No margin needed since we handle it in capture

            const imgWidth = 210
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            // Create PDF (Standard A4)
            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgData = canvas.toDataURL('image/png')

            // Add image fitting the page
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

            // SAFETY: Delete extra pages if any (just in case)
            while (pdf.getNumberOfPages() > 1) {
                pdf.deletePage(2)
            }

            // Download with timestamp to prevent caching
            pdf.save(`servis-raporu-${Date.now()}.pdf`)
        } catch (error) {
            console.error('PDF oluşturma hatası:', error)
            alert('PDF oluşturulurken bir hata oluştu')
        }
    }

    return (
        <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" /> PDF İndir
        </Button>
    )
}
