import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const steps = [
    { path: '/step/1', title: 'הגדרת פרויקט' },
    { path: '/step/2', title: 'בחירת דרייברים' },
    { path: '/step/3', title: 'תכנון ארגז' },
    { path: '/step/4', title: 'תכנון קרוסאובר' },
    { path: '/step/5', title: 'תגובת תדר' },
    { path: '/step/6', title: 'מידות פיזיות' },
    { path: '/step/7', title: 'חישוב הספקים' },
    { path: '/step/8', title: 'אקוסטיקה' },
    { path: '/step/9', title: 'רשימת רכיבים' },
    { path: '/step/10', title: 'תוכניות חיתוך' },
    { path: '/step/11', title: 'הוראות הרכבה' },
    { path: '/step/12', title: 'סיכום וייצוא' },
]

export function WizardLayout() {
    const navigate = useNavigate()
    const location = useLocation()

    const currentIndex = steps.findIndex((step) => step.path === location.pathname)
    const isFirstStep = currentIndex === 0
    const isLastStep = currentIndex === steps.length - 1

    const handleNext = () => {
        if (!isLastStep) {
            navigate(steps[currentIndex + 1].path)
        }
    }

    const handlePrev = () => {
        if (!isFirstStep) {
            navigate(steps[currentIndex - 1].path)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-background text-foreground font-sans dark" dir="rtl">
            {/* Header */}
            <header className="w-full border-b border-border bg-card p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
                        SB
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">SpeakarBuilder</h1>
                </div>
                <div className="flex gap-2">
                    {steps.map((step, idx) => (
                        <div
                            key={step.path}
                            className={`w-3 h-3 rounded-full transition-colors ${idx <= currentIndex ? 'bg-primary' : 'bg-muted'
                                }`}
                            title={step.title}
                        />
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">{steps[currentIndex]?.title || '...'}</h2>
                    <div className="text-muted-foreground font-mono text-sm">
                        שלב {currentIndex + 1} מתוך 12
                    </div>
                </div>

                <div className="flex-1 bg-card border border-border rounded-lg shadow-sm p-6 overflow-auto">
                    <Outlet />
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="w-full border-t border-border bg-card p-4 flex justify-between items-center mt-auto">
                <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={isFirstStep}
                    className="gap-2"
                >
                    <ArrowRight className="w-4 h-4" /> הקודם
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isLastStep || currentIndex === -1}
                    className="gap-2"
                >
                    הבא <ArrowLeft className="w-4 h-4" />
                </Button>
            </footer>
        </div>
    )
}
