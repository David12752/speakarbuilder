import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/layout/AppLayout'

function App() {
  return (
    <TooltipProvider>
      <AppLayout />
    </TooltipProvider>
  )
}

export default App
