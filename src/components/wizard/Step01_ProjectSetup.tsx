import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { AnimatedStep, StepHeader, StepBody, SectionHeader } from '@/components/shared/StepWrapper'
import { Settings, Speaker, Ruler } from 'lucide-react'

export function Step01_ProjectSetup() {
    const { settings, updateSettings } = useProjectStore()

    return (
        <AnimatedStep>
            <StepHeader title="הגדרת פרויקט" subtitle="סוג, קונפיגורציה וחדר" icon={<Settings className="w-3.5 h-3.5" />} />

            <StepBody className="space-y-3">
                {/* Project details */}
                <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-3 space-y-3">
                        <SectionHeader title="פרטי פרויקט" subtitle="שם, סוג וקונפיגורציה" icon={<Settings className="w-4 h-4" />} />
                        <div className="space-y-1.5">
                            <Label htmlFor="projectName" className="text-xs">שם הפרויקט</Label>
                            <Input
                                id="projectName"
                                placeholder="למשל: סטודיו מוניטור 8 אינץ'"
                                value={settings.name}
                                onChange={(e) => updateSettings({ name: e.target.value })}
                                className="bg-background/50 h-8 text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">סוג הרמקול</Label>
                                <Select value={settings.speakerType} onValueChange={(val: any) => updateSettings({ speakerType: val })} dir="rtl">
                                    <SelectTrigger className="bg-background/50 h-8 text-xs"><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="studio_monitor">מוניטור אולפני</SelectItem>
                                        <SelectItem value="home_hifi">רמקול האזנה ביתי</SelectItem>
                                        <SelectItem value="subwoofer">סאב-וופר</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">קונפיגורציה</Label>
                                <Select value={settings.configuration} onValueChange={(val: any) => updateSettings({ configuration: val })} dir="rtl">
                                    <SelectTrigger className="bg-background/50 h-8 text-xs"><SelectValue placeholder="בחר קונפיגורציה" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2_way">2-Way</SelectItem>
                                        <SelectItem value="3_way">3-Way</SelectItem>
                                        <SelectItem value="full_range_sub">Full Range + Sub</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">ייעוד עיקרי</Label>
                                <Select value={settings.mainUse} onValueChange={(val: any) => updateSettings({ mainUse: val })} dir="rtl">
                                    <SelectTrigger className="bg-background/50 h-8 text-xs"><SelectValue placeholder="בחר ייעוד" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mix_mastering">מיקס ומאסטרינג</SelectItem>
                                        <SelectItem value="production">הפקה מוזיקלית</SelectItem>
                                        <SelectItem value="casual_listening">האזנה פנאי</SelectItem>
                                        <SelectItem value="home_theater">קולנוע ביתי</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Room Dimensions */}
                <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-3 space-y-3">
                        <SectionHeader title="מידות חדר ומרחק האזנה" subtitle="לחישוב SPL ומודים" icon={<Ruler className="w-4 h-4" />} />
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">אורך (מ׳)</Label>
                                <Input type="number" step={0.1} min={1} max={30}
                                    value={settings.roomLength}
                                    onChange={(e) => updateSettings({ roomLength: parseFloat(e.target.value) || 4 })}
                                    className="font-mono bg-background/50 h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">רוחב (מ׳)</Label>
                                <Input type="number" step={0.1} min={1} max={30}
                                    value={settings.roomWidth}
                                    onChange={(e) => updateSettings({ roomWidth: parseFloat(e.target.value) || 3 })}
                                    className="font-mono bg-background/50 h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">גובה (מ׳)</Label>
                                <Input type="number" step={0.1} min={2} max={10}
                                    value={settings.roomHeight}
                                    onChange={(e) => updateSettings({ roomHeight: parseFloat(e.target.value) || 2.7 })}
                                    className="font-mono bg-background/50 h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">מרחק האזנה (מ׳)</Label>
                                <Input type="number" step={0.1} min={0.3} max={10}
                                    value={settings.listeningDistance}
                                    onChange={(e) => updateSettings({ listeningDistance: parseFloat(e.target.value) || 1.5 })}
                                    className="font-mono bg-background/50 h-8 text-sm" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-3">
                        <SectionHeader title="המלצות מערכת" subtitle="על סמך פרופיל הפרויקט" icon={<Speaker className="w-4 h-4" />} />
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-background/40 border border-border/50 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground">טווח תדרים מומלץ</p>
                                <p className="font-mono text-sm font-semibold">40Hz – 20kHz</p>
                            </div>
                            <div className="rounded-md bg-background/40 border border-border/50 px-3 py-2">
                                <p className="text-[10px] text-muted-foreground">SPL בנקודת האזנה</p>
                                <p className="font-mono text-sm font-semibold">~85dB רציף</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </StepBody>
        </AnimatedStep>
    )
}
