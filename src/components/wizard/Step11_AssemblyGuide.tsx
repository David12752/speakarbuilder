import { Card, CardContent } from '@/components/ui/card'
import { useProjectStore } from '@/store/projectStore'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Wrench, Package, Zap, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'

interface AssemblyStep {
    id: number
    title: string
    description: string
    tools: string[]
    tips: string[]
    icon: React.ReactNode
    category: string
}

export function Step11_AssemblyGuide() {
    const { settings } = useProjectStore()
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

    const toggleStep = (id: number) => {
        setCompletedSteps(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const driverCount = settings.drivers.length
    const isSubwoofer = settings.speakerType === 'subwoofer'

    const assemblySteps: AssemblyStep[] = [
        {
            id: 1,
            category: 'הכנה',
            title: 'חיתוך לוחות MDF',
            description: 'חתכו את כל חלקי הארגז לפי רשימת החיתוכים בשלב 10. השתמשו במסור שולחני או מסור מסילה לחיתוך מדויק. ודאו שכל החלקים חתוכים בניצב מושלם (90°).',
            tools: ['מסור שולחני / מסילה', 'סרגל מדידה', 'סרגל זווית 90°', 'קלמפים'],
            tips: ['חתכו את החלק הגדול ביותר ראשון', 'מדדו פעמיים, חתכו פעם אחת', 'סמנו את כל החלקים בעיפרון'],
            icon: <Package className="w-5 h-5" />
        },
        {
            id: 2,
            category: 'הכנה',
            title: 'קידוח חורים לדרייברים',
            description: `קדחו חורים עגולים עבור ${driverCount} דרייברים בפאנל הקדמי (באפל). השתמשו ב-Router עם מסלול מעגלי או מקדחה + Jigsaw. חברו את השבלונה לפני הקידוח.`,
            tools: ['Router + מסלול מעגלי', 'או Jigsaw', 'מקדח 10מ"מ (חור התחלה)', 'מברגה + ביטים'],
            tips: ['סמנו את מרכז הדרייבר בדיוק', 'קדחו מצד הפנים של הבאפל כדי למנוע שבבים בחזית', 'השאירו מרווח 2-3מ"מ מהקצה'],
            icon: <Wrench className="w-5 h-5" />
        },
        {
            id: 3,
            category: 'הכנה',
            title: 'קידוח חור למחבר רמקול (Terminal)',
            description: 'קדחו חור מלבני או עגול בפאנל האחורי עבור מחבר הרמקול (Binding Post plate). מיקום מומלץ: שליש תחתון של הפאנל.',
            tools: ['Jigsaw', 'מקדח 10מ"מ (חור התחלה)', 'פצירה'],
            tips: ['וודאו שהחור מתאים בדיוק למחבר', 'הדביקו אטם גומי סביב המחבר'],
            icon: <Zap className="w-5 h-5" />
        },
        {
            id: 4,
            category: 'הרכבה',
            title: 'הרכבת שלד הארגז (ללא פאנל קדמי)',
            description: 'הדביקו 5 מתוך 6 צדדים עם דבק PVA. השאירו את הפאנל הקדמי (באפל) פתוח לצורך התקנת חיזוקים וריסון. השתמשו בקלמפים ואפשרו לדבק להתייבש 24 שעות.',
            tools: ['דבק עץ PVA (Titebond II/III)', 'קלמפים (לפחות 4)', 'סרגל זווית', 'מטלית לחה'],
            tips: ['מרחו דבק על שני המשטחים', 'נקו עודפי דבק מיד', 'ודאו ריבוע בכל הפינות', 'אל תחסכו בקלמפים'],
            icon: <Package className="w-5 h-5" />
        },
        {
            id: 5,
            category: 'הרכבה',
            title: 'התקנת חיזוקים (Bracing)',
            description: 'הדביקו את החיזוקים הפנימיים לפי ההמלצות משלב 6. חיזוקים מונעים תהודות של הדפנות ומשפרים משמעותית את איכות הבאס.',
            tools: ['דבק PVA', 'קלמפים', 'מסור (לחיתוך חיזוקים)'],
            tips: ['חיזוקי מדף (shelf): הדביקו אופקית באמצע הגובה', 'חיזוקי חלון (window): עדיפים ממדף כי הם מאפשרים זרימת אוויר', 'חכו 24 שעות לייבוש'],
            icon: <Wrench className="w-5 h-5" />
        },
        {
            id: 6,
            category: 'הרכבה',
            title: 'התקנת חומר ריסון (Damping)',
            description: 'מלאו את הארגז בחומר ריסון לפי הכמות שחושבה בשלב 6. חומר הריסון מפחית גלים עומדים פנימיים ומשפר את תגובת הבאס.',
            tools: ['חומר ריסון (Polyfill / צמר גפן אקוסטי)', 'מספריים', 'דבק חם (לעיגון)'],
            tips: ['אל תדחסו — מילוי אוורירי 50-70%', 'אל תחסמו את פתח הפורט (אם קיים)', 'עגנו עם דבק חם כדי שלא יגע בדרייבר'],
            icon: <Volume2 className="w-5 h-5" />
        },
        {
            id: 7,
            category: 'חשמל',
            title: 'הלחמת קרוסאובר',
            description: 'הלחימו את רכיבי הקרוסאובר על לוח מעגלים או טרמינל בלוק לפי תרשים הרכיבים משלב 4. חברו את הכבלים לפי סדר: מחבר רמקול → קרוסאובר → דרייברים.',
            tools: ['מלחם 40-60W', 'בדיל הלחמה (60/40 או lead-free)', 'חוטי חיבור 16AWG', 'Binding post / טרמינל בלוק', 'מולטימטר'],
            tips: ['שימרו על קוטביות נכונה (+ ו-)', 'הלחמה נקייה ומבריקה = חיבור טוב', 'בדקו עם מולטימטר שאין קצר', 'הרכיבו את הקרוסאובר על לוח נפרד ולא בתוך הארגז ישירות'],
            icon: <Zap className="w-5 h-5" />
        },
        {
            id: 8,
            category: 'חשמל',
            title: 'חיבור כבלים פנימיים',
            description: 'חברו כבלי רמקול OFC מהקרוסאובר לכל דרייבר. השתמשו בחוטים עבים (16AWG מינימום) וודאו חיבור מכני חזק + הלחמה.',
            tools: ['כבל רמקול OFC 16AWG', 'מלחם', 'טרמינלים מלחצניים', 'מולטימטר'],
            tips: ['סמנו + ו- בצבעים שונים', 'השאירו מספיק אורך כבל למניעת מתח', 'עגנו כבלים בתוך הארגז כדי שלא ירעשו'],
            icon: <Zap className="w-5 h-5" />
        },
        {
            id: 9,
            category: 'סגירה',
            title: 'התקנת דרייברים',
            description: `הרכיבו ${driverCount} דרייברים בפתחים שנקדחו. הדביקו אטם גומי (foam tape) סביב כל דרייבר לפני ההברגה. ברגו עם T-nuts מאחור לחיבור אמין.`,
            tools: ['ברגי M4/M5 + T-nuts', 'מברגה', 'אטם גומי (closed-cell foam)', 'מפתח אלן (אם נדרש)'],
            tips: ['ברגו באופן צולב (X pattern) — לא לפי סדר מעגלי', 'אל תהדקו יתר על המידה', 'ודאו שהאטם שוכב שטוח ואחיד'],
            icon: <Volume2 className="w-5 h-5" />
        },
        {
            id: 10,
            category: 'סגירה',
            title: 'סגירת הפאנל הקדמי (באפל)',
            description: 'הדביקו את הבאפל לשלד הארגז עם דבק PVA + ברגים. וודאו אטימות מלאה — כל רווח יגרום לדליפת אוויר וירידה בביצועי הבאס.',
            tools: ['דבק PVA', 'ברגים 3.5×30', 'קלמפים', 'סיליקון אקוסטי (לפינות)'],
            tips: ['מרחו סיליקון בפינות הפנימיות לאטימות', 'בדקו אטימות: כם שהארגז סגור, לחצו על הקונוס — הוא צריך לחזור לאט (סימן לאטימות)'],
            icon: <Package className="w-5 h-5" />
        },
        {
            id: 11,
            category: 'בדיקות',
            title: 'בדיקה ראשונית (Smoke Test)',
            description: 'חברו את הרמקול למגבר בעוצמה נמוכה וודאו: אין רעשים חריגים, כל הדרייברים פועלים, הקוטביות נכונה (קונוס נע החוצה בפולס חיובי).',
            tools: ['מגבר / ממשק שמע', 'כבל רמקול', 'סוללת AA (לבדיקת קוטביות)'],
            tips: ['התחילו בעוצמה מאוד נמוכה!', 'השמיעו רעש ורוד לבדיקת כל התדרים', 'בדיקת קוטביות עם סוללה: + לגב, קונוס נע החוצה = נכון'],
            icon: <Volume2 className="w-5 h-5" />
        },
        {
            id: 12,
            category: 'גימור',
            title: 'גימור חיצוני',
            description: `${isSubwoofer ? 'צבעו או ציפו את הסאבוופר' : 'צבעו או ציפו את זוג הרמקולים'} בחומר גימור. אופציות: צבע לכה, ויניל דביק, פורניר עץ, או Tolex.`,
            tools: ['נייר זכוכית (120, 220, 400 גריט)', 'פריימר + צבע / ויניל', 'רולר / מכחול', 'פינות גומי (אופציונלי)'],
            tips: ['מליטו עם P120 ← P220 ← P400', 'פריימר חשוב — אל תדלגו', 'ויניל דביק = הכי קל ומהיר'],
            icon: <Package className="w-5 h-5" />
        }
    ]

    const progress = (completedSteps.size / assemblySteps.length) * 100
    const categories = [...new Set(assemblySteps.map(s => s.category))]

    return (
        <AnimatedStep>
            <StepHeader title="מדריך הרכבה" subtitle={`${assemblySteps.length} שלבים | ${completedSteps.size} הושלמו`} icon={<Wrench className="w-5 h-5" />} />

            {/* Progress Stats + Bar */}
            <div className="shrink-0 space-y-1.5">
                <div className="grid grid-cols-4 gap-2">
                    <GlowStat label="הושלמו" value={completedSteps.size} unit={`/ ${assemblySteps.length}`} color="emerald" />
                    <GlowStat label="התקדמות" value={`${Math.round(progress)}%`} color="cyan" />
                    <GlowStat label="קטגוריות" value={categories.length} color="amber" />
                    <GlowStat label="סטטוס" value={progress === 100 ? '✓ הושלם' : 'בתהליך'} color={progress === 100 ? 'emerald' : 'rose'} />
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            <StepBody>

            {categories.map(category => (
                <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 text-emerald-400/80">{category}</h3>
                    <div className="space-y-3">
                        {assemblySteps.filter(s => s.category === category).map((step, i) => {
                            const isCompleted = completedSteps.has(step.id)
                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className={`border-border/50 bg-card/80 backdrop-blur-sm transition-all cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/30' : ''}`}
                                        onClick={() => toggleStep(step.id)}>
                                        <CardContent className="p-4">
                                            <div className="flex gap-4">
                                                <div className="flex-shrink-0 mt-1">
                                                    {isCompleted
                                                        ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                                        : <Circle className="w-6 h-6 text-muted-foreground" />
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {step.icon}
                                                        <h4 className={`font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                                            שלב {step.id}: {step.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <span className="font-semibold text-foreground/70">🔧 כלים נדרשים:</span>
                                                            <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                                                {step.tools.map((tool, ti) => (
                                                                    <li key={ti}>• {tool}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-foreground/70">💡 טיפים:</span>
                                                            <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                                                {step.tips.map((tip, ti) => (
                                                                    <li key={ti}>• {tip}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            ))}

            {progress === 100 && (
                <div className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl">
                    <h3 className="text-lg font-bold text-emerald-400 mb-1">🎉 כל הכבוד!</h3>
                    <p className="text-xs text-muted-foreground">ההרכבה הושלמה. עברו לשלב הבא לייצוא סיכום הפרויקט.</p>
                </div>
            )}
            </StepBody>
        </AnimatedStep>
    )
}
