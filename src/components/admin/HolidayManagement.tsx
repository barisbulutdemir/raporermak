'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Plus, Pencil, Trash2, CalendarIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner' // Assuming sonner is used based on file list
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar' // shadcn calendar

import { addOfficialHoliday, updateOfficialHoliday, deleteOfficialHoliday } from '@/app/actions/holiday'

// Define type to avoid import issues for now
interface Holiday {
    id: string
    date: Date
    description: string
    isHalfDay: boolean
}

interface HolidayManagementProps {
    initialHolidays: Holiday[]
}

const formSchema = z.object({
    description: z.string().min(2, "Tatil adı en az 2 karakter olmalıdır."),
    date: z.date({ message: "Tarih seçilmelidir." }),
    isHalfDay: z.boolean().default(false).optional(),
})

export function HolidayManagement({ initialHolidays }: HolidayManagementProps) {
    // Sort initially by date desc
    const [holidays, setHolidays] = useState<Holiday[]>(
        [...initialHolidays].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    )
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // --- ADD FORM ---
    const addForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            isHalfDay: false,
        },
    })

    const onAddSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const result = await addOfficialHoliday(values)
            if (result.success) {
                toast.success("Tatil eklendi")
                setIsAddOpen(false)
                addForm.reset()
                // Optimistic update or wait for server revalidation?
                // For simplicity, we trust revalidatePath but let's also close dialog.
                // Since this is a client state derived from props, we might not see update immediately 
                // unless we refresh or router.refresh(). 
                // Ideally we should use router.refresh() 
            } else {
                toast.error(result.error || "Hata oluştu")
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        }
    }

    // --- EDIT FORM ---
    const editForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            isHalfDay: false,
        },
    })

    // Populate edit form when editing starts
    const startEdit = (holiday: Holiday) => {
        setEditingHoliday(holiday)
        editForm.reset({
            description: holiday.description,
            date: new Date(holiday.date),
            isHalfDay: holiday.isHalfDay,
        })
    }

    const onEditSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!editingHoliday) return

        try {
            const result = await updateOfficialHoliday(editingHoliday.id, values)
            if (result.success) {
                toast.success("Tatil güncellendi")
                setEditingHoliday(null)
            } else {
                toast.error(result.error || "Hata oluştu")
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        }
    }

    // --- DELETE ---
    const handleDelete = async () => {
        if (!deletingId) return
        try {
            const result = await deleteOfficialHoliday(deletingId)
            if (result.success) {
                toast.success("Tatil silindi")
                setDeletingId(null)
            } else {
                toast.error(result.error || "Hata oluştu")
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold">Resmi Tatil Listesi</h2>
                    <p className="text-sm text-muted-foreground">Toplam {initialHolidays.length} kayıt bulundu.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Tatil Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yeni Resmi Tatil Ekle</DialogTitle>
                            <DialogDescription>
                                Takvime işlenecek resmi tatili giriniz.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...addForm}>
                            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                                <FormField
                                    control={addForm.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Tarih</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "d MMMM yyyy", { locale: tr })
                                                            ) : (
                                                                <span>Tarih seçiniz</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < new Date("1900-01-01")}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tatil Adı (Kısa)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Örn: 19 Mayıs" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                PDF'e sığması için kısa isim tercih ediniz (Örn: "Kurban B." veya "1 Mayıs").
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addForm.control}
                                    name="isHalfDay"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Yarım Gün Tatil
                                                </FormLabel>
                                                <DialogDescription>
                                                    Arefe günleri gibi yarım gün tatilleri işaretleyiniz.
                                                </DialogDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Kaydet</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Gün</TableHead>
                            <TableHead>Tatil Adı</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialHolidays && initialHolidays.length > 0 ? (
                            initialHolidays.map((holiday) => (
                                <TableRow key={holiday.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(holiday.date), "dd.MM.yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(holiday.date), "EEEE", { locale: tr })}
                                    </TableCell>
                                    <TableCell>{holiday.description}</TableCell>
                                    <TableCell>
                                        {holiday.isHalfDay ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                Yarım Gün
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Tam Gün
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(holiday)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingId(holiday.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Henüz kayıtlı tatil yok.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={!!editingHoliday} onOpenChange={(open) => !open && setEditingHoliday(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tatil Düzenle</DialogTitle>
                    </DialogHeader>
                    {editingHoliday && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                    control={editForm.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Tarih</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "d MMMM yyyy", { locale: tr })
                                                            ) : (
                                                                <span>Tarih seçiniz</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < new Date("1900-01-01")}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tatil Adı (Kısa)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="isHalfDay"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Yarım Gün
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Güncelle</Button>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRM DIALOG */}
            <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Emin misiniz?</DialogTitle>
                        <DialogDescription>
                            Bu resmi tatil kaydı kalıcı olarak silinecektir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingId(null)}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete}>Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
