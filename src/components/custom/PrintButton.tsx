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
                width: element.offsetWidth,
                height: element.offsetHeight,
                windowWidth: element.scrollWidth, // Prevent responsive layout shifts
                windowHeight: element.scrollHeight
            })

            // Show no-print elements again
            noPrintElements.forEach(el => (el as HTMLElement).style.display = '')

            // Calculate dimensions for A4
            const imgWidth = 210 // A4 width in mm
            const pageHeight = 297 // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            console.log('imgHeight', imgHeight)

            // Create PDF
            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgData = canvas.toDataURL('image/png')

            // STRICT SCALING: Always fit to page with margin
            const MAX_HEIGHT = 285 // Leave ~12mm margin at bottom

            if (imgHeight > MAX_HEIGHT) {
                const scale = MAX_HEIGHT / imgHeight
                const scaledWidth = imgWidth * scale
                const scaledHeight = MAX_HEIGHT
                const xOffset = (imgWidth - scaledWidth) / 2
                pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, scaledHeight)
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            }

            // SAFETY: Delete extra pages if any (just in case)
            while (pdf.getNumberOfPages() > 1) {
                pdf.deletePage(2)
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
