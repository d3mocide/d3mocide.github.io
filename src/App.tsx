import { LazyMotion, domAnimation } from 'framer-motion';
import { useOSStore } from '@/store/useOSStore';
import MatrixRain from '@/components/MatrixRain';
import LandingCard from '@/components/LandingCard';
import Desktop from '@/components/os/Desktop';
import Scanlines from '@/components/fx/Scanlines';
import Branding from '@/components/Branding';

function App() {
  const { isBooting, isShutDown } = useOSStore();

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-void text-gray-100 flex items-center justify-center">

      {/* Persistent Background FX */}
      <MatrixRain />
      
      {/* Background Branding - Stays behind windows but in front of wallpaper */}
      {/* When booting: Z-30 & Moved UP to align with Card Gap */}
      {/* When desktop: Z-0 & Moved back to Center */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden transition-all duration-[2000ms] ease-in-out ${isBooting ? 'z-30 -translate-y-32' : 'z-0 translate-y-0'}`}>
        <Branding 
            className={`transition-all duration-[2000ms] ease-in-out ${
                isBooting 
                ? 'opacity-100 scale-100' 
                : 'opacity-50 scale-[1.1] blur-none'
            }`} 
        />
      </div>
      
      <Scanlines />

      {isShutDown ? (
        <div className="absolute inset-0 bg-black z-[100] flex flex-col items-center justify-center text-neon-red font-mono">
            <h1 className="text-4xl tracking-widest animate-pulse">SYSTEM HALTED</h1>
            <p className="mt-4 text-sm animate-pulse opacity-70">IT IS NOW SAFE TO TURN OFF YOUR TERMINAL</p>
            <button 
                onClick={() => window.location.reload()} 
                className="mt-8 px-6 py-2 border border-neon-red/30 hover:bg-neon-red/10 rounded transition-colors text-xs"
            >
                MANUAL RESTART
            </button>
        </div>
      ) : isBooting ? (
        <LandingCard />
      ) : (
        <Desktop />
      )}
      
      {/* Footer - Moved into Desktop/Taskbar or removed to avoid overlap */}
    </div>
    </LazyMotion>
  )
}

export default App
