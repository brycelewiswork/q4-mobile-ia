import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { DialRoot } from "@/components/dialkit"
import App from "./App"
import { initFluidSystem } from "@/lib/fluid"
import { initColorSystem } from "@/lib/colors"
import "./index.css"
import "./ios-dark.css"
import "./android.css"
import "@/components/dialkit/theme.css"

initFluidSystem()
initColorSystem()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
        <DialRoot position="top-right" />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
