
import React, { useState } from 'react';
import { User, Role, AppState } from '../types';
import { getTranslation } from '../utils/translations';
import { formatDate } from '../utils/helpers';

interface ProfileProps {
  state: AppState;
  onUpdateUser: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ state, onUpdateUser }) => {
  const user = state.currentUser;
  if (!user) return null;

  const t = getTranslation(state.settings.language).profile;
  const isAdmin = user.role === Role.ADMIN;
  const isManager = user.role === Role.MANAGER;
  const canEdit = isAdmin || isManager;
  
  const [formData, setFormData] = useState({
    name: user.name,
    username: user.username,
    password: user.password || ''
  });
  
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    const updatedUser: User = {
      ...user,
      name: formData.name,
      username: formData.username,
      password: formData.password
    };
    
    onUpdateUser(updatedUser);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-24 px-1">
      <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-xl">
             {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tighter leading-none">{t.title}</h2>
            <p className="text-slate-700 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">{t.subtitle}</p>
          </div>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-300">
           <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{user.role}</span>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <i className="fa-solid fa-user-shield text-9xl"></i>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 mb-2 border-b border-slate-200 pb-4">
             <i className="fa-solid fa-id-card text-emerald-600 text-xl"></i>
             <h3 className="text-base md:text-lg font-black text-slate-950 uppercase tracking-tight">{t.info}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{t.name}</label>
               <input 
                 type="text" 
                 value={formData.name} 
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full px-5 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white font-bold text-slate-950 outline-none bg-slate-50 transition-all"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{t.username}</label>
               <input 
                 type="text" 
                 value={formData.username} 
                 onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                 className="w-full px-5 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white font-bold text-slate-950 outline-none bg-slate-50 transition-all"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{t.role}</label>
               <div className="relative">
                 <input 
                   readOnly
                   type="text" 
                   value={user.role} 
                   className="w-full px-5 py-3.5 rounded-2xl border bg-slate-100 border-slate-200 grayscale cursor-not-allowed font-black text-slate-500 uppercase text-[10px]"
                 />
                 <i className="fa-solid fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{t.password}</label>
               <input 
                 type="text" 
                 value={formData.password} 
                 onChange={e => setFormData({...formData, password: e.target.value})}
                 className="w-full px-5 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white font-black text-slate-950 outline-none bg-slate-50 transition-all tracking-widest"
               />
            </div>

            <div className="md:col-span-2 space-y-1.5">
               <label className="text-[10px] font-black text-red-700 uppercase tracking-widest ml-1">Fecha de Vencimiento de Licencia</label>
               <div className="relative">
                 <input 
                   readOnly
                   type="text" 
                   value={user.expiryDate ? formatDate(user.expiryDate).toUpperCase() : 'LICENCIA DE POR VIDA'} 
                   className="w-full px-5 py-4 rounded-2xl border bg-red-50 border-red-100 grayscale cursor-not-allowed font-black text-red-900 uppercase text-xs"
                 />
                 <i className="fa-solid fa-calendar-lock absolute right-5 top-1/2 -translate-y-1/2 text-red-300"></i>
               </div>
               <p className="text-[8px] font-bold text-slate-400 uppercase ml-1 mt-1">* Solo el administrador del sistema puede prorrogar esta fecha.</p>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
               <i className="fa-solid fa-cloud-arrow-up"></i>
               {t.save}
            </button>
          </div>

          {showSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-slideIn">
               <i className="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
               <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">{t.success}</p>
            </div>
          )}
        </form>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-xl relative overflow-hidden group">
         <div className="relative z-10">
            <h4 className="text-xl font-black uppercase tracking-tighter mb-1">Estado de Seguridad</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nivel de Acceso: {user.role.toUpperCase()}</p>
         </div>
         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner border border-white/10">
            <i className="fa-solid fa-shield-halved"></i>
         </div>
         <i className="fa-solid fa-fingerprint absolute -right-4 -bottom-4 text-7xl text-white/5 group-hover:rotate-12 transition-transform"></i>
      </div>
    </div>
  );
};

export default Profile;
