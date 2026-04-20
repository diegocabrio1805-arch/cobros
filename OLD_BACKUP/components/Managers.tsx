
import React, { useState, useMemo } from 'react';
import { AppState, User, Role } from '../types';
import { getTranslation } from '../utils/translations';

interface ManagersProps {
  state: AppState;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const Managers: React.FC<ManagersProps> = ({ state, onAddUser, onUpdateUser, onDeleteUser }) => {
  // Estados para Gerentes
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: Role.MANAGER,
    blocked: false,
    expiryDate: ''
  });

  // Estados para Cobradores del Gerente
  const [showCollectorManagerModal, setShowCollectorManagerModal] = useState<string | null>(null); // ID del Gerente
  const [isEditingCollector, setIsEditingCollector] = useState<string | null>(null); // ID del Cobrador
  const [collectorForm, setCollectorForm] = useState({
    name: '',
    username: '',
    password: '',
    blocked: false,
    expiryDate: ''
  });

  const t = getTranslation(state.settings.language);

  // Funciones Gerente
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userData: User = {
      id: editingUserId || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      username: formData.username,
      password: formData.password,
      role: Role.MANAGER,
      blocked: formData.blocked,
      expiryDate: formData.expiryDate
    };
    if (editingUserId) onUpdateUser(userData);
    else onAddUser(userData);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ name: '', username: '', password: '', role: Role.MANAGER, blocked: false, expiryDate: '' });
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      blocked: !!user.blocked,
      expiryDate: user.expiryDate || ''
    });
    setShowModal(true);
  };

  // Funciones Cobrador
  const handleCollectorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCollectorManagerModal) return;

    const userData: User = {
      id: isEditingCollector || Math.random().toString(36).substr(2, 9),
      name: collectorForm.name,
      username: collectorForm.username,
      password: collectorForm.password,
      role: Role.COLLECTOR,
      blocked: collectorForm.blocked,
      expiryDate: collectorForm.expiryDate,
      managedBy: showCollectorManagerModal // Vinculado al Gerente
    };

    if (isEditingCollector) onUpdateUser(userData);
    else onAddUser(userData);

    resetCollectorForm();
  };

  const resetCollectorForm = () => {
    setIsEditingCollector(null);
    setCollectorForm({ name: '', username: '', password: '', blocked: false, expiryDate: '' });
  };

  const handleEditCollector = (user: User) => {
    setIsEditingCollector(user.id);
    setCollectorForm({
      name: user.name,
      username: user.username,
      password: user.password || '',
      blocked: !!user.blocked,
      expiryDate: user.expiryDate || ''
    });
  };

  const checkNearExpiry = (dateStr?: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  };

  const managers = state.users.filter(u => u.role === Role.MANAGER);
  const selectedManager = state.users.find(u => u.id === showCollectorManagerModal);
  const currentCollectors = state.users.filter(u => u.role === Role.COLLECTOR && u.managedBy === showCollectorManagerModal);

  return (
    <div className="space-y-6 animate-fadeIn pb-24 px-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="w-full md:w-auto text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tighter">Panel de Gerencia</h2>
          <p className="text-[9px] md:text-[10px] font-black text-black uppercase tracking-widest mt-1 opacity-60">Control de licencias y acceso</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 transition-all font-black shadow-lg shadow-indigo-500/20 active:scale-95 uppercase text-[10px] tracking-widest"
        >
          <i className="fa-solid fa-user-plus text-sm text-black"></i>
          {t.managers.newManager}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {managers.length === 0 ? (
          <div className="col-span-full py-16 md:py-20 bg-white rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 text-center">
            <i className="fa-solid fa-user-tie text-4xl md:text-5xl mb-4 opacity-10"></i>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">Sin gerentes registrados</p>
          </div>
        ) : (
          managers.map((user) => {
            const isCritical = checkNearExpiry(user.expiryDate);
            return (
              <div key={user.id} className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all group relative overflow-hidden ${isCritical ? 'bg-red-50 border-red-600 shadow-2xl animate-border-blink' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'}`}>
                <div className="absolute -right-4 -top-4 text-slate-50 opacity-20 group-hover:opacity-30 transition-colors">
                  <i className="fa-solid fa-user-tie text-7xl md:text-9xl"></i>
                </div>

                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shadow-inner uppercase ${isCritical ? 'bg-white text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className={`w-9 h-9 md:w-10 md:h-10 border rounded-lg transition-all shadow-sm active:scale-90 flex items-center justify-center ${isCritical ? 'bg-white/20 border-white/30 text-white hover:bg-white/40' : 'bg-white border-slate-100 text-black hover:text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        <i className="fa-solid fa-pen-to-square text-xs text-black"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿ELIMINAR GERENTE: ${user.name}?\n\nEsta acción borrará también a todos los cobradores asociados.`)) {
                            onDeleteUser(user.id);
                          }
                        }}
                        className={`w-9 h-9 md:w-10 md:h-10 border rounded-lg transition-all shadow-sm active:scale-90 flex items-center justify-center ${isCritical ? 'bg-white/20 border-white/30 text-white hover:bg-white/40' : 'bg-white border-slate-100 text-black hover:text-red-600 hover:bg-red-50'}`}
                      >
                        <i className="fa-solid fa-trash-can text-xs text-black"></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-black text-lg md:text-xl uppercase tracking-tighter truncate ${isCritical ? 'text-white' : 'text-black'}`}>{user.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[7px] md:text-[8px] font-black px-2.5 py-1 rounded-md border uppercase tracking-widest ${isCritical ? 'bg-white text-red-600 border-white' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                        {user.blocked ? 'CUENTA BLOQUEADA' : 'ACCESO ACTIVO'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl md:rounded-2xl space-y-3 border shadow-inner ${isCritical ? 'bg-black/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-black'}`}>
                    <div className="flex justify-between items-center text-[10px] md:text-xs">
                      <span className="font-bold uppercase tracking-tighter opacity-70 text-black">Corte de Licencia:</span>
                      <span className="font-black flex items-center gap-1.5 text-black">
                        <i className="fa-solid fa-calendar-day text-black"></i>
                        {user.expiryDate ? new Date(user.expiryDate).toLocaleDateString() : 'SIN FECHA'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCollectorManagerModal(user.id)}
                    className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isCritical ? 'bg-white text-red-600' : 'bg-black text-white'}`}
                  >
                    <i className="fa-solid fa-user-gear text-black"></i>
                    GESTIONAR COBRADOR
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL COBRADOR POR SUCURSAL */}
      {showCollectorManagerModal && selectedManager && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[200] p-0 md:p-4 overflow-hidden">
          <div className="bg-white w-full h-full md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-5 md:p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <i className="fa-solid fa-users-gear text-blue-400"></i>
                  Sucursal: <span className="text-blue-400">{selectedManager.name}</span>
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de personal de campo (Letras en Negro para lectura)</p>
              </div>
              <button onClick={() => { setShowCollectorManagerModal(null); resetCollectorForm(); }} className="w-12 h-12 bg-white/10 text-white rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Formulario Registro/Edición */}
              <div className="w-full md:w-[400px] p-6 bg-slate-50 border-r border-slate-200 overflow-y-auto">
                <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-user-plus text-blue-600"></i>
                  {isEditingCollector ? 'MODIFICAR COBRADOR' : 'NUEVO COBRADOR'}
                </h4>

                <form onSubmit={handleCollectorSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-black uppercase ml-1">Nombre del Gestor</label>
                    <input required type="text" value={collectorForm.name} onChange={e => setCollectorForm({ ...collectorForm, name: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-black uppercase text-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-black uppercase ml-1">Usuario ID</label>
                      <input required type="text" value={collectorForm.username} onChange={e => setCollectorForm({ ...collectorForm, username: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-black text-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-black uppercase ml-1">Pin Acceso</label>
                      <input required type="text" value={collectorForm.password} onChange={e => setCollectorForm({ ...collectorForm, password: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-black uppercase ml-1">Vigencia de Trabajo (Corte)</label>
                    <input required type="date" value={collectorForm.expiryDate} onChange={e => setCollectorForm({ ...collectorForm, expiryDate: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-black text-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" style={{ colorScheme: 'light' }} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-black uppercase">BLOQUEAR ACCESO YA</span>
                    <button type="button" onClick={() => setCollectorForm({ ...collectorForm, blocked: !collectorForm.blocked })} className={`w-12 h-6 rounded-full relative transition-colors ${collectorForm.blocked ? 'bg-red-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${collectorForm.blocked ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                      {isEditingCollector ? 'ACTUALIZAR DATOS' : 'CREAR COBRADOR'}
                    </button>
                    {isEditingCollector && (
                      <button type="button" onClick={resetCollectorForm} className="w-full py-3 text-[9px] font-black text-black uppercase hover:text-red-500 transition-colors">DESCARTAR EDICIÓN</button>
                    )}
                  </div>
                </form>
              </div>

              {/* Lista de Cobradores Actuales */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white custom-scrollbar">
                <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-6 border-b pb-2">PERSONAL VINCULADO A ESTE GERENTE</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentCollectors.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <i className="fa-solid fa-users-slash text-4xl mb-3 opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Aún no hay cobradores en esta sucursal</p>
                    </div>
                  ) : (
                    currentCollectors.map(col => {
                      const colCritical = checkNearExpiry(col.expiryDate);
                      return (
                        <div key={col.id} className={`p-5 rounded-2xl border transition-all group ${colCritical ? 'bg-red-50 border-red-200 shadow-lg animate-border-blink' : 'bg-white border-slate-200 hover:border-black'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${col.blocked ? 'bg-slate-300 text-slate-500' : 'bg-black text-white shadow-lg'}`}>{col.name.charAt(0)}</div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleEditCollector(col)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-black hover:text-blue-600 transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen text-[10px] text-black"></i></button>
                              <button onClick={() => {
                                if (confirm(`¿ELIMINAR COBRADOR: ${col.name}?`)) {
                                  onDeleteUser(col.id);
                                }
                              }} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-black hover:text-red-600 transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash text-[10px] text-black"></i></button>
                            </div>
                          </div>
                          <h5 className="font-black text-black text-sm uppercase truncate">{col.name}</h5>
                          <div className="mt-3 space-y-1.5 bg-slate-50 p-2 rounded-lg">
                            <div className="flex justify-between text-[8px] font-black text-black uppercase">
                              <span className="opacity-60">Status de Acceso:</span>
                              <span className={col.blocked ? 'text-red-600 font-black' : 'text-emerald-700 font-black'}>{col.blocked ? 'SUSPENDIDO' : 'HABILITADO'}</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-black uppercase">
                              <span className="opacity-60">Vencimiento:</span>
                              <span className={`font-black ${colCritical ? 'text-red-600' : 'text-black'}`}>{col.expiryDate || 'NO ASIGNADO'}</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-black uppercase pt-1 border-t border-slate-200">
                              <span className="opacity-60">Usuario:</span>
                              <span className="text-black">{col.username}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO/EDITAR GERENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-2 overflow-y-auto">
          <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-white/20 flex flex-col">
            <div className="p-5 md:p-8 bg-indigo-600 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">{editingUserId ? 'Gestionar Gerente' : 'Nuevo Gerente'}</h3>
                <p className="text-[8px] md:text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Ajustes de licencia y bloqueo</p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 md:w-10 md:h-10 bg-white/10 text-white rounded-lg hover:bg-red-600 transition-all flex items-center justify-center">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-black uppercase shadow-inner text-xs" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">Usuario</label>
                    <input required type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-black shadow-inner text-xs" />
                  </div>
                  <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                    <input required type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700 shadow-inner text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] md:text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">Fecha de Corte / Vigencia</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-black shadow-inner text-xs uppercase"
                      style={{ colorScheme: 'light' }}
                    />
                    <i className="fa-solid fa-calendar-alt absolute right-4 top-1/2 -translate-y-1/2 text-black pointer-events-none"></i>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-300 rounded-2xl">
                  <div>
                    <p className="text-[9px] font-black text-black uppercase">Estado de la cuenta</p>
                    <p className="text-[7px] font-bold text-black opacity-60 uppercase">Bloquear acceso al sistema</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.blocked}
                      onChange={(e) => setFormData({ ...formData, blocked: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl md:rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 uppercase tracking-widest text-[10px] md:text-xs"
              >
                {t.common.save}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Managers;
