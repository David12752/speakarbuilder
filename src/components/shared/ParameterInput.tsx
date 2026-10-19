import React, { type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from './InfoTooltip'

interface ParameterInputProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string
    label: string
    unit?: string
    tooltip?: string
    value: number
    onChangeValue: (val: number) => void
    min?: number
    max?: number
    step?: number
}

export function ParameterInput({
    id,
    label,
    unit,
    tooltip,
    value,
    onChangeValue,
    className,
    ...props
}: ParameterInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        if (!isNaN(val)) {
            onChangeValue(val)
        }
    }

    return (
        <div className={`space-y-1 ${className || ''}`}>
            <div className="flex items-center gap-1.5 mb-1">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                {tooltip && <InfoTooltip content={tooltip} />}
            </div>
            <div className="relative flex items-center">
                <Input
                    id={id}
                    type="number"
                    value={value}
                    onChange={handleChange}
                    className="font-mono text-left bg-input/50 border-border focus:ring-primary pl-[2.5rem] ltr"
                    lang="en" // Keep numbers LTR even in RTL layout
                    dir="ltr"
                    {...props}
                />
                {unit && (
                    <span className="absolute left-3 text-muted-foreground text-xs font-sans pointer-events-none select-none">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    )
}
