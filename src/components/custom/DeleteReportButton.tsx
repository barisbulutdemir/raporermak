"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteReport } from "@/app/actions/report"
import { toast } from "sonner"

interface DeleteReportButtonProps {
    reportId: string
}

export function DeleteReportButton({ reportId }: DeleteReportButtonProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteReport(reportId)
            if (result.success) {
                toast.success("Rapor silindi.")
                router.push('/reports')
            } else {
                toast.error(result.message || "Silme işlemi başarısız oldu.")
                setIsDeleting(false)
            }
        } catch (error) {
            toast.error("Bir hata oluştu.")
            setIsDeleting(false)
        }
    }

    const [open, setOpen] = useState(false)

    // ... handleDelete implementation ...

    return (
        <>
            <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => setOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Raporu Sil
            </Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu rapor kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
