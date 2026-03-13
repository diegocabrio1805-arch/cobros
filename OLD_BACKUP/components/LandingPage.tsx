
import React, { useState, useEffect } from 'react';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const [scrolled, setScrolled] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const videoId = "dQw4w9WgXcQ"; // Placeholder: Rick Roll (Classic example, safe to use) or any tutorial ID

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-emerald-500 selection:text-white">

            {/* NAVBAR */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                            <i className="fa-solid fa-layer-group text-sm md:text-lg"></i>
                        </div>
                        <span className={`text-lg md:text-xl font-black uppercase tracking-tighter ${scrolled ? 'text-slate-900' : 'text-slate-900'}`}>
                            Anexo<span className="text-emerald-600">Cobro</span>
                        </span>
                    </div>
                    <button
                        onClick={onEnter}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/30 active:scale-95 flex items-center gap-2"
                    >
                        Acceder <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </nav>

            {/* HERO SECTION */}
            <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-6 animate-fadeIn">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sistema Integral de Gestión v1.0</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9] mb-6 animate-slideUp">
                        Control Financiero <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Inteligente</span> & Seguro
                    </h1>

                    <p className="text-sm md:text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed animate-slideUp delay-100">
                        Optimiza tus rutas de cobro, gestiona clientes y visualiza el rendimiento de tu capital en tiempo real con nuestra plataforma avanzada.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slideUp delay-200">
                        <button
                            onClick={onEnter}
                            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            Comenzar Ahora
                            <i className="fa-solid fa-rocket group-hover:translate-x-1 transition-transform"></i>
                        </button>
                        <button
                            onClick={() => setShowDemoModal(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-play text-emerald-500"></i>
                            Ver Demo
                        </button>
                    </div>

                    {/* MOCKUP PREVIEW */}
                    <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto animate-fadeIn delay-300">
                        <div className="absolute inset-x-0 -top-20 h-[300px] bg-emerald-500/5 blur-[80px] rounded-full"></div>
                        <div className="bg-slate-900 rounded-t-[2.5rem] p-4 md:p-6 shadow-2xl border-t border-x border-white/20">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                </div>
                                <div className="flex-1 bg-slate-800 h-6 rounded-lg mx-4"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-10">
                                <div className="bg-slate-800 h-32 rounded-2xl animate-pulse"></div>
                                <div className="bg-slate-800 h-32 rounded-2xl animate-pulse delay-75"></div>
                                <div className="bg-slate-800 h-32 rounded-2xl animate-pulse delay-150"></div>
                                <div className="md:col-span-2 bg-slate-800 h-48 rounded-2xl animate-pulse delay-100"></div>
                                <div className="bg-slate-800 h-48 rounded-2xl animate-pulse delay-200"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </header>

            {/* FEATURES SECTION */}
            <section className="py-20 md:py-32 bg-white relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Todo lo que necesitas</h2>
                        <p className="text-slate-500 text-sm font-medium">Herramientas potentes diseñadas para simplificar la gestión diaria de tu negocio de cobranza.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-md mb-6 group-hover:scale-110 transition-transform duration-300">
                                <i className="fa-solid fa-map-location-dot text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase mb-3">Geolocalización</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Rastrea y audita la ubicación exacta de cada gestión. Visualiza tus rutas en tiempo real con mapas interactivos y marcadores de estado.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-md mb-6 group-hover:scale-110 transition-transform duration-300">
                                <i className="fa-solid fa-chart-pie text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase mb-3">Métricas Financieras</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Dashboard ejecutivo con KPIs clave: utilidad neta, proyección de ingresos, capital en calle y eficiencia de recaudo diaria.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-md mb-6 group-hover:scale-110 transition-transform duration-300">
                                <i className="fa-solid fa-file-shield text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase mb-3">Seguridad y Auditoría</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Registro inmutable de todas las transacciones. Roles de usuario (Admin, Gerente, Cobrador) y respaldo fotográfico de clientes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-20 md:py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-6">Lleva tu negocio al <span className="text-emerald-400">siguiente nivel</span></h2>
                    <p className="text-slate-400 max-w-xl mx-auto mb-10 text-sm md:text-base">Únete a la plataforma más segura y eficiente para la gestión de cobros puerta a puerta.</p>
                    <button
                        onClick={onEnter}
                        className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-50 transition-all active:scale-95"
                    >
                        Ingresar al Sistema
                    </button>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-950 py-12 border-t border-slate-900">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                            <i className="fa-solid fa-layer-group text-sm"></i>
                        </div>
                        <span className="text-base font-black uppercase text-slate-700">Anexo<span className="text-slate-500">Cobro</span></span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        © {new Date().getFullYear()} Todos los derechos reservados.
                    </p>
                </div>
            </footer>

            {/* VIDEO MODAL */}
            {showDemoModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn">
                    <div className="relative w-full max-w-4xl bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 animate-scaleIn">
                        <button
                            onClick={() => setShowDemoModal(false)}
                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all z-10"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                        <div className="relative pt-[56.25%]">
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
