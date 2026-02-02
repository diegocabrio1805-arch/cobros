import React, { useState } from 'react';
import { AppState, User, Role, AppSettings } from '../types';
import { getTranslation } from '../utils/translations';

interface CollectorsProps {
  state: AppState;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  updateSettings: (settings: AppSettings) => void;
}

const Collectors: React.FC<CollectorsProps> = ({ state, onAddUser, onUpdateUser, onDeleteUser, updateSettings }) => {
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: Role.COLLECTOR,
    expiryDate: ''
  });

  const [receiptData, setReceiptData] = useState({
    companyName: state.settings.companyName || 'ANEXO COBRO',
    contactPhone: state.settings.contactPhone || '',
    transferAlias: state.settings.transferAlias || ''
  });

  const t = getTranslation(state.settings.language);
  const isAdmin = state.currentUser?.role === Role.ADMIN;
  const isManager = state.currentUser?.role === Role.MANAGER;
  const isAdminOrManager = isAdmin || isManager;
  const currentUserId = state.currentUser?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      const oldUser = state.users.find(u => u.id === editingUserId);
      const updatedUser: User = {
        id: editingUserId,
        name: formData.name,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        expiryDate: formData.expiryDate,
        managedBy: oldUser?.managedBy
      };
      onUpdateUser(updatedUser);
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        expiryDate: formData.expiryDate,
        managedBy: currentUserId
      };
      onAddUser(newUser);
    }
    closeModal();
  };

  const handleSaveReceiptSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...state.settings,
      companyName: receiptData.companyName,
      contactPhone: receiptData.contactPhone,
      transferAlias: receiptData.transferAlias
    });
    setShowReceiptModal(false);
    alert("Configuración de recibo actualizada.");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ name: '', username: '', password: '', role: Role.COLLECTOR, expiryDate: '' });
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      expiryDate: user.expiryDate || ''
    });
    setShowModal(true);
  };

  const getDaysToExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const collectors = state.users.filter(u => u.role === Role.COLLECTOR && u.managedBy === currentUserId);

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Rutas / Cobradores</h2>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {isAdmin ? 'Gestión de mis cobradores personales' : 'Gestión de sucursal aislada'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {isAdminOrManager && (
            <button
              onClick={() => {
                setReceiptData({
                  companyName: state.settings.companyName || 'ANEXO COBRO',
                  contactPhone: state.settings.contactPhone || '',
                  transferAlias: state.settings.transferAlias || ''
                });
                setShowReceiptModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg active:scale-95 text-[10px] uppercase tracking-widest"
            >
              <i className="fa-solid fa-file-invoice"></i>
              CONFIGURAR RECIBO
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-blue-500/20 active:scale-95 text-[10px] uppercase tracking-widest"
            >
              <i className="fa-solid fa-user-plus"></i>
              {t.collectors.newRoute}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-1">
        {collectors.length === 0 ? (
          <div className="col-span-full py-16 md:py-20 bg-white rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center">
            <i className="fa-solid fa-route text-4xl md:text-5xl mb-4 opacity-20"></i>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">No hay rutas vinculadas directamente a su cuenta</p>
          </div>
        ) : (
          collectors.map((user) => {
            const daysLeft = getDaysToExpiry(user.expiryDate);
            const isExpiringSoon = daysLeft !== null && daysLeft <= 5 && daysLeft >= 0;

            return (
              <div key={user.id} className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all group relative overflow-hidden ${isExpiringSoon ? 'bg-red-600 border-red-700 shadow-xl' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
                {isExpiringSoon && (
                  <div className="absolute top-0 left-0 w-full bg-red-950/20 py-1.5 text-center">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest animate-pulse">
                      <i className="fa-solid fa-clock mr-1"></i>
                      {daysLeft} días para vencimiento
                    </p>
                  </div>
                )}

                <div className={`flex justify-between items-start mb-6 ${isExpiringSoon ? 'mt-4' : ''}`}>
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black uppercase ${isExpiringSoon ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-lg transition-all active:scale-90 flex items-center justify-center ${isExpiringSoon ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white border border-slate-100 text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    {/* ÚNICAMENTE EL ADMINISTRADOR PUEDE ELIMINAR COBRADORES - SE ELIMINÓ EL CONFIRM PARA BORRADO AUTOMÁTICO */}
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteUser(user.id)}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-lg transition-all active:scale-90 flex items-center justify-center ${isExpiringSoon ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className={`font-black text-lg md:text-xl uppercase truncate ${isExpiringSoon ? 'text-white' : 'text-slate-800'}`}>{user.name}</h4>
                  </div>

                  <div className={`p-4 rounded-xl md:rounded-2xl space-y-2 border shadow-inner ${isExpiringSoon ? 'bg-black/10 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between text-[9px] md:text-xs">
                      <span className={`font-bold uppercase ${isExpiringSoon ? 'text-white/50' : 'text-slate-400'}`}>{t.collectors.user}:</span>
                      <span className={`font-black truncate max-w-[120px] ${isExpiringSoon ? 'text-white' : 'text-slate-700'}`}>{user.username}</span>
                    </div>
                    <div className="flex justify-between text-[9px] md:text-xs">
                      <span className={`font-bold uppercase ${isExpiringSoon ? 'text-white/50' : 'text-slate-400'}`}>{t.collectors.pass}:</span>
                      <span className={`font-black tracking-widest ${isExpiringSoon ? 'text-white' : 'text-blue-600'}`}>{user.password}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CONFIGURAR RECIBO */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn flex flex-col">
            <div className="p-5 md:p-8 bg-slate-800 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Personalizar Recibo</h3>
                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identidad de Marca y Soporte</p>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="w-8 h-8 text-white/50 hover:text-white active:scale-95 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSaveReceiptSettings} className="p-5 md:p-8 space-y-5 flex-1 overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Empresa</label>
                  <input required type="text" value={receiptData.companyName} onChange={(e) => setReceiptData({ ...receiptData, companyName: e.target.value })} className="w-full px-5 py-3 md:py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-slate-800 uppercase" placeholder="EJ: FINTECH SUR" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp de Soporte</label>
                  <div className="relative">
                    <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input type="tel" value={receiptData.contactPhone} onChange={(e) => setReceiptData({ ...receiptData, contactPhone: e.target.value })} className="w-full pl-12 pr-5 py-3 md:py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black" placeholder="300 123 4567" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias / Nro Cuenta (Transf)</label>
                  <div className="relative">
                    <i className="fa-solid fa-credit-card absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input type="text" value={receiptData.transferAlias} onChange={(e) => setReceiptData({ ...receiptData, transferAlias: e.target.value })} className="w-full pl-12 pr-5 py-3 md:py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black" placeholder="Nequi: 300..." />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-[8px] md:text-[9px] text-amber-700 font-bold leading-relaxed">
                <i className="fa-solid fa-circle-info mr-1"></i>
                Estos datos aparecerán al final de cada recibo de WhatsApp y en el encabezado de las imágenes compartidas.
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-[10px] md:text-sm">GUARDAR CAMBIOS</button>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn flex flex-col">
            <div className="p-5 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter">{editingUserId ? t.collectors.editRoute : t.collectors.newRoute}</h3>
              <button onClick={closeModal} className="w-8 h-8 text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.collectors.name}</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 md:py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.collectors.user}</label>
                  <input required type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })} className="w-full px-5 py-3 md:py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t.collectors.pass}</label>
                  <input required type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-5 py-3 md:py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                </div>
              </div>

              <div>
                <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fecha de Vencimiento (Acceso)</label>
                <input
                  type="date"
                  required
                  value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(23, 59, 59, 999);
                    setFormData({ ...formData, expiryDate: date.toISOString() });
                  }}
                  className="w-full px-5 py-3 md:py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 uppercase"
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100 text-[8px] md:text-[10px] text-blue-600 font-bold leading-relaxed">
                <i className="fa-solid fa-circle-info mr-1"></i>
                Este cobrador pertenecerá exclusivamente a su sucursal.
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl md:rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest text-[10px] md:text-sm">{t.common.save}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collectors;