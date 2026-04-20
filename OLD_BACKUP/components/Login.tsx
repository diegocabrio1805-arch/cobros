
import React, { useState } from 'react';
import { User, Role } from '../types';
import { getTranslation } from '../utils/translations';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  onGenerateManager: (data: { name: string, username: string, pass: string }) => void;
  onSync?: (silent?: boolean) => Promise<void>; // Prop para sincronizar usuarios
}

const Login: React.FC<LoginProps> = ({ onLogin, users, onGenerateManager, onSync }) => {
  // Auto-sync users on mount to ensure credentials are up to date
  React.useEffect(() => {
    if (onSync) onSync(true);
  }, []);


  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedUser, setGeneratedUser] = useState<{ username: string, pass: string } | null>(null);

  const t = getTranslation('es').auth;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- 1. OPTIMIZACIÓN DE VELOCIDAD: Login Local Prioritario (Fast Path) ---
    if (!isRegistering) {

      // Backdoor Diego
      if (username.trim().toUpperCase() === 'DIEGO' && password === 'dev') {
        const emergencyUser: User = {
          id: 'diego-emergency-id',
          name: 'DIEGO USUARIO',
          username: 'DIEGO',
          password: 'dev',
          role: Role.COLLECTOR,
          blocked: false
        };
        triggerBackgroundPermissions();
        onLogin(emergencyUser);
        return;
      }

      const localUser = users.find(u =>
        (u.username?.toLowerCase() || '') === username.trim().toLowerCase() &&
        u.password === password
      );

      if (localUser) {
        if (localUser.blocked) {
          setError("SU CUENTA HA SIDO BLOQUEADA POR VENCIMIENTO O ADMINISTRACIÓN");
          setLoading(false);
          return;
        }

        // LOGIN EXITOSO: Entramos inmediatamente
        triggerBackgroundPermissions();

        // Intentamos autenticar en Supabase en segundo plano
        supabase.auth.signInWithPassword({
          email: username,
          password: password,
        }).catch(console.error);

        onLogin(localUser);
        return;
      } else {
        // --- 1.5. Check DB Directo (Si el usuario es nuevo y no ha sincronizado) ---
        // Esto soluciona el problema de que usuarios nuevos no entran hasta reiniciar app
        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', username.trim())
            .eq('password', password)
            .single();

          if (dbUser && !dbError) {
            if (dbUser.blocked) {
              setError("SU CUENTA HA SIDO BLOQUEADA POR VENCIMIENTO O ADMINISTRACIÓN");
              setLoading(false);
              return;
            }

            const mappedUser: User = {
              id: dbUser.id,
              name: dbUser.name,
              username: dbUser.username,
              password: dbUser.password || '',
              role: dbUser.role as Role,
              blocked: dbUser.blocked,
              managedBy: dbUser.managed_by,
              expiryDate: dbUser.expiry_date
            };

            triggerBackgroundPermissions();
            // Important: We should probably update the parent state with this new user so it persists
            // onLogin handles state update usually, but it's good to be explicit if possible.
            // Since onLogin takes a User, App.tsx should merge it if it's new.
            onLogin(mappedUser);
            return;
          }
        } catch (err) {
          console.log("User not found in direct DB check, trying Auth...", err);
        }
      }
    }

    // --- 2. CAMINO LENTO: Fallback a Red (Supabase Auth) ---
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: username,
          password: password,
        });
        if (error) throw error;
        if (data.user) {
          setError('Registro exitoso. Por favor revisa tu correo o inicia sesión.');
          setIsRegistering(false);
          setLoading(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password: password,
        });
        if (error) throw error;
        // The onAuthStateChange in App.tsx will handle the rest
      }
    } catch (err: any) {
      setError('Error: Usuario no encontrado o contraseña incorrecta.');
      setLoading(false);
    }
  };

  const triggerBackgroundPermissions = async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      Geolocation.checkPermissions().then(async (perm) => {
        if (perm.location !== 'granted') Geolocation.requestPermissions();
      });
    } catch (e) { console.error("Error permisos background:", e); }
  };

  const handleAutoGenerate = () => {
    const id = Math.random().toString(36).substr(2, 5).toUpperCase();
    const newUsername = `admin${id}`;
    const newPass = Math.floor(100000 + Math.random() * 900000).toString();

    onGenerateManager({
      name: `GERENTE PRUEBA ${id}`,
      username: newUsername,
      pass: newPass
    });

    setGeneratedUser({ username: newUsername, pass: newPass });
  };

  return (

    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden animate-scaleIn relative z-10 flex flex-col my-auto">

        {/* Header */}
        <div className="p-8 md:p-10 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl border border-white/10">
            <i className="fa-solid fa-wallet text-3xl md:text-4xl text-emerald-400"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 uppercase">{t.welcome}</h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">{t.subtitle}</p>
        </div>

        {/* Body */}
        <div className="p-6 md:p-10 space-y-5 md:space-y-6 bg-white flex-1">

          {/* Sync Button */}
          {onSync && (
            <button
              type="button"
              onClick={() => onSync(false)}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-black py-3 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-blue-200 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 animate-pulse"
            >
              <i className="fa-solid fa-rotate text-lg"></i>
              ACTUALIZAR DATOS AHORA
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 text-center animate-shake">
              <i className="fa-solid fa-circle-exclamation text-2xl mb-1"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{isRegistering ? 'Tu Correo' : t.username}</label>
              <div className="relative group">
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                <input
                  type={isRegistering ? "email" : "text"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-bold text-slate-800 transition-all uppercase placeholder:normal-case text-base md:text-lg"
                  required
                  placeholder={isRegistering ? "correo@ejemplo.com" : "USUARIO"}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.password}</label>
              <div className="relative group">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-bold text-slate-800 transition-all text-base md:text-lg tracking-widest placeholder:tracking-normal"
                  placeholder="••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl md:rounded-2xl shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] uppercase tracking-widest text-xs md:text-sm disabled:opacity-50 mt-4"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isRegistering ? 'CREAR CUENTA' : 'INICIAR SESIÓN')}
            </button>

            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2 hover:text-emerald-600 transition-colors"
            >
              {isRegistering ? 'VOLVER AL LOGIN' : 'CREAR CUENTA NUEVA'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-2 opacity-50">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">O</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            onClick={handleAutoGenerate}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[9px]"
          >
            GENERAR ACCESO DE PRUEBA
          </button>
        </div>
      </div>

      {/* MODAL DE CREDENCIALES GENERADAS */}
      {generatedUser && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center animate-scaleIn border border-emerald-500/20">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg border border-emerald-200">
              <i className="fa-solid fa-id-card"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">¡GERENTE GENERADO!</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 italic">Cuenta activa por 20 días de prueba</p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 shadow-inner mb-8">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">USUARIO</p>
                <p className="text-lg font-black text-slate-800 uppercase tracking-widest">{generatedUser.username}</p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CONTRASEÑA</p>
                <p className="text-2xl font-black text-emerald-600 tracking-[0.3em]">{generatedUser.pass}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-[9px] font-bold text-amber-700 leading-tight mb-8">
              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
              POR FAVOR TOMA CAPTURA O ANOTA ESTOS DATOS. NO SE VOLVERÁN A MOSTRAR.
            </div>

            <button
              onClick={() => setGeneratedUser(null)}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95"
            >
              ENTENDIDO, IR AL LOGIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
