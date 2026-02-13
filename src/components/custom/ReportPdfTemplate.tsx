import React from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { isSameDay, eachDayOfInterval } from 'date-fns'

interface ReportPdfTemplateProps {
    data: any
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
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '20mm', // Standard padding
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12pt',
                lineHeight: '1.5',
                position: 'relative' // Ensure containment
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                * {
                    box-sizing: border-box;
                    border-color: #000000 !important;
                }
            `}} />

            {/* Header - Flexbox Layout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', width: '100%' }}>
                {/* Name */}
                <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '12pt', width: '30%' }}>
                    {data.userName}
                </div>

                {/* Site Name */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16pt', width: '40%' }}>
                    {data.siteName} Servis Raporu
                </div>

                {/* Date */}
                <div style={{ textAlign: 'right', fontSize: '12pt', width: '30%' }}>
                    {format(new Date(), 'dd.MM.yyyy')}
                </div>
            </div>

            {/* Body Content - Flex Grow to push footer down */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Advances */}
                {advancesText && (
                    <div style={{ fontSize: '12pt' }}>
                        <span style={{ fontWeight: 'bold' }}>Avans: </span>
                        <span>{advancesText}</span>
                    </div>
                )}

                {/* Expenses */}
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
                        {/* Calculate and display totals */}
                        <div style={{ fontWeight: 'bold', marginTop: '5px', paddingLeft: '10px', fontSize: '12pt' }}>
                            Toplam: {
                                (() => {
                                    const totals = data.expenses.reduce((acc: any, curr: any) => {
                                        acc[curr.currency] = (acc[curr.currency] || 0) + (Number(curr.amount) || 0)
                                        return acc
                                    }, {} as Record<string, number>)
                                    return Object.entries(totals).map(([c, a]) => `${a} ${c}`).join(' + ')
                                })()
                            }
                        </div>
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

                {/* Summary Stats Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '15px', fontSize: '11pt', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 0' }}>
                    {data.totalWorkingDays > 0 && (
                        <div><span style={{ fontWeight: 'bold' }}>Toplam Çalışma:</span> {data.totalWorkingDays} gün</div>
                    )}
                    {data.extraTime50 > 0 && (
                        <div><span style={{ fontWeight: 'bold' }}>Toplam Cumartesi:</span> {data.extraTime50} saat</div>
                    )}
                    {data.extraTime100 > 0 && (
                        <div><span style={{ fontWeight: 'bold' }}>Toplam Pazar:</span> {data.extraTime100} saat</div>
                    )}
                    {data.holidayTime100 > 0 && (
                        <div><span style={{ fontWeight: 'bold' }}>Toplam Resmi Tatil:</span> {data.holidayTime100} saat</div>
                    )}
                </div>

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


            {/* Footer - Use marginTop auto to push to bottom */}
            <div style={{ marginTop: 'auto', alignSelf: 'flex-end', textAlign: 'center', width: '150px' }}>
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
