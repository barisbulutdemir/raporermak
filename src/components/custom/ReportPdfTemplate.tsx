import React from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { isSameDay, eachDayOfInterval } from 'date-fns'

// Helper function definitions (duplicated here or imported if available in a utils file)
// For simplicity and isolation, we'll keep them self-contained or import if they are simple pure functions.
// Ideally, the 'data' prop should contain everything pre-formatted to avoid logic duplication.

interface ReportPdfTemplateProps {
    data: any // using any for now to match the form structure, can be typed strictly later
    specialDaysData?: {
        dateStr: string
        dayName: string
        hours: string
        isHoliday: boolean
    }[]
    signatureDataUrl?: string
}

export const ReportPdfTemplate: React.FC<ReportPdfTemplateProps> = ({ data, specialDaysData = [], signatureDataUrl }) => {

    // Helper to format currency aggregations
    const getFormattedAdvances = () => {
        const advances = data.advances || []
        if (advances.length === 0) return null

        const totals: Record<string, number> = {}
        advances.forEach((a: any) => {
            totals[a.currency] = (totals[a.currency] || 0) + (Number(a.amount) || 0)
        })
        return Object.entries(totals)
            .map(([curr, amt]) => `${amt} ${curr}`)
            .join(' + ')
    }

    const advancesText = getFormattedAdvances()

    return (
        <div
            id="pdf-template-root"
            style={{
                width: '210mm',
                minHeight: '297mm',
                position: 'relative',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '20mm',
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12pt',
                lineHeight: '1.5'
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                * {
                    box-sizing: border-box;
                    border-color: #000000 !important;
                }
            `}} />

            {/* Header - Absolute Positioning for Name/Date to move them into margins */}
            <div style={{ position: 'relative', height: '40px', marginBottom: '30px' }}>
                {/* Name - Top Left (into margin) */}
                <div style={{ position: 'absolute', top: '-15mm', left: '-10mm', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>{data.userName}</div>
                </div>

                {/* Site Name - Center (Flow) */}
                <div style={{ width: '100%', textAlign: 'center', paddingTop: '0px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16pt' }}>{data.siteName}</div>
                </div>

                {/* Date - Top Right (into margin) */}
                <div style={{ position: 'absolute', top: '-15mm', right: '-10mm', textAlign: 'right' }}>
                    <div style={{ fontSize: '12pt' }}>{format(new Date(), 'dd.MM.yyyy')}</div>
                </div>
            </div>

            {/* Body Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Advances */}
                {advancesText && (
                    <div style={{ fontSize: '12pt' }}>
                        <span style={{ fontWeight: 'bold' }}>Avans: </span>
                        <span>{advancesText}</span>
                    </div>
                )}

                {/* Expenses */}
                {data.expenses && data.expenses.length > 0 && (
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '5px' }}>Harcamalar:</div>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                            {data.expenses.map((exp: any, index: number) => (
                                <li key={index} style={{ marginBottom: '3px', paddingLeft: '10px', fontSize: '12pt' }}>
                                    {exp.amount} {exp.currency} - {exp.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Notes */}
                {data.summaryNotes && (
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '5px' }}>Notlar:</div>
                        <div style={{ whiteSpace: 'pre-wrap', paddingLeft: '10px', fontSize: '12pt' }}>{data.summaryNotes}</div>
                    </div>
                )}

                {/* Dates */}
                {/* We assume data.dateRange is valid per prop types but optional chaining is safe */}
                {data.dateRange?.from && data.dateRange?.to && (
                    <div style={{ marginTop: '10px', fontSize: '12pt' }}>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold' }}>Gidiş Tarihi: </span>
                            <span>{format(new Date(data.dateRange.from), 'dd.MM.yyyy')}</span>
                            {(() => {
                                const departureDate = format(new Date(data.dateRange.from), 'yyyy-MM-dd')
                                const isExcluded = data.excludedDates?.some(
                                    (d: any) => format(new Date(d), 'yyyy-MM-dd') === departureDate
                                )
                                return (
                                    <span style={{ marginLeft: '8px', fontSize: '11pt', fontStyle: 'italic' }}>
                                        {isExcluded ? '(çalışılmadı)' : '(çalışıldı)'}
                                    </span>
                                )
                            })()}
                        </div>
                        <div>
                            <span style={{ fontWeight: 'bold' }}>Dönüş Tarihi: </span>
                            <span>{format(new Date(data.dateRange.to), 'dd.MM.yyyy')}</span>
                            {(() => {
                                const returnDate = format(new Date(data.dateRange.to), 'yyyy-MM-dd')
                                const isExcluded = data.excludedDates?.some(
                                    (d: any) => format(new Date(d), 'yyyy-MM-dd') === returnDate
                                )
                                return (
                                    <span style={{ marginLeft: '8px', fontSize: '11pt', fontStyle: 'italic' }}>
                                        {isExcluded ? '(çalışılmadı)' : '(çalışıldı)'}
                                    </span>
                                )
                            })()}
                        </div>
                    </div>
                )}

                {/* Overtime Grid */}
                {specialDaysData.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', display: 'inline-block' }}>
                            Mesailer
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 40px', fontSize: '12pt' }}>
                            {specialDaysData.map((day, idx) => {
                                return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '6px' }}>
                                        <span>{day.dateStr} - <span style={{ textTransform: day.isHoliday ? 'none' : 'capitalize' }}>{day.dayName}</span></span>
                                        <span style={{ fontWeight: 'bold' }}>{day.hours}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>


            {/* Footer - Signature (Bottom Right) */}
            <div style={{ position: 'absolute', bottom: '20mm', right: '20mm', textAlign: 'center', width: '150px' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '8px', paddingBottom: '5px' }}>
                    {signatureDataUrl ? (
                        <img src={signatureDataUrl} alt="İmza" style={{ maxHeight: '70px', maxWidth: '100%' }} />
                    ) : (
                        <span style={{ color: '#ccc' }}>İmza Yok</span>
                    )}
                </div>
                <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{data.userName}</div>
            </div>
        </div >
    )
}
