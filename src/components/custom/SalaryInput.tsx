'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateSalary } from "@/app/actions/user"
import { Check, X } from "lucide-react"

export function SalaryInput({ initialSalary }: { initialSalary: number | null }) {
    const [salary, setSalary] = useState(initialSalary?.toString() || "")
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
        const salaryValue = parseFloat(salary)
        if (isNaN(salaryValue) || salaryValue < 0) {
            toast.error("Geçerli bir maaş giriniz")
            return
        }

        setIsLoading(true)
        try {
            const result = await updateSalary(salaryValue)
            if (result.success) {
                toast.success("Maaş bilgisi güncellendi")
                setIsEditing(false)
            } else {
                toast.error(result.error || "Güncelleme başarısız")
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setIsLoading(false)
        }
    }

    if (!isEditing) {
        return (
            <div className="flex items-center gap-2">
                <div className="p-3 border rounded-md bg-muted text-sm flex-1">
                    {initialSalary ? `${initialSalary.toLocaleString('tr-TR')} TL` : "Belirtilmemiş"}
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Düzenle
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="Aylık Maaş (TL)"
                    disabled={isLoading}
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">TL</span>
            </div>
            <Button size="icon" onClick={handleSave} disabled={isLoading}>
                <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}
