import React from 'react'
import { Info } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface InfoTooltipProps {
    content: string | React.ReactNode
}

export function InfoTooltip({ content }: InfoTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-primary transition-colors cursor-help inline-flex items-center justify-center p-1 font-sans">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">מידע נוסף</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" dir="rtl" className="max-w-[250px] text-sm bg-popover text-popover-foreground border-border break-words font-sans">
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
