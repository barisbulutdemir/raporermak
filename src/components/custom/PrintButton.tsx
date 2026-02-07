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
                width: element.scrollWidth,
                height: element.scrollHeight
            })

            // Show no-print elements again
            noPrintElements.forEach(el => (el as HTMLElement).style.display = '')

            // Calculate dimensions for A4
            const imgWidth = 210 // A4 width in mm
            const pageHeight = 297 // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            // Create PDF
            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgData = canvas.toDataURL('image/png')

            // If content is taller than A4, scale it down to fit
            if (imgHeight > pageHeight) {
                const scale = pageHeight / imgHeight
                const scaledWidth = imgWidth * scale
                const scaledHeight = pageHeight - 1 // Subtract 1mm to prevent new page due to rounding
                const xOffset = (imgWidth - scaledWidth) / 2
                pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, scaledHeight)
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            }

            // Download
            pdf.save('servis-raporu.pdf')
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
