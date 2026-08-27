import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App.tsx'

// Wrapper que oculta el Splash Screen DESPUÉS de que React pintó el DOM.
// Necesario porque launchAutoHide: false en capacitor.config.ts.
function Root() {
  useEffect(() => {
    SplashScreen.hide({ fadeOutDuration: 300 });
  }, []);
  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />)
