import { Navigate, Route, Routes } from "react-router-dom"
import { ToastProvider } from "@/components/ToastProvider"
import { AppProvider, useApp } from "@/store/AppContext"
import { BottomNav } from "@/components/BottomNav"
import { Splash } from "@/components/Splash"
import { AuthPage } from "@/pages/AuthPage"
import { MapPage } from "@/pages/MapPage"
import { PlacePage } from "@/pages/PlacePage"
import { PulsePage } from "@/pages/PulsePage"
import { AIPage } from "@/pages/AIPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { LevelsPage } from "@/pages/LevelsPage"

function Root() {
  const { token, ready } = useApp()

  if (!token) return <AuthPage />

  return (
    <div className="desktop-shell">
      <div className="app-frame">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {ready ? (
            <Routes>
              <Route path="/map" element={<MapPage />} />
              <Route path="/place/:id" element={<PlacePage />} />
              <Route path="/pulse" element={<PulsePage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/levels" element={<LevelsPage />} />
              <Route path="/auth" element={<Navigate to="/map" replace />} />
              <Route path="*" element={<Navigate to="/map" replace />} />
            </Routes>
          ) : (
            <Splash />
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </ToastProvider>
  )
}
