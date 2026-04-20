const fs = require('fs');
const filepath = 'c:/Users/DANIEL/Desktop/cobros/components/Collectors.tsx';

let content = fs.readFileSync(filepath, 'utf-8');

// Find where the modal ends
const targetSearch = `          <div className="pt-4 sticky bottom-0 bg-slate-50/90 backdrop-blur-md z-10 pb-4">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-xl md:rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest text-[10px] md:text-sm">
              {editingUserId ? 'ACTUALIZAR EXPEDIENTE' : 'CREAR RUTA Y ACTIVAR'}
            </button>
          </div>
        </form>
        </div>
      </div >
    )}`;

const index = content.indexOf(targetSearch);
if (index === -1) {
  console.error("Could not find base text");
  process.exit(1);
}

const cleanedEnd = `
    {/* MODAL DE CONFIRMACIÓN DE GUARDADO */}
    {savedUserName && (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[200] p-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn border-4 border-emerald-500 text-center flex flex-col">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-check text-4xl"></i>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">¡Guardado!</h2>
            <p className="text-sm font-bold opacity-90 mt-2 uppercase tracking-widest">Cambios aplicados con éxito</p>
          </div>
          <div className="p-8 bg-emerald-50/50 flex-col">
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cobrador Actualizado:</p>
              <p className="text-lg font-black text-emerald-800 uppercase tracking-tighter">{savedUserName}</p>
            </div>
            <button
              onClick={() => setSavedUserName(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 uppercase tracking-widest text-sm"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default Collectors;
`;

const finalContent = content.substring(0, index + targetSearch.length) + cleanedEnd;
fs.writeFileSync(filepath, finalContent);
console.log("File fixed!");
