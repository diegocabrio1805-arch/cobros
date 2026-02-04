
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Client, AppState, Loan, Frequency, LoanStatus, CollectionLog, CollectionLogType, Role, PaymentStatus, User } from '../types';
import { formatCurrency, calculateTotalReturn, generateAmortizationTable, formatDate, generateReceiptText, getDaysOverdue, getLocalDateStringForCountry, generateUUID } from '../utils/helpers';
import { getTranslation } from '../utils/translations';
import { generateNoPaymentAIReminder } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';

interface ClientsProps {
  state: AppState;
  addClient: (client: Client, loan?: Loan) => void | Promise<void>;
  addLoan?: (loan: Loan) => void;
  updateClient?: (client: Client) => void;
  updateLoan?: (loan: Loan) => void;
  deleteCollectionLog?: (logId: string) => void;
  updateCollectionLog?: (logId: string, newAmount: number) => void;
  updateCollectionLogNotes?: (logId: string, notes: string) => void;
  addCollectionAttempt: (log: CollectionLog) => void;
  globalState: AppState;
  onForceSync?: (silent?: boolean, message?: string) => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

const compressImage = (base64: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64);
  });
};

const Clients: React.FC<ClientsProps> = ({ state, addClient, addLoan, updateClient, updateLoan, deleteCollectionLog, updateCollectionLog, updateCollectionLogNotes, addCollectionAttempt, globalState, onForceSync, setActiveTab }) => {
  const countryTodayStr = getLocalDateStringForCountry(state.settings.country);

  const [viewMode, setViewMode] = useState<'gestion' | 'nuevos' | 'renovaciones' | 'cartera'>('gestion');
  const [filterStartDate, setFilterStartDate] = useState(countryTodayStr);
  const [filterEndDate, setFilterEndDate] = useState(countryTodayStr);
  const [selectedCollector, setSelectedCollector] = useState<string>('all');

  // PAGINACIÓN PARA GAMA BAJA
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [showModal, setShowModal] = useState(false);
  const [showLegajo, setShowLegajo] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState<any>({
    principal: '500000',
    interestRate: '20',
    installments: '24',
    frequency: Frequency.DAILY
  });

  const [clientData, setClientData] = useState<Client>({
    id: '',
    documentId: '',
    name: '',
    phone: '',
    secondaryPhone: '',
    address: '',
    creditLimit: 1000000,
    location: undefined,
    domicilioLocation: undefined,
    profilePic: '',
    housePic: '',
    businessPic: '',
    documentPic: '',
    allowCollectorLocationUpdate: false,
    isActive: true
  });

  const [editClientFormData, setEditClientFormData] = useState<Client | null>(null);
  const [editLoanFormData, setEditLoanFormData] = useState<any>(null);

  const [initialLoan, setInitialLoan] = useState<any>({
    principal: '500000',
    interestRate: '20',
    installments: '24',
    frequency: Frequency.DAILY,
    startDate: countryTodayStr,
    endDate: '',
    customHolidays: [] as string[]
  });

  useEffect(() => {
    if (showModal) {
      const p = Number(initialLoan.principal) || 0;
      const i = Number(initialLoan.interestRate) || 0;
      const inst = Number(initialLoan.installments) || 0;

      const table = generateAmortizationTable(
        p,
        i,
        inst,
        initialLoan.frequency,
        new Date(initialLoan.startDate + 'T00:00:00'),
        state.settings.country,
        initialLoan.customHolidays
      );
      if (table.length > 0) {
        const lastDate = table[table.length - 1].dueDate.split('T')[0];
        setInitialLoan((prev: any) => ({ ...prev, endDate: lastDate }));
      }
    }
  }, [initialLoan.startDate, initialLoan.installments, initialLoan.frequency, initialLoan.customHolidays, showModal, state.settings.country]);

  useEffect(() => {
    if (isEditingClient && editLoanFormData) {
      const p = Number(editLoanFormData.principal) || 0;
      const i = Number(editLoanFormData.interestRate) || 0;
      const inst = Number(editLoanFormData.totalInstallments) || 0;

      const startDateTime = new Date(editLoanFormData.createdAt);
      const table = generateAmortizationTable(
        p,
        i,
        inst,
        editLoanFormData.frequency,
        startDateTime,
        state.settings.country,
        editLoanFormData.customHolidays || []
      );

      const totalAmount = calculateTotalReturn(p, i);
      const installmentValue = inst > 0 ? totalAmount / inst : 0;

      const updatedInstallments = table.map(newInst => {
        const existing = (editLoanFormData.installments || []).find((e: any) => e.number === newInst.number);
        if (existing) {
          return { ...newInst, paidAmount: existing.paidAmount, status: existing.status };
        }
        return newInst;
      });

      setEditLoanFormData((prev: any) => prev ? {
        ...prev,
        totalAmount: totalAmount,
        installmentValue: installmentValue,
        installments: updatedInstallments
      } : null);
    }
  }, [
    editLoanFormData?.principal,
    editLoanFormData?.interestRate,
    editLoanFormData?.totalInstallments,
    editLoanFormData?.frequency,
    editLoanFormData?.customHolidays,
    isEditingClient,
    state.settings.country
  ]);

  const [showDossierPaymentModal, setShowDossierPaymentModal] = useState(false);
  const [dossierPaymentAmount, setDossierPaymentAmount] = useState<any>('');
  const [dossierIsVirtual, setDossierIsVirtual] = useState(false);
  const [dossierIsRenewal, setDossierIsRenewal] = useState(false);
  const [isProcessingDossierAction, setIsProcessingDossierAction] = useState(false);

  const [showEditLogModal, setShowEditLogModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newLogAmount, setNewLogAmount] = useState<any>('');

  const [showCustomNoPayModal, setShowCustomNoPayModal] = useState(false);
  const [customNoPayText, setCustomNoPayText] = useState('');

  const [addInitialLoan, setAddInitialLoan] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturingType, setCapturingType] = useState<'home' | 'domicilio' | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);

  const isAdmin = state.currentUser?.role === Role.ADMIN;
  const isManager = state.currentUser?.role === Role.MANAGER;
  const isAdminOrManager = isAdmin || isManager;
  const isCollector = state.currentUser?.role === Role.COLLECTOR;
  const currentUserId = state.currentUser?.id;

  const collectors = useMemo(() => state.users.filter(u => u.role === Role.COLLECTOR), [state.users]);

  const clientInLegajo = useMemo(() => state.clients.find(c => c.id === showLegajo), [showLegajo, state.clients]);

  const activeLoanInLegajo = useMemo(() => {
    if (!showLegajo) return null;
    return state.loans.find(l => l.clientId === showLegajo && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
  }, [showLegajo, state.loans]);

  const clientHistory = useMemo(() => {
    if (!showLegajo) return [];
    return state.collectionLogs
      .filter(log => log.clientId === showLegajo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [showLegajo, state.collectionLogs]);

  const getClientMetrics = (client: Client) => {
    if (!client) return { balance: 0, installmentsStr: '0/0', daysOverdue: 0, activeLoan: null, totalPaid: 0, lastExpiryDate: '', createdAt: '' };
    const activeLoan = state.loans.find(l => l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
    let balance = 0, installmentsStr = '0/0', daysOverdue = 0, totalPaid = 0, lastExpiryDate = '', createdAt = '';

    if (activeLoan) {
      const installments = activeLoan.installments || [];

      // Regla de Oro: El Abonado debe coincidir exactamente con el historial reciente (logs)
      const loanLogs = state.collectionLogs.filter(log => log.loanId === activeLoan.id && log.type === CollectionLogType.PAYMENT && !log.isOpening);
      totalPaid = loanLogs.reduce((acc, log) => acc + (log.amount || 0), 0);

      // Saldo Pendiente: Total Crédito - Suma de Abonos en Historial
      balance = Math.max(0, activeLoan.totalAmount - totalPaid);

      // Progreso Cuotas: Total Abonado / Valor Cuota (para reflejar parciales)
      const progress = totalPaid / (activeLoan.installmentValue || 1);
      const formattedProgress = progress % 1 === 0 ? progress.toString() : progress.toFixed(1);
      installmentsStr = `${formattedProgress} / ${activeLoan.totalInstallments}`;

      daysOverdue = getDaysOverdue(activeLoan, state.settings, totalPaid);
      if (installments.length > 0) {
        lastExpiryDate = installments[installments.length - 1].dueDate;
      }
      createdAt = activeLoan.createdAt;
    }
    return { balance, installmentsStr, daysOverdue, activeLoan, totalPaid, lastExpiryDate, createdAt };
  };

  const filteredClients = useMemo(() => {
    let clients = state.clients.filter(c => !c.isHidden) || [];
    if (globalSearch) {
      const s = globalSearch.toLowerCase();
      clients = clients.filter(c => (c.name || '').toLowerCase().includes(s) || (c.documentId || '').includes(s));
    }
    if (selectedCollector !== 'all') {
      clients = clients.filter(c => {
        const activeLoan = state.loans.find(l => l.clientId === c.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        return activeLoan?.collectorId === selectedCollector || c.addedBy === selectedCollector;
      });
    }
    // SAFE SORT (NaN PROOF)
    return [...clients].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const vA = isNaN(tA) ? 0 : tA;
      const vB = isNaN(tB) ? 0 : tB;
      return vB - vA;
    });
  }, [state.clients, globalSearch]);

  // RESETEAR PAGINA AL FILTRAR
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, globalSearch, selectedCollector]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  // VISTA EXCEL: NUEVOS CLIENTES EN RANGO
  const nuevosExcelData = useMemo(() => {
    if (viewMode !== 'nuevos') return [];
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');

    return state.clients.filter(client => {
      if (!client.createdAt || client.isHidden) return false;
      const cDate = new Date(client.createdAt);
      const inRange = cDate >= start && cDate <= end;
      if (!inRange) return false;

      if (selectedCollector !== 'all') {
        const activeLoan = state.loans.find(l => l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        return activeLoan?.collectorId === selectedCollector || client.addedBy === selectedCollector;
      }
      return true;
    }).map(client => {
      const metrics = getClientMetrics(client);
      return { ...client, _metrics: metrics };
    }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }, [state.clients, filterStartDate, filterEndDate, viewMode]);

  // VISTA EXCEL: RENOVACIONES EN RANGO
  const renovacionesExcelData = useMemo(() => {
    if (viewMode !== 'renovaciones') return [];
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');

    return state.loans.filter(loan => {
      const client = state.clients.find(c => c.id === loan.clientId);
      if (!client || client.isHidden) return false;
      const lDate = new Date(loan.createdAt);
      const inRange = loan.isRenewal && lDate >= start && lDate <= end;
      if (!inRange) return false;

      if (selectedCollector !== 'all') {
        return loan.collectorId === selectedCollector;
      }
      return true;
    }).map(loan => {
      const client = state.clients.find(c => c.id === loan.clientId);
      const metrics = getClientMetrics(client!);
      return { ...client, _loan: loan, _metrics: metrics };
    }).sort((a, b) => new Date(b._loan!.createdAt).getTime() - new Date(a._loan!.createdAt).getTime());
  }, [state.loans, state.clients, filterStartDate, filterEndDate, viewMode]);

  // VISTA EXCEL: CARTERA GENERAL (TODOS LOS CLIENTES POR FECHA DE REGISTRO)
  const carteraExcelData = useMemo(() => {
    if (viewMode !== 'cartera') return [];
    return state.clients.filter(c => {
      if (c.isHidden) return false;
      if (selectedCollector !== 'all') {
        const activeLoan = state.loans.find(l => l.clientId === c.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        return activeLoan?.collectorId === selectedCollector || c.addedBy === selectedCollector;
      }
      return true;
    }).map(client => {
      const metrics = getClientMetrics(client);
      return { ...client, _metrics: metrics };
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [state.clients, viewMode]);

  const handleOpenMap = (loc?: { lat: number, lng: number }) => {
    if (loc && loc.lat && loc.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
      window.open(url, '_blank');
    } else {
      alert("Sin coordenadas capturadas para este punto.");
    }
  };

  const handleToggleHideClient = (clientId: string) => {
    if (!isAdminOrManager) return;
    const client = state.clients.find(c => c.id === clientId);
    if (client && updateClient) {
      if (confirm(`¿DESEA OCULTAR AL CLIENTE ${client.name.toUpperCase()}? NO APARECERÁ EN LAS RUTAS DE COBRO ACTIVAS.`)) {
        updateClient({ ...client, isHidden: true });
      }
    }
  };

  const handleSubmitNewClient = async (e: React.FormEvent) => {
    if (isSubmitting) return;
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const clientId = generateUUID();
      // FIX: Explicitly assign branchId so it belongs to the Manager/Admin, not the Collector's private scope
      // This ensures it appears on the Web Dashboard (Admin) AND the Collector's App (via managedBy view)
      const user = state.currentUser;
      const calculatedBranchId = (user?.role === Role.ADMIN || user?.role === Role.MANAGER)
        ? user.id
        : (user?.managedBy || user?.id);

      const client: Client = {
        ...clientData,
        id: clientId,
        addedBy: currentUserId,
        branchId: calculatedBranchId,
        isActive: true,
        isHidden: false,
        createdAt: new Date().toISOString()
      };
      let loan: Loan | undefined;

      if (addInitialLoan) {
        const baseDateStr = initialLoan.startDate || countryTodayStr;
        const startDateTime = new Date(baseDateStr + 'T00:00:00');
        const validStartDate = isNaN(startDateTime.getTime()) ? new Date() : startDateTime;

        const safeParseFloat = (val: string | number | undefined) => {
          if (!val) return 0;
          const str = val.toString().replace(',', '.');
          return parseFloat(str) || 0;
        };

        const p = safeParseFloat(initialLoan.principal);
        const i = safeParseFloat(initialLoan.interestRate);
        const inst = safeParseFloat(initialLoan.installments);

        const total = calculateTotalReturn(p, i);
        loan = {
          id: generateUUID(),
          clientId,
          collectorId: currentUserId,
          principal: p,
          interestRate: i,
          totalInstallments: inst,
          frequency: initialLoan.frequency,
          totalAmount: total,
          installmentValue: inst > 0 ? total / inst : 0,
          status: LoanStatus.ACTIVE,
          createdAt: validStartDate.toISOString(),
          customHolidays: initialLoan.customHolidays,
          installments: generateAmortizationTable(p, i, inst, initialLoan.frequency, validStartDate, state.settings.country, initialLoan.customHolidays)
        };
        // CRITICAL: Update client with loan details for denormalized view
        client.capital = p;
        client.currentBalance = total;
      }
      await addClient(client, loan);
      // Custom confirmation message as requested
      if (onForceSync) onForceSync(false, "CREDITO SUBIDO CORRECTAMENTE");
      setShowModal(false);
      setCurrentPage(1); // FORCE RESET TO PAGE 1 TO SEE NEW CLIENT
      setClientData({ id: '', documentId: '', name: '', phone: '', secondaryPhone: '', address: '', creditLimit: 1000000, location: undefined, domicilioLocation: undefined, profilePic: '', housePic: '', businessPic: '', documentPic: '', allowCollectorLocationUpdate: false, isActive: true, isHidden: false });
    } catch (error) {
      alert("Error al crear el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureLocation = async (type: 'home' | 'domicilio', forEdit: boolean = false) => {
    setIsCapturing(true);
    setCapturingType(type);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (forEdit && editClientFormData) {
        setEditClientFormData(prev => prev ? { ...prev, [type === 'home' ? 'location' : 'domicilioLocation']: newLoc } : null);
      } else {
        setClientData(prev => ({ ...prev, [type === 'home' ? 'location' : 'domicilioLocation']: newLoc }));
      }
    } catch (err: any) {
      alert("Error GPS: " + err.message);
    } finally {
      setIsCapturing(false);
      setCapturingType(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePic' | 'documentPic' | 'housePic' | 'businessPic', forEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressImage(base64);
      if (forEdit) {
        setEditClientFormData(prev => prev ? { ...prev, [field]: compressed } : null);
      } else {
        setClientData(prev => ({ ...prev, [field]: compressed }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEdit = () => {
    if (!clientInLegajo) return;
    setEditClientFormData({ ...clientInLegajo });
    if (activeLoanInLegajo) {
      setEditLoanFormData({ ...activeLoanInLegajo });
    }
    setIsEditingClient(true);
  };

  const handleSaveEditedClient = () => {
    if (editClientFormData && updateClient) {
      updateClient(editClientFormData);
      if (editLoanFormData && updateLoan) {
        const loanToSave = {
          ...editLoanFormData,
          principal: Number(editLoanFormData.principal),
          interestRate: Number(editLoanFormData.interestRate),
          totalInstallments: Number(editLoanFormData.totalInstallments)
        };
        updateLoan(loanToSave);
      }
      setIsEditingClient(false);
      alert("Expediente y Crédito actualizados.");
    }
  };

  const handleOpenDossierPayment = () => {
    if (!activeLoanInLegajo) return;
    setDossierPaymentAmount(activeLoanInLegajo.installmentValue.toString());
    setDossierIsVirtual(false);
    setDossierIsRenewal(false);
    setShowDossierPaymentModal(true);
  };

  const setDossierPaymentMethod = (method: 'cash' | 'virtual' | 'renewal') => {
    setDossierIsVirtual(method === 'virtual');
    setDossierIsRenewal(method === 'renewal');
    if (method === 'renewal' && activeLoanInLegajo) {
      const installments = activeLoanInLegajo.installments || [];
      const tPaid = installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      setDossierPaymentAmount(Math.max(0, activeLoanInLegajo.totalAmount - tPaid).toString());
    } else if (activeLoanInLegajo) {
      setDossierPaymentAmount(activeLoanInLegajo.installmentValue.toString());
    }
  };

  const handleDossierAction = async (type: CollectionLogType, customAmount?: number) => {
    if (isProcessingDossierAction || !clientInLegajo || !activeLoanInLegajo || !addCollectionAttempt) return;
    setIsProcessingDossierAction(true);
    try {
      const amountToPay = customAmount || Number(dossierPaymentAmount);

      // VALIDACIÓN: El abono no puede ser mayor al saldo
      const metrics = getClientMetrics(clientInLegajo);
      if (type === CollectionLogType.PAYMENT && amountToPay > metrics.balance + 0.01) {
        alert(`ERROR: El abono (${formatCurrency(amountToPay, state.settings)}) no puede superar el saldo pendiente (${formatCurrency(metrics.balance, state.settings)}).`);
        setIsProcessingDossierAction(false);
        return;
      }

      const logId = generateUUID();
      let currentLocation = { lat: 0, lng: 0 };
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
        currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (geoErr) {
        console.warn("Could not get real GPS from dossier:", geoErr);
      }

      const log: CollectionLog = {
        id: logId,
        clientId: clientInLegajo.id,
        loanId: activeLoanInLegajo.id,
        type: type,
        amount: type === CollectionLogType.PAYMENT ? amountToPay : undefined,
        date: new Date().toISOString(),
        location: currentLocation,
        isVirtual: dossierIsVirtual,
        isRenewal: dossierIsRenewal
      };

      addCollectionAttempt(log);

      if (type === CollectionLogType.PAYMENT || type === CollectionLogType.NO_PAGO) {
        if (onForceSync) onForceSync(false);
      }

      if (type === CollectionLogType.PAYMENT) {
        const installments = activeLoanInLegajo.installments || [];

        // REGLA DE ORO: Recalcular histórico para el recibo
        const loanLogs = state.collectionLogs.filter(log => log.loanId === activeLoanInLegajo.id && log.type === CollectionLogType.PAYMENT && !log.isOpening);
        const totalPaidHistory = loanLogs.reduce((acc, log) => acc + (log.amount || 0), 0) + amountToPay;

        const progress = totalPaidHistory / (activeLoanInLegajo.installmentValue || 1);
        const paidInstCount = progress % 1 === 0 ? progress : Number(progress.toFixed(1));

        const lastDueDate = installments.length > 0 ? installments[installments.length - 1].dueDate : activeLoanInLegajo.createdAt;

        const receiptText = generateReceiptText({
          clientName: clientInLegajo.name,
          amountPaid: amountToPay,
          loanId: activeLoanInLegajo.id,
          startDate: activeLoanInLegajo.createdAt,
          expiryDate: lastDueDate,
          daysOverdue: getDaysOverdue(activeLoanInLegajo, state.settings, totalPaidHistory),
          remainingBalance: Math.max(0, activeLoanInLegajo.totalAmount - totalPaidHistory),
          paidInstallments: paidInstCount,
          totalInstallments: activeLoanInLegajo.totalInstallments,
          isRenewal: dossierIsRenewal
        }, state.settings);

        // ALWAYS SHOW MODAL (Fixes "hanging" issue by avoiding window.open fallback)
        setReceipt(receiptText);

        // Attempt Automatic Print (Silent)
        const { printText } = await import('../services/bluetoothPrinterService');
        printText(receiptText).catch(err => console.warn("Auto-print failed:", err));

        // AUTOMATIZACIÓN TOTAL: Enviar por WhatsApp automáticamente
        const phone = clientInLegajo.phone.replace(/\D/g, '');
        const wpUrl = `https://wa.me/${phone.length === 10 ? '57' + phone : phone}?text=${encodeURIComponent(receiptText)}`;
        window.open(wpUrl, '_blank');
      } else if (type === CollectionLogType.NO_PAGO) {
        let msg = clientInLegajo.customNoPayMessage || await generateNoPaymentAIReminder(activeLoanInLegajo, clientInLegajo, getDaysOverdue(activeLoanInLegajo, state.settings), state.settings);
        window.open(`https://wa.me/${clientInLegajo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e) { console.error(e); } finally {
      setIsProcessingDossierAction(false);
      setShowDossierPaymentModal(false);
    }
  };

  const handleShareLegajo = async () => {
    if (!shareCardRef.current || !clientInLegajo || !activeLoanInLegajo) return;
    setIsSharing(true);
    try {
      // 1. MANEJO DE VISIBILIDAD MANUAL PARA ASEGURAR CAPTURA
      // Html2Canvas a veces falla con elementos ocultos incluso con onclone.
      // Lo hacemos visible momentáneamente "fuera de pantalla" pero renderizable.
      const shareContainer = document.getElementById('share-container-hidden');
      let originalStyle = '';

      if (shareContainer) {
        originalStyle = shareContainer.getAttribute('style') || '';
        shareContainer.style.position = 'fixed';
        shareContainer.style.left = '0';
        shareContainer.style.top = '0';
        shareContainer.style.opacity = '0.01'; // Casi invisible
        shareContainer.style.zIndex = '-9999';
        shareContainer.style.pointerEvents = 'none';
        shareContainer.style.display = 'block';
        shareContainer.style.visibility = 'visible';
      }

      // Delay para asegurar que el navegador aplique los estilos y renderice
      await new Promise(r => setTimeout(r, 1200));

      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 4, // HD Resolution (Optimized from 8 to avoid memory issues while keeping sharpness)
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: 800,
        width: 800,
        height: shareCardRef.current.scrollHeight,
      });

      // 2. Restauramos estilo original (oculto)
      if (shareContainer) {
        shareContainer.setAttribute('style', originalStyle);
      }

      const fileName = `Estado_Cuenta_${clientInLegajo.name.replace(/\s+/g, '_')}.png`;

      // LOGICA WEB (PC / MOBILE BROWSER)
      if (!Capacitor.isNativePlatform()) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            alert("Error: No se pudo generar la imagen del reporte.");
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const file = new File([blob], fileName, { type: 'image/png' });

          let sharedSuccessfully = false;
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

          // 1. Intentar Share Nativo (SOLO MÓVILES)
          // Evitamos usar share en PC porque suele dar error o no es lo que el usuario espera en desktop
          if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `Estado de Cuenta - ${clientInLegajo.name}`
              });
              sharedSuccessfully = true;
            } catch (e) {
              console.warn("Share cancelado o fallido en móvil, usando fallback...", e);
            }
          }

          // 2. FALLBACK: Si no es móvil o si falló el compartir (PC o Mobile cancelado)
          // Ejecutamos Descarga + Visualización en pestaña
          if (!sharedSuccessfully) {
            // A. Descarga forzada
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // B. Abrir pestaña para feedback visual inmediato
            const newWindow = window.open(blobUrl, '_blank');
            if (newWindow) {
              newWindow.focus();
            } else {
              alert("¡Imagen descargada! Revisa tu carpeta de Descargas (el navegador bloqueó la ventana emergente).");
            }
          }
        }, 'image/png', 1.0);
      }
      // LOGICA CAPACITOR (APK)
      else {
        const base64Data = canvas.toDataURL('image/png', 1.0);
        const base64Content = base64Data.split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Content,
          directory: Directory.Cache
        });

        await Share.share({
          title: `Estado de Cuenta - ${clientInLegajo.name}`,
          text: `DANTE: Estado de Cuenta de ${clientInLegajo.name}`,
          files: [savedFile.uri],
          dialogTitle: 'Enviar Estado de Cuenta'
        });
      }
    } catch (e) {
      console.error("Error capture:", e);
      alert("Error al generar la imagen. Intenta cerrar y abrir el expediente.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleEditLog = (log: CollectionLog) => {
    setEditingLogId(log.id);
    setNewLogAmount(log.amount?.toString() || '');
    setShowEditLogModal(true);
  };

  const handleSaveEditedLog = () => {
    const amt = Number(newLogAmount);
    if (editingLogId && updateCollectionLog && clientInLegajo && activeLoanInLegajo) {
      const logToEdit = state.collectionLogs.find(l => l.id === editingLogId);
      if (!logToEdit) return;

      const oldAmount = logToEdit.amount || 0;
      updateCollectionLog(editingLogId, amt);

      const installments = activeLoanInLegajo.installments || [];
      const currentTotalPaid = installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0);
      const newTotalPaid = currentTotalPaid - oldAmount + amt;

      const lastDueDate = installments.length > 0 ? installments[installments.length - 1].dueDate : activeLoanInLegajo.createdAt;

      const receiptText = generateReceiptText({
        clientName: clientInLegajo.name,
        amountPaid: amt,
        loanId: activeLoanInLegajo.id,
        startDate: activeLoanInLegajo.createdAt,
        expiryDate: lastDueDate,
        daysOverdue: getDaysOverdue(activeLoanInLegajo, state.settings),
        remainingBalance: Math.max(0, activeLoanInLegajo.totalAmount - newTotalPaid),
        paidInstallments: installments.filter(i => i.status === PaymentStatus.PAID).length,
        totalInstallments: activeLoanInLegajo.totalInstallments,
        isRenewal: logToEdit.isRenewal
      }, state.settings);

      const printWin = window.open('', '_blank', 'width=400,height=600');
      printWin?.document.write(`<html><body style="font-family:monospace;white-space:pre-wrap;padding:20px;font-size:12px;">${receiptText}</body></html>`);
      printWin?.print();

      const phone = clientInLegajo.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent("*COMPROBANTE DE CORRECCIÓN*\n" + receiptText)}`, '_blank');

      setShowEditLogModal(false);
      setEditingLogId(null);
      alert("Abono corregido. Se ha generado el ticket y enviado a WhatsApp.");
    }
  };

  const handleOpenCustomNoPay = () => {
    if (!clientInLegajo) return;
    setCustomNoPayText(clientInLegajo.customNoPayMessage || '');
    setShowCustomNoPayModal(true);
  };

  const handleSaveCustomNoPay = () => {
    if (!clientInLegajo || !updateClient) return;
    updateClient({ ...clientInLegajo, customNoPayMessage: customNoPayText });
    setShowCustomNoPayModal(false);
    alert("Mensaje guardado.");
  };

  const handleReprintLastReceipt = async () => {
    if (!clientInLegajo || !activeLoanInLegajo) return;

    // 1. Encontrar el ÚLTIMO pago registrado para este crédito (SIN IMPORTAR FECHA)
    const allPaymentLogs = state.collectionLogs
      .filter(l => l.loanId === activeLoanInLegajo.id && l.type === CollectionLogType.PAYMENT && !l.isOpening);

    const lastPaymentLog = [...allPaymentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!lastPaymentLog) {
      alert("No hay pagos registrados para este crédito.");
      return;
    }

    // 2. Recalcular el estado HISTÓRICO al momento de ese pago exacto
    // Sumamos todos los pagos HASTA ese log inclusive (por fecha)
    const historicLogs = state.collectionLogs.filter(l =>
      l.loanId === activeLoanInLegajo.id &&
      l.type === CollectionLogType.PAYMENT &&
      !l.isOpening &&
      new Date(l.date).getTime() <= new Date(lastPaymentLog.date).getTime()
    );

    // Si hay logs con la misma fecha exacta, aseguramos incluir el target
    // (Ya está incluido por la lógica <=, pero si hay duplicados de timestamp, el ordenamiento previo asegura cual es cual. 
    // Aquí asumimos idempotencia simple: sumamos todo lo que tenga fecha <= al log target).

    const totalPaidAtThatMoment = historicLogs.reduce((acc, log) => acc + (log.amount || 0), 0);
    const amountPaidInLastLog = lastPaymentLog.amount || 0;

    const installments = activeLoanInLegajo.installments || [];
    const lastDueDate = installments.length > 0 ? installments[installments.length - 1].dueDate : activeLoanInLegajo.createdAt;

    const progress = totalPaidAtThatMoment / (activeLoanInLegajo.installmentValue || 1);
    const paidInstCount = progress % 1 === 0 ? progress : Number(progress.toFixed(1));

    // 3. Generar Texto
    const receiptText = generateReceiptText({
      clientName: clientInLegajo.name,
      amountPaid: amountPaidInLastLog,
      loanId: activeLoanInLegajo.id,
      startDate: activeLoanInLegajo.createdAt,
      expiryDate: lastDueDate,
      daysOverdue: getDaysOverdue(activeLoanInLegajo, state.settings, totalPaidAtThatMoment), // Mora recalculada con el total a ese momento
      remainingBalance: Math.max(0, activeLoanInLegajo.totalAmount - totalPaidAtThatMoment),
      paidInstallments: paidInstCount,
      totalInstallments: activeLoanInLegajo.totalInstallments,
      isRenewal: lastPaymentLog.isRenewal
    }, state.settings);

    // 4. Imprimir vía Bluetooth
    const { printText } = await import('../services/bluetoothPrinterService');
    try {
      await printText(receiptText);
      alert("Reimpresi\u00f3n enviada a la impresora.");
    } catch (printErr) {
      console.error("Error direct printing:", printErr);
      alert("Error: No se pudo conectar con la impresora Bluetooth.");
    }
  };

  const handleRenewLoan = () => {
    if (!clientInLegajo || !addLoan) return;

    const p = Number(renewForm.principal) || 0;
    const i = Number(renewForm.interestRate) || 0;
    const inst = Number(renewForm.installments) || 0;

    const total = calculateTotalReturn(p, i);
    const newLoan: Loan = {
      id: generateUUID(),
      clientId: clientInLegajo.id,
      collectorId: currentUserId,
      principal: p,
      interestRate: i,
      totalInstallments: inst,
      frequency: renewForm.frequency,
      totalAmount: total,
      installmentValue: inst > 0 ? total / inst : 0,
      status: LoanStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      installments: generateAmortizationTable(p, i, inst, renewForm.frequency, new Date(), state.settings.country),
      isRenewal: true
    };
    addLoan(newLoan);
    setShowRenewModal(false);
    if (onForceSync) onForceSync(false);
    alert("Cr\u00e9dito renovado exitosamente.");
  };

  const GenericCalendar = ({ startDate, customHolidays, setDate, toggleHoliday, disabled = false }: { startDate: string, customHolidays: string[], setDate: (iso: string) => void, toggleHoliday: (iso: string) => void, disabled?: boolean }) => {
    const [currentCalDate, setCurrentCalDate] = useState(new Date(startDate + 'T00:00:00'));
    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
    const month = currentCalDate.getMonth();
    const year = currentCalDate.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    const handleDayClick = (day: number) => {
      if (disabled) return;
      const date = new Date(year, month, day);
      const iso = date.toISOString().split('T')[0];
      if (startDate === iso) {
        toggleHoliday(iso);
      } else {
        setDate(iso);
      }
    };

    return (
      <div className={`bg-white border border-slate-300 rounded-2xl p-4 shadow-sm animate-fadeIn ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-[10px] font-black uppercase text-slate-900">{monthNames[month]} {year}</h5>
          <div className="flex gap-1">
            <button type="button" onClick={() => setCurrentCalDate(new Date(year, month - 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button type="button" onClick={() => setCurrentCalDate(new Date(year, month + 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="fa-solid fa-chevron-right text-[10px]"></i></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["D", "L", "M", "M", "J", "V", "S"].map(d => <div key={d} className="text-[8px] font-black text-slate-500 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const date = new Date(year, month, day);
            const iso = date.toISOString().split('T')[0];
            const isStart = startDate === iso;
            const isHoliday = customHolidays.includes(iso);
            const isSunday = date.getDay() === 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                onContextMenu={(e) => { e.preventDefault(); !disabled && toggleHoliday(iso); }}
                className={`h-10 w-full rounded-lg text-[10px] font-black flex flex-col items-center justify-center transition-all border
                  ${isStart ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-105 z-10' :
                    isHoliday ? 'bg-orange-500 text-white border-orange-400' :
                      isSunday ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-white text-slate-800 border-slate-300 hover:border-blue-400'}`}
              >
                {day}
                {isHoliday && <div className="w-1 h-1 bg-white rounded-full mt-0.5"></div>}
                {isStart && <div className="text-[6px] opacity-70">INICIO</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const PhotoUploadField = ({ label, field, value, forEdit = false, disabled = false }: { label: string, field: 'profilePic' | 'documentPic' | 'housePic' | 'businessPic', value: string, forEdit?: boolean, disabled?: boolean }) => (
    <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-50 grayscale' : ''}`}>
      <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">{label}</label>
      <div className={`relative group aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex flex-col items-center justify-center transition-all ${!disabled ? 'hover:border-blue-500 hover:bg-blue-50 cursor-pointer' : ''}`}>
        {value ? (
          <>
            <img src={value} className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar Foto</span>
              </div>
            )}
          </>
        ) : (
          <>
            <i className="fa-solid fa-camera text-slate-400 text-2xl group-hover:text-blue-500 transition-colors"></i>
            <span className="text-[7px] font-black text-slate-500 uppercase mt-2 group-hover:text-blue-600">Subir Imagen</span>
          </>
        )}
        {!disabled && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, field, forEdit)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-32 animate-fadeIn w-full px-1">
      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-1">
        <button onClick={() => setViewMode('nuevos')} className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'nuevos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-clipboard-list"></i> REGISTROS</button>
        <button onClick={() => setViewMode('gestion')} className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'gestion' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-user-plus"></i> AGREGAR</button>
        <button onClick={() => setViewMode('renovaciones')} className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'renovaciones' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-rotate"></i> RENOVACIONES</button>
        <button onClick={() => setViewMode('cartera')} className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'cartera' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-briefcase"></i> CARTERA</button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tighter flex items-center gap-3">
          <i className={`fa-solid ${viewMode === 'gestion' ? 'fa-user-plus text-emerald-600' : viewMode === 'nuevos' ? 'fa-clipboard-list text-blue-600' : viewMode === 'renovaciones' ? 'fa-arrows-rotate text-orange-500' : 'fa-briefcase text-slate-950'}`}></i>
          {viewMode === 'gestion' ? 'Añadir Cliente' : viewMode === 'nuevos' ? 'Registros de Clientes' : viewMode === 'renovaciones' ? 'Cartera Renovada' : 'Cartera General'}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {isAdminOrManager && (
            <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2 w-full sm:w-auto">
              <i className="fa-solid fa-user-astronaut text-slate-900"></i>
              <select
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700 uppercase cursor-pointer w-full"
              >
                <option value="all">TODOS</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {viewMode === 'cartera' || viewMode === 'nuevos' || viewMode === 'renovaciones' ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 shadow-inner w-full sm:w-auto">
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent text-[9px] font-black text-slate-950 outline-none uppercase w-full" />
                <span className="text-slate-500 font-bold">-</span>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent text-[9px] font-black text-slate-950 outline-none uppercase w-full" />
              </div>
            </div>
          ) : (
            <button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all"><i className="fa-solid fa-user-plus mr-2"></i> NUEVO CLIENTE</button>
          )}
        </div>
      </div>

      {viewMode === 'gestion' && (
        <div className="space-y-4">
          <div className="relative">
            <input type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Buscar por nombre o ID..." className="w-full bg-white border border-slate-300 rounded-2xl py-4 pl-12 pr-6 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-slate-950" />
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"></i>
          </div>
          <div className="px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">
              <i className="fa-solid fa-database mr-1"></i> Total: <span className="text-slate-700 font-bold">{filteredClients.length}</span> <span className="mx-2 text-slate-300">|</span> <i className="fa-solid fa-eye mr-1"></i> Viendo: <span className="text-slate-700 font-bold">{paginatedClients.length}</span>
            </div>
          </div>

          <div className="space-y-3 w-full max-w-5xl mx-auto">
            {paginatedClients.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <i className="fa-solid fa-users-slash text-slate-300 text-xl"></i>
                </div>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Lista de clientes vacía</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Cree un nuevo cliente para comenzar</p>
              </div>
            )}
            {paginatedClients.map((client) => {
              const m = getClientMetrics(client);
              return (
                <div key={client.id} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col md:flex-row items-center p-3 md:p-4 gap-3 md:gap-8 group relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0 shadow-inner">{client.profilePic ? <img src={client.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl md:text-2xl"><i className="fa-solid fa-user"></i></div>}</div>
                  <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 items-center">
                    <div><h3 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-tight truncate">{client.name}</h3><p className="text-[8px] md:text-[9px] font-bold text-slate-600 uppercase tracking-widest">ID: {client.documentId}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase mb-0.5 tracking-wider">Saldo</p><p className={`text-xs md:text-sm font-black ${m.balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(m.balance, state.settings)}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase mb-0.5 tracking-wider">Progreso</p><p className="text-xs md:text-sm font-black text-slate-800">{m.installmentsStr}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase mb-0.5 tracking-wider">Mora</p><p className={`text-xs md:text-sm font-black ${m.daysOverdue > 0 ? 'text-orange-700' : 'text-slate-500'}`}>{m.daysOverdue} Días</p></div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={() => setShowLegajo(client.id)} className="flex-1 md:flex-none px-6 py-3 bg-blue-50 text-blue-800 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100">EXPEDIENTE</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-12 h-12 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 shadow-sm active:scale-95 transition-all flex items-center justify-center"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Página <span className="text-emerald-600 text-base">{currentPage}</span> / {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-12 h-12 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 shadow-sm active:scale-95 transition-all flex items-center justify-center"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )
      }

      {/* VISTA EXCEL: NUEVOS CLIENTES */}
      {
        viewMode === 'nuevos' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Fecha Alta</th>
                    <th className="px-6 py-4">Cliente / ID</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4 text-right">Capital</th>
                    <th className="px-6 py-4 text-center">Int %</th>
                    <th className="px-6 py-4 text-right">Valor Cuota</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-[11px]">
                  {nuevosExcelData.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 uppercase text-slate-500">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '---'}</td>
                      <td className="px-6 py-4 uppercase text-slate-900">{client.name}<br /><span className="text-[8px] text-slate-400">ID: {client.documentId}</span></td>
                      <td className="px-6 py-4 text-blue-600">{client.phone}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(client._metrics.activeLoan?.principal || 0, state.settings)}</td>
                      <td className="px-6 py-4 text-center text-emerald-600">{client._metrics.activeLoan?.interestRate}%</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(client._metrics.activeLoan?.installmentValue || 0, state.settings)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setShowLegajo(client.id)} className="text-blue-500 hover:underline">VER</button>
                          {isAdminOrManager && (
                            <button onClick={() => handleToggleHideClient(client.id)} className="text-slate-400 hover:text-red-500 active:scale-90" title="Ocultar"><i className="fa-solid fa-eye-slash"></i></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {nuevosExcelData.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 uppercase tracking-widest">No hay registros para este periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* VISTA EXCEL: RENOVACIONES */}
      {
        viewMode === 'renovaciones' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Fecha Renov.</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4 text-right">Monto Renovado</th>
                    <th className="px-6 py-4 text-center">Cuotas</th>
                    <th className="px-6 py-4 text-right">Nuevo Saldo</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-[11px]">
                  {(renovacionesExcelData || []).map(item => (
                    <tr key={item._loan!.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 uppercase text-slate-500">{new Date(item._loan!.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 uppercase text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-right text-emerald-700">{formatCurrency(item._loan!.principal, state.settings)}</td>
                      <td className="px-6 py-4 text-center">{item._loan!.totalInstallments}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(item._loan!.totalAmount, state.settings)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setShowLegajo(item.id)} className="text-orange-600 hover:underline">DETALLE</button>
                          {isAdminOrManager && (
                            <button onClick={() => handleToggleHideClient(item.id)} className="text-slate-400 hover:text-red-500 active:scale-90" title="Ocultar"><i className="fa-solid fa-eye-slash"></i></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {renovacionesExcelData.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 uppercase tracking-widest">No hay renovaciones en este periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* VISTA EXCEL: CARTERA GENERAL ORDENADA POR FECHA REGISTRO */}
      {
        viewMode === 'cartera' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Registro</th>
                    <th className="px-6 py-4">Cliente / ID</th>
                    <th className="px-6 py-4">Teléfono(s)</th>
                    <th className="px-6 py-4 text-right">Saldo Actual</th>
                    <th className="px-6 py-4 text-center">Progreso</th>
                    <th className="px-6 py-4 text-center">Atraso</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-[11px]">
                  {(carteraExcelData || []).map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 uppercase">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '---'}</td>
                      <td className="px-6 py-4 uppercase text-slate-900">{client.name}<br /><span className="text-[8px] text-slate-400">DOC: {client.documentId}</span></td>
                      <td className="px-6 py-4">
                        <p className="text-blue-700">{client.phone}</p>
                        {client.secondaryPhone && <p className="text-slate-400 text-[10px]">{client.secondaryPhone}</p>}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-red-600">{formatCurrency(client._metrics.balance, state.settings)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{client._metrics.installmentsStr}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] ${client._metrics.daysOverdue > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {client._metrics.daysOverdue > 0 ? `${client._metrics.daysOverdue} d` : 'AL DÍA'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setShowLegajo(client.id)} className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90 transition-all" title="Expediente"><i className="fa-solid fa-folder-open text-[10px]"></i></button>
                          {isAdminOrManager && (
                            <button onClick={() => handleToggleHideClient(client.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" title="Ocultar Cliente"><i className="fa-solid fa-eye-slash text-[10px]"></i></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* MODAL REGISTRO CLIENTE NUEVO */}
      {
        showModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[150] p-2 overflow-hidden">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[98vh] flex flex-col animate-scaleIn border border-white/20">
              <div className="p-4 md:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-white/10 sticky top-0 z-20">
                <div><h3 className="text-base md:text-lg font-black uppercase tracking-tighter">Planilla Registro Cliente</h3><p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest">Alta de expediente y documentación fotográfica</p></div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 md:w-9 md:h-9 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>
              <form onSubmit={handleSubmitNewClient} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-6 bg-slate-50 mobile-scroll-container">
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-blue-800 uppercase tracking-widest border-l-4 border-blue-800 pl-2">I. Información Personal</h4>
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2">
                    <div className="flex border-b md:border-r border-slate-200"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Nombre</div><input required type="text" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="flex-1 px-3 py-3 text-xs font-bold bg-slate-800 text-white uppercase outline-none" /></div>
                    <div className="flex border-b border-slate-200"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Cédula</div><input required type="text" value={clientData.documentId} onChange={e => setClientData({ ...clientData, documentId: e.target.value })} className="flex-1 px-3 py-3 text-xs font-bold bg-slate-800 text-white outline-none" /></div>
                    <div className="flex border-b md:border-b-0 md:border-r border-slate-200"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">WhatsApp 1</div><input required type="tel" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="flex-1 px-3 py-3 text-xs font-bold bg-slate-800 text-white outline-none" /></div>
                    <div className="flex"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">WhatsApp 2</div><input type="tel" value={clientData.secondaryPhone} onChange={e => setClientData({ ...clientData, secondaryPhone: e.target.value })} className="flex-1 px-3 py-3 text-xs font-bold bg-slate-800 text-white outline-none" /></div>
                    <div className="flex col-span-1 md:col-span-2 border-t border-slate-200">
                      <div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Dirección</div>
                      <input required type="text" value={clientData.address} onChange={e => setClientData({ ...clientData, address: e.target.value })} className="flex-1 px-3 py-3 text-xs font-bold bg-slate-800 text-white uppercase outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="space-y-2">
                      <button type="button" onClick={() => handleCaptureLocation('home')} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2 active:scale-95 transition-all">
                        {isCapturing && capturingType === 'home' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-house-circle-check"></i>}
                        MARCAR GPS CASA
                      </button>
                      {clientData.location && (
                        <div className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[8px] font-black uppercase text-center animate-fadeIn">
                          COORD: {clientData.location.lat.toFixed(6)}, {clientData.location.lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={() => handleCaptureLocation('domicilio')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-blue-700 flex items-center justify-center gap-2 active:scale-95 transition-all">
                        {isCapturing && capturingType === 'domicilio' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-briefcase"></i>}
                        MARCAR GPS NEGOCIO
                      </button>
                      {clientData.domicilioLocation && (
                        <div className="px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[8px] font-black uppercase text-center animate-fadeIn">
                          COORD: {clientData.domicilioLocation.lat.toFixed(6)}, {clientData.domicilioLocation.lng.toFixed(6)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-4 border-slate-500 pl-2">II. Documentación Fotográfica</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                        <PhotoUploadField label="Perfil" field="profilePic" value={clientData.profilePic || ''} />
                        <PhotoUploadField label="Cédula" field="documentPic" value={clientData.documentPic || ''} />
                        <PhotoUploadField label="Fachada" field="housePic" value={clientData.housePic || ''} />
                        <PhotoUploadField label="Negocio" field="businessPic" value={clientData.businessPic || ''} />
                      </div>
                    </div>
                  </div>
                </div>

                {addInitialLoan && (
                  <div className="space-y-6">
                    <h4 className="text-[9px] font-black text-emerald-800 uppercase tracking-widest border-l-4 border-emerald-800 pl-2">IV. Configuración de Crédito y Calendario</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm grid grid-cols-2">
                          <div className="flex border-b border-r border-slate-200"><div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Capital</div><input type="text" value={initialLoan.principal} onChange={e => setInitialLoan({ ...initialLoan, principal: e.target.value })} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" /></div>
                          <div className="flex border-b border-slate-200"><div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Int. %</div><input type="text" value={initialLoan.interestRate} onChange={e => setInitialLoan(prev => ({ ...prev, interestRate: e.target.value }))} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" /></div>
                          <div className="flex border-r border-slate-200"><div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Cuotas</div><input type="text" value={initialLoan.installments} onChange={e => setInitialLoan(prev => ({ ...prev, installments: e.target.value }))} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" /></div>
                          <div className="flex"><div className="w-20 bg-slate-900 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Finaliza</div><div className="flex-1 px-3 py-3 text-[9px] font-black bg-slate-800 text-white flex items-center">{initialLoan.endDate ? formatDate(initialLoan.endDate).toUpperCase() : '---'}</div></div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Tipo de Pago / Frecuencia</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.values(Frequency).map((freq) => (
                              <button
                                key={freq}
                                type="button"
                                onClick={() => setInitialLoan((prev: any) => ({ ...prev, frequency: freq }))}
                                className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all border-2 ${initialLoan.frequency === freq ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-700 border-slate-300 active:border-emerald-200'}`}
                              >
                                {freq}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <GenericCalendar
                        startDate={initialLoan.startDate}
                        customHolidays={initialLoan.customHolidays}
                        setDate={(iso) => setInitialLoan((prev: any) => ({ ...prev, startDate: iso }))}
                        toggleHoliday={(iso) => setInitialLoan((prev: any) => prev.customHolidays.includes(iso) ? { ...prev, customHolidays: prev.customHolidays.filter((d: string) => d !== iso) } : { ...prev, customHolidays: [...prev.customHolidays, iso] })}
                      />
                    </div>
                  </div>
                )}
                <div className="pt-2 sticky bottom-0 bg-slate-50 z-10 pb-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 active:scale-95 shadow-emerald-500/20'}`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner animate-spin"></i> PROCESANDO...
                      </span>
                    ) : 'FINALIZAR REGISTRO Y CRONOGRAMA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* LEGAJO / EXPEDIENTE DEL CLIENTE */}
      {
        showLegajo && clientInLegajo && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[120] p-2 overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full md:h-[95vh] flex flex-col overflow-hidden animate-scaleIn">
              <div className="p-3 md:p-4 bg-[#0f172a] text-white shrink-0 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 border-white/10 overflow-hidden bg-white/5 shadow-xl">{clientInLegajo.profilePic && <img src={clientInLegajo.profilePic} className="w-full h-full object-cover" />}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter leading-tight truncate">{clientInLegajo.name}</h3>
                    <p className="text-[7px] md:text-[8px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 mt-0.5 truncate"><i className="fa-solid fa-location-dot"></i> {clientInLegajo.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingClient && (
                    <>
                      <button
                        disabled={isSharing}
                        onClick={handleShareLegajo}
                        className={`px-4 py-2 bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${isSharing ? 'opacity-50' : ''}`}
                      >
                        {isSharing ? <i className="fa-solid fa-spinner animate-spin text-xs"></i> : <i className="fa-brands fa-whatsapp text-xs"></i>}
                        {isSharing ? 'GENERANDO...' : 'COMPARTIR'}
                      </button>
                      {isAdminOrManager && (
                        <>
                          <button onClick={() => setActiveTab?.('settings')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 transition-all">
                            <i className="fa-solid fa-building text-xs"></i> EDITAR EMPRESA
                          </button>
                          <button onClick={handleOpenCustomNoPay} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 transition-all">
                            <i className="fa-solid fa-comment-slash text-xs"></i> EDITAR NO PAGO
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {(isAdminOrManager || clientInLegajo.allowCollectorLocationUpdate) && (
                    <button
                      onClick={isEditingClient ? () => setIsEditingClient(false) : handleStartEdit}
                      className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isEditingClient ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {isEditingClient ? 'CANCELAR' : 'EDITAR'}
                    </button>
                  )}
                  <button onClick={() => { setShowLegajo(null); setIsEditingClient(false); }} className="w-9 h-9 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-50 space-y-4 mobile-scroll-container pb-20">
                {!isEditingClient ? (
                  <>
                    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-center gap-4 animate-fadeIn">
                      <div className="flex items-center gap-2 border-r pr-4 border-slate-200">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">MAPA GPS:</span>
                        <button onClick={() => handleOpenMap(clientInLegajo.location)} className="px-4 py-2.5 bg-emerald-100 text-emerald-900 rounded-xl flex items-center gap-2 shadow-sm hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase"><i className="fa-solid fa-house"></i> CASA</button>
                        <button onClick={() => handleOpenMap(clientInLegajo.domicilioLocation)} className="px-4 py-2.5 bg-blue-100 text-blue-900 rounded-xl flex items-center gap-2 shadow-sm hover:bg-blue-600 hover:text-white transition-all font-black text-[9px] uppercase"><i className="fa-solid fa-briefcase"></i> NEGOCIO</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">CONTACTOS:</span>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => window.open(`https://wa.me/${clientInLegajo.phone.replace(/\D/g, '')}`, '_blank')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-black text-[9px] flex items-center gap-2 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            <i className="fa-brands fa-whatsapp"></i> {clientInLegajo.phone}
                          </button>
                          {clientInLegajo.secondaryPhone && (
                            <button
                              onClick={() => window.open(`https://wa.me/${clientInLegajo.secondaryPhone?.replace(/\D/g, '')}`, '_blank')}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-black text-[9px] flex items-center gap-2 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                              <i className="fa-brands fa-whatsapp"></i> {clientInLegajo.secondaryPhone}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-3 space-y-4">
                        {activeLoanInLegajo ? (
                          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden" ref={statementRef}>
                            <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center"><h4 className="text-[9px] font-black text-slate-100 uppercase tracking-widest">Resumen Cuenta</h4><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-md uppercase border border-emerald-500/30">En curso</span></div>
                            <div className="overflow-x-auto">
                              {(() => {
                                const m = getClientMetrics(clientInLegajo);
                                return (
                                  <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-slate-800 text-slate-100 font-bold text-[10px] md:text-[11px]">
                                      <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-100 font-black uppercase text-[8px] tracking-widest border-r border-slate-800 w-1/2 bg-slate-800/20">Total del Crédito</td><td className="p-3 text-right font-black text-white">{formatCurrency(activeLoanInLegajo.totalAmount, state.settings)}</td></tr>
                                      <tr className="hover:bg-emerald-900/10 transition-colors"><td className="p-3 text-emerald-400 font-black uppercase text-[8px] tracking-widest border-r border-slate-800 bg-emerald-900/5">Abonado</td><td className="p-3 text-right font-black text-emerald-400">{formatCurrency(m.totalPaid, state.settings)}</td></tr>
                                      <tr className="hover:bg-red-900/10 transition-colors"><td className="p-3 text-red-400 font-black uppercase text-[8px] tracking-widest border-r border-slate-800 bg-red-900/5">Saldo Pendiente</td><td className="p-3 text-right font-black text-red-400">{formatCurrency(m.balance, state.settings)}</td></tr>
                                      <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-100 font-black uppercase text-[8px] tracking-widest border-r border-slate-800 bg-slate-800/20">Progreso Cuotas</td><td className="p-3 text-right font-black text-white">{m.installmentsStr}</td></tr>
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-10 rounded-3xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 shadow-inner animate-fadeIn">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-4xl"><i className="fa-solid fa-money-bill-transfer"></i></div>
                            <div>
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sin Préstamos Activos</h4>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">El cliente ya liquidó o no tiene créditos registrados.</p>
                            </div>
                            <button onClick={() => setShowRenewModal(true)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center gap-3"><i className="fa-solid fa-plus-circle"></i> CARGAR NUEVO CRÉDITO</button>
                          </div>
                        )}

                        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                          <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center"><h4 className="text-[9px] font-black text-slate-100 uppercase tracking-widest">Historial Reciente</h4><i className="fa-solid fa-clock-rotate-left text-slate-400"></i></div>
                          <div className="max-h-[400px] overflow-y-auto mobile-scroll-container">
                            <table className="w-full text-[10px] border-collapse min-w-[350px]">
                              <thead className="bg-slate-800 sticky top-0 font-black text-slate-100 border-b border-slate-700 uppercase tracking-widest">
                                <tr><th className="px-4 py-3 text-left">Fecha / Hora</th><th className="px-4 py-3 text-left">Concepto</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-center">Acciones</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 font-bold">
                                {(clientHistory || []).map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-800 transition-colors">
                                    <td className="px-4 py-3"><p className="text-slate-100 font-black">{new Date(log.date).toLocaleDateString()}</p></td>
                                    <td className="px-4 py-3"><p className={`uppercase font-black text-[9px] ${log.isOpening ? 'text-emerald-400' : log.type === CollectionLogType.PAYMENT ? 'text-slate-300' : 'text-red-400'}`}>{log.isOpening ? 'Crédito Habilitado' : log.type === CollectionLogType.PAYMENT ? 'Abono Recibido' : 'Visita sin Pago'}</p></td>
                                    <td className="px-4 py-3 text-right font-black font-mono text-xs text-white">{log.amount ? formatCurrency(log.amount, state.settings) : '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                      {isAdminOrManager && (
                                        <div className="flex items-center justify-center gap-1">
                                          {log.type === CollectionLogType.PAYMENT && (
                                            <button onClick={() => handleEditLog(log)} className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-sm" title="Editar Pago"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                          )}
                                          <button onClick={() => { if (confirm('¿BORRAR ESTE PAGO DEFINITIVAMENTE? SE REVERTIRÁN LOS SALDOS.')) deleteCollectionLog?.(log.id); }} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shadow-sm" title="Borrar Pago"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* CRONOGRAMA DE PAGOS VISIBLE */}
                        {activeLoanInLegajo && (
                          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden animate-fadeIn">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                              <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Cronograma de Pagos</h4>
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{activeLoanInLegajo.installments.length} CUOTAS</span>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mobile-scroll-container bg-slate-50/30">
                              {(() => {
                                const m = getClientMetrics(clientInLegajo);
                                let remainingToAllocate = m.totalPaid;

                                return (activeLoanInLegajo.installments || []).map((inst, idx) => {
                                  const installmentAmount = inst.amount;
                                  let amountPaidForThisOne = 0;

                                  if (remainingToAllocate >= installmentAmount) {
                                    amountPaidForThisOne = installmentAmount;
                                    remainingToAllocate -= installmentAmount;
                                  } else if (remainingToAllocate > 0) {
                                    amountPaidForThisOne = remainingToAllocate;
                                    remainingToAllocate = 0;
                                  }

                                  const isPaid = amountPaidForThisOne >= installmentAmount;
                                  const isPartial = amountPaidForThisOne > 0 && amountPaidForThisOne < installmentAmount;

                                  return (
                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isPaid ? 'bg-emerald-50 border-emerald-200' : isPartial ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isPaid ? 'bg-emerald-600 text-white' : isPartial ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                          {inst.number}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className={`text-[9px] font-black uppercase ${isPaid ? 'text-emerald-700' : 'text-slate-700'}`}>
                                            {new Date(inst.dueDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace('.', '').toUpperCase()}
                                          </span>
                                          {isPartial && <span className="text-[7px] font-black text-emerald-600 uppercase">ABONO: {formatCurrency(amountPaidForThisOne, state.settings)}</span>}
                                          {isPaid && <span className="text-[7px] font-black text-emerald-700 uppercase">PAGADO</span>}
                                        </div>
                                      </div>
                                      <span className={`font-black text-xs ${isPaid ? 'text-emerald-700' : 'text-slate-900'}`}>
                                        {formatCurrency(installmentAmount, state.settings)}
                                      </span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-3">
                          <h4 className="text-[9px] font-black text-slate-800 uppercase border-b border-slate-200 pb-1.5 tracking-widest">Fotos del Expediente</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {[{ key: 'profilePic', label: 'Perfil' }, { key: 'documentPic', label: 'Cédula' }, { key: 'businessPic', label: 'Negocio' }, { key: 'housePic', label: 'Fachada' }].map((item) => (
                              <div key={item.key} className="flex flex-col items-center">
                                <div className="aspect-square w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative group">
                                  {clientInLegajo[item.key as keyof Client] ? (
                                    <img src={clientInLegajo[item.key as keyof Client] as string} className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(clientInLegajo[item.key as keyof Client] as string)} />
                                  ) : (
                                    <i className="fa-solid fa-image text-slate-400 text-xl"></i>
                                  )}
                                </div>
                                <span className="text-[7px] font-black text-slate-700 uppercase mt-1 tracking-wider">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {activeLoanInLegajo && (
                          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden flex flex-col animate-fadeIn sticky bottom-4 z-10">
                            <div className="p-4 space-y-3 flex-1 bg-gradient-to-b from-white to-emerald-50/20">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Gestión Rápida</h4>
                                {(() => { const m = getClientMetrics(clientInLegajo); return (<span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase border ${m.daysOverdue > 0 ? 'bg-red-50 text-red-800 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{m.daysOverdue > 0 ? `${m.daysOverdue} d mora` : 'Al Día'}</span>); })()}
                              </div>
                              <div className="bg-white p-3 rounded-xl space-y-2 border border-emerald-200 shadow-inner">
                                <div className="flex justify-between items-center"><p className="text-[7px] font-black text-slate-700 uppercase">Valor Cuota</p><p className="text-base font-black text-blue-800 font-mono">{formatCurrency(activeLoanInLegajo.installmentValue, state.settings)}</p></div>
                              </div>
                            </div>
                            <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 gap-2">
                              <button onClick={() => handleDossierAction(CollectionLogType.NO_PAGO)} className="py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-black text-[8px] text-red-700 uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95">No Pago</button>
                              <button onClick={handleOpenDossierPayment} className="py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95">Cobrar / Liquidar</button>
                            </div>
                            <div className="px-3 pb-3 bg-white">
                              <button onClick={() => handleReprintLastReceipt()} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2">
                                <i className="fa-solid fa-print"></i> REIMPRIMIR ÚLTIMO RECIBO
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-sm max-w-5xl mx-auto space-y-10 animate-fadeIn pb-32 mobile-scroll-container">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-3 sticky top-0 bg-white z-10">
                      <h4 className="text-lg font-black text-slate-950 uppercase tracking-tighter">Modificar Expediente Completo</h4>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-blue-800 uppercase tracking-widest border-l-4 border-blue-800 pl-2">I. Datos del Cliente</h5>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-sm">
                        <div className="flex border-b md:border-r border-slate-800"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Nombre</div><input disabled={isCollector} type="text" value={editClientFormData?.name} onChange={e => setEditClientFormData(prev => prev ? { ...prev, name: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-950 text-white uppercase outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                        <div className="flex border-b border-slate-800"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Cédula</div><input disabled={isCollector} type="text" value={editClientFormData?.documentId} onChange={e => setEditClientFormData(prev => prev ? { ...prev, documentId: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-950 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                        <div className="flex border-b md:border-b-0 md:border-r border-slate-800"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">WhatsApp 1</div><input disabled={isCollector} type="tel" value={editClientFormData?.phone} onChange={e => setEditClientFormData(prev => prev ? { ...prev, phone: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-950 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                        <div className="flex border-b md:border-b-0 border-slate-800"><div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">WhatsApp 2</div><input disabled={isCollector} type="tel" value={editClientFormData?.secondaryPhone} onChange={e => setEditClientFormData(prev => prev ? { ...prev, secondaryPhone: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-950 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                        <div className="flex col-span-1 md:col-span-2 border-t border-slate-800">
                          <div className="w-24 bg-slate-900 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Dirección</div>
                          <input disabled={isCollector} type="text" value={editClientFormData?.address} onChange={e => setEditClientFormData(prev => prev ? { ...prev, address: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-950 text-white uppercase outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-l-4 border-emerald-600 pl-2">II. Ubicación GPS</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <button type="button" onClick={() => handleCaptureLocation('home', true)} className="w-full py-3 bg-emerald-600/20 text-emerald-400 rounded-xl font-black text-[8px] uppercase tracking-widest border border-emerald-600/30 flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">
                                {isCapturing && capturingType === 'home' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-house-signal"></i>} Capturar Casa
                              </button>
                              {editClientFormData?.location && <div className="text-[7px] font-mono text-emerald-500 text-center">{editClientFormData.location.lat.toFixed(5)}, {editClientFormData.location.lng.toFixed(5)}</div>}
                            </div>
                            <div className="space-y-2">
                              <button type="button" onClick={() => handleCaptureLocation('domicilio', true)} className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl font-black text-[8px] uppercase tracking-widest border border-blue-600/30 flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all">
                                {isCapturing && capturingType === 'domicilio' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-briefcase"></i>} Capturar Negocio
                              </button>
                              {editClientFormData?.domicilioLocation && <div className="text-[7px] font-mono text-blue-500 text-center">{editClientFormData.domicilioLocation.lat.toFixed(5)}, {editClientFormData.domicilioLocation.lng.toFixed(5)}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <div
                              onClick={() => setEditClientFormData(prev => prev ? { ...prev, allowCollectorLocationUpdate: !prev.allowCollectorLocationUpdate } : null)}
                              className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${editClientFormData?.allowCollectorLocationUpdate ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editClientFormData?.allowCollectorLocationUpdate ? 'left-5' : 'left-1'}`}></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-500 uppercase">Permitir a Cobrador actualizar GPS</span>
                          </div>

                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-4 border-slate-500 pl-2">III. Documentación Fotográfica</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-900/10">
                              <PhotoUploadField label="Perfil" field="profilePic" value={editClientFormData?.profilePic || ''} forEdit={true} disabled={isCollector} />
                              <PhotoUploadField label="Cédula" field="documentPic" value={editClientFormData?.documentPic || ''} forEdit={true} disabled={isCollector} />
                              <PhotoUploadField label="Fachada" field="housePic" value={editClientFormData?.housePic || ''} forEdit={true} disabled={isCollector} />
                              <PhotoUploadField label="Negocio" field="businessPic" value={editClientFormData?.businessPic || ''} forEdit={true} disabled={isCollector} />
                            </div>
                          </div>

                        </div>

                        {isAdminOrManager && editLoanFormData && (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-l-4 border-orange-500 pl-2">IV. Editar Crédito Activo</h5>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden grid grid-cols-2">
                              <div className="flex border-b border-r border-slate-800 p-2 items-center gap-2">
                                <label className="text-[7px] font-black text-slate-500 uppercase">Monto</label>
                                <input type="text" value={editLoanFormData.principal} onChange={e => setEditLoanFormData((prev: any) => ({ ...prev, principal: e.target.value }))} className="flex-1 bg-transparent text-white font-black font-mono text-xs outline-none text-right" />
                              </div>
                              <div className="flex border-b border-slate-800 p-2 items-center gap-2">
                                <label className="text-[7px] font-black text-slate-500 uppercase">Int %</label>
                                <input type="text" value={editLoanFormData.interestRate} onChange={e => setEditLoanFormData((prev: any) => ({ ...prev, interestRate: e.target.value }))} className="flex-1 bg-transparent text-white font-black font-mono text-xs outline-none text-right" />
                              </div>
                              <div className="flex border-r border-slate-800 p-2 items-center gap-2">
                                <label className="text-[7px] font-black text-slate-500 uppercase">Cuotas</label>
                                <input type="text" value={editLoanFormData.totalInstallments} onChange={e => setEditLoanFormData((prev: any) => ({ ...prev, totalInstallments: e.target.value }))} className="flex-1 bg-transparent text-white font-black font-mono text-xs outline-none text-right" />
                              </div>
                              <div className="flex p-2 items-center gap-2">
                                <label className="text-[7px] font-black text-slate-500 uppercase">Inicio</label>
                                <input type="date" value={editLoanFormData.createdAt ? editLoanFormData.createdAt.split('T')[0] : ''} onChange={e => setEditLoanFormData((prev: any) => ({ ...prev, createdAt: e.target.value }))} className="flex-1 bg-transparent text-white font-black text-[9px] outline-none text-right uppercase" />
                              </div>
                              <div className="flex p-2 items-center gap-2 border-t border-slate-800 col-span-2">
                                <label className="text-[7px] font-black text-slate-500 uppercase">Frecuencia</label>
                                <select
                                  value={editLoanFormData.frequency}
                                  onChange={e => setEditLoanFormData((prev: any) => ({ ...prev, frequency: e.target.value }))}
                                  className="flex-1 bg-slate-900 text-white font-black text-[9px] outline-none text-right uppercase border-none focus:ring-0 cursor-pointer"
                                >
                                  {Object.values(Frequency).map(f => <option key={f} value={f} className="bg-white text-slate-800">{f}</option>)}
                                </select>
                              </div>
                            </div>
                            <p className="text-[8px] text-orange-400 italic text-center opacity-80">* Editar estos valores recalculará todo el cronograma.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 sticky bottom-0 bg-white/90 backdrop-blur-md z-10 pb-4">
                      <button onClick={handleSaveEditedClient} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        {isCollector ? 'GUARDAR UBICACIONES' : 'GUARDAR TODOS LOS CAMBIOS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div >
        )
      }

      {/* MODAL RENOVACIÓN / NUEVO CRÉDITO */}
      {
        showRenewModal && clientInLegajo && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-lg overflow-hidden animate-scaleIn border border-white/20">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tighter">Generar Nuevo Crédito</h3>
                <button onClick={() => setShowRenewModal(false)}><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="p-8 space-y-6 bg-slate-50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Capital a Prestar</label>
                      <input type="text" value={renewForm.principal} onChange={e => setRenewForm({ ...renewForm, principal: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Interés %</label>
                      <input type="text" value={renewForm.interestRate} onChange={e => setRenewForm({ ...renewForm, interestRate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Cantidad de Cuotas</label>
                    <input type="text" value={renewForm.installments} onChange={e => setRenewForm({ ...renewForm, installments: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button onClick={handleRenewLoan} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95">CONFIRMAR E INICIAR CRÉDITO</button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL COBRO / LIQUIDACIÓN DENTRO DEL EXPEDIENTE */}
      {
        showDossierPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-2 overflow-y-auto">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden animate-scaleIn border border-white/20">
              <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-base md:text-lg font-black uppercase tracking-tighter">Registrar Gestión</h3>
                <button onClick={() => setShowDossierPaymentModal(false)} className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>
              <div className="p-5 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setDossierPaymentMethod('cash')} className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all ${!dossierIsVirtual && !dossierIsRenewal ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>Efectivo</button>
                  <button onClick={() => setDossierPaymentMethod('virtual')} className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all ${dossierIsVirtual ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>Transf.</button>
                  <button onClick={() => setDossierPaymentMethod('renewal')} className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all ${dossierIsRenewal ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>Liquidar</button>
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                  <input type="text" autoFocus value={dossierPaymentAmount} onChange={(e) => setDossierPaymentAmount(e.target.value)} className="w-full pl-12 pr-5 py-8 md:py-10 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[2.5rem] text-3xl md:text-5xl font-black text-center text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-inner" />
                </div>
                <button onClick={() => handleDossierAction(CollectionLogType.PAYMENT)} disabled={isProcessingDossierAction} className="w-full py-4 md:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl md:rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-widest shadow-2xl active:scale-95 transition-all">
                  {isProcessingDossierAction ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Confirmar Registro'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL EDICIÓN LOG PAGO */}
      {
        showEditLogModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase">Corregir Pago</h3>
                <button onClick={() => setShowEditLogModal(false)}><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xl font-black">$</span>
                  <input type="text" value={newLogAmount} onChange={e => setNewLogAmount(e.target.value)} className="w-full pl-10 pr-4 py-6 text-3xl font-black text-center bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500" />
                </div>
                <button onClick={handleSaveEditedLog} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl">GUARDAR CORRECCIÓN</button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL NOTA NO PAGO */}
      {
        showCustomNoPayModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-md overflow-hidden animate-scaleIn">
              <div className="p-6 bg-amber-500 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase">Mensaje Personalizado Mora</h3>
                <button onClick={() => setShowCustomNoPayModal(false)}><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="p-8 space-y-6">
                <textarea value={customNoPayText} onChange={e => setCustomNoPayText(e.target.value)} placeholder="Ej: Hola, registramos su mora. Favor pagar mañana sin falta..." className="w-full h-32 p-4 rounded-xl border border-slate-300 font-bold outline-none focus:ring-2 focus:ring-amber-500"></textarea>
                <button onClick={handleSaveCustomNoPay} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl">GUARDAR MENSAJE</button>
              </div>
            </div>
          </div>
        )
      }
      {/* TARJETA DE ESTADO DE CUENTA PROFESIONAL (OCULTA PARA CAPTURA) */}
      <div id="share-container-hidden" style={{ position: 'fixed', left: '-5000px', top: '0', opacity: '0', pointerEvents: 'none', zIndex: -1 }}>
        <div ref={shareCardRef} className="w-[800px] bg-white text-slate-900 font-sans relative" style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
          {/* HEADER */}
          <div className="bg-[#1e293b] p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-[#10b981] rounded-2xl flex items-center justify-center text-5xl text-white shadow-lg overflow-hidden">
                <i className="fa-solid fa-sack-dollar"></i>
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">{state.settings.companyAlias || state.settings.companyName || 'DANTE'}</h1>
                <div className="flex flex-col">
                  <p className="text-[#10b981] text-sm font-black uppercase tracking-[0.2em] mt-1">Estado de Cuenta Oficial</p>
                  {state.settings.companyIdentifier && <p className="text-slate-400 text-[10px] font-bold tracking-widest">{state.settings.companyIdentifier}</p>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">FECHA DE CORTE</p>
              <p className="text-xl font-black text-white uppercase">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
            </div>
          </div>

          <div className="bg-white p-10 space-y-10">
            {/* CLIENT INFO AND ALIAS */}
            <div className="flex justify-between items-start">
              <div className="space-y-4 max-w-[450px]">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TITULAR DEL CRÉDITO</p>
                  <h2 className="text-5xl font-black text-[#1e293b] uppercase leading-[1] tracking-tighter break-words">
                    {clientInLegajo?.name}
                  </h2>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-2">REF: {clientInLegajo?.id.toUpperCase()}</p>
                </div>
                <div className="flex gap-4">
                  <span className="px-4 py-1.5 bg-[#dcfce7] text-[#166534] text-[10px] font-black rounded-full uppercase tracking-widest border border-[#bbf7d0]">ESTADO: ACTIVO</span>
                </div>
              </div>

              <div className="bg-[#1e293b] text-white px-8 py-8 rounded-[2.5rem] shadow-xl text-center min-w-[320px]">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{state.settings.shareLabel || 'ALIAS DE LA EMPRESA'}</p>
                <p className="text-4xl font-black tracking-tight">{state.settings.shareValue || formatCurrency(activeLoanInLegajo?.totalAmount || 0, state.settings)}</p>
              </div>
            </div>

            {/* METRICS CARDS */}
            {activeLoanInLegajo && (() => {
              const m = getClientMetrics(clientInLegajo!);
              return (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL PRESTADO</p>
                    <p className="text-3xl font-black text-[#1e293b]">{formatCurrency(activeLoanInLegajo.totalAmount, state.settings)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ABONADO</p>
                    <p className="text-3xl font-black text-[#10b981]">{formatCurrency(m.totalPaid, state.settings)}</p>
                  </div>
                  <div className="bg-[#1e293b] p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SALDO ACTUAL</p>
                    <p className="text-3xl font-black text-white">{formatCurrency(m.balance, state.settings)}</p>
                  </div>
                </div>
              );
            })()}

            {/* INSTALLMENTS GRID */}
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b-2 border-slate-100 pb-2">
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest font-sans">DETALLE DE CUOTAS</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRECUENCIA: {activeLoanInLegajo?.frequency || '---'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(() => {
                  const m = getClientMetrics(clientInLegajo!);
                  let remainingToAllocate = m.totalPaid;

                  return (activeLoanInLegajo?.installments || []).map((inst, idx) => {

                    const installmentAmount = inst.amount;
                    let amountPaidForThisOne = 0;

                    if (remainingToAllocate >= installmentAmount) {
                      amountPaidForThisOne = installmentAmount;
                      remainingToAllocate -= installmentAmount;
                    } else if (remainingToAllocate > 0) {
                      amountPaidForThisOne = remainingToAllocate;
                      remainingToAllocate = 0;
                    }

                    const isPaid = amountPaidForThisOne >= installmentAmount;
                    const isPartial = amountPaidForThisOne > 0 && amountPaidForThisOne < installmentAmount;
                    const pendingAmount = installmentAmount - amountPaidForThisOne;

                    return (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-[2rem] border-2 ${isPaid ? 'bg-[#f0fdf4] border-[#bbf7d0]' : isPartial ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isPaid ? 'bg-[#22c55e] text-white shadow-md' : isPartial ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-300'}`}>
                            {inst.number}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[13px] font-black uppercase ${isPaid ? 'text-[#15803d]' : 'text-[#1e293b]'}`}>
                              {new Date(inst.dueDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace('.', '').toUpperCase()}
                            </span>
                            {isPaid && <span className="text-[10px] font-black text-[#15803d] uppercase tracking-widest mt-0.5">PAGADO TOTAL</span>}
                            {!isPaid && !isPartial && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">PENDIENTE</span>}
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          {isPartial && (
                            <span className="text-[11px] font-black text-emerald-600 uppercase leading-none mb-1">ABONADO: {formatCurrency(amountPaidForThisOne, state.settings)}</span>
                          )}

                          <span className={`font-black text-xl leading-none ${isPaid ? 'text-[#166534]' : 'text-[#1e293b]'}`}>
                            {formatCurrency(installmentAmount, state.settings)}
                          </span>

                          {isPartial && (
                            <span className="text-[11px] font-black text-red-600 uppercase leading-none mt-1">FALTA: {formatCurrency(pendingAmount, state.settings)}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* FOOTER - PILL DESIGN */}
          <div className="bg-white p-10 pt-4 flex justify-center">
            <div className="w-full bg-[#f0fdf4] rounded-full py-6 px-12 flex justify-between items-center border border-[#dcfce7] shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-[#10b981] rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
                  <i className="fa-brands fa-whatsapp"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#166534] uppercase tracking-widest">SOPORTE DIRECTO</p>
                  <p className="text-4xl font-black text-[#1e293b] tracking-tight leading-none">{state.settings.contactPhone || '0981874120'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-300 uppercase leading-none mb-1">{state.settings.companyAlias || 'DANTE'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GENERADO AUTOMÁTICAMENTE</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {
        receipt && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[210] p-4 overflow-y-auto">
            <div className="bg-white rounded-[2rem] text-center max-w-sm w-full animate-scaleIn shadow-2xl overflow-hidden">
              {/* Header de navegación en el ticket */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 italic bg-white sticky top-0">
                <button onClick={() => setReceipt(null)} className="text-slate-400 hover:text-slate-600 transition-all active:scale-90">
                  <i className="fa-solid fa-arrow-left text-lg"></i>
                </button>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vista de Comprobante</span>
                <button onClick={() => setReceipt(null)} className="text-slate-400 hover:text-red-500 transition-all active:scale-90">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <div className="p-6 md:p-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-xl border border-green-200">
                  <i className="fa-solid fa-check-double"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">¡Gestión Exitosa!</h3>
                <div className="bg-slate-50 p-4 md:p-6 rounded-xl md:rounded-2xl font-mono text-[9px] md:text-[10px] text-left mb-8 max-h-60 overflow-y-auto border border-slate-200 text-black font-black shadow-inner whitespace-pre-wrap leading-relaxed">
                  {receipt}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setReceipt(null)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">
                    Finalizar y Salir
                  </button>
                  <button
                    onClick={async () => {
                      const { printText } = await import('../services/bluetoothPrinterService');
                      printText(receipt || '').catch(e => alert("Error impresi\u00f3n: " + e));
                    }}
                    className="w-full py-4 bg-purple-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    <i className="fa-solid fa-print mr-2"></i> Re-Imprimir Ticket
                  </button>
                  <button
                    onClick={() => {
                      const phone = clientInLegajo?.phone.replace(/\D/g, '') || '';
                      const wpUrl = `https://wa.me/${phone.length === 10 ? '57' + phone : phone}?text=${encodeURIComponent(receipt || '')}`;
                      window.open(wpUrl, '_blank');
                    }}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    <i className="fa-brands fa-whatsapp mr-2"></i> Enviar por WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Clients;
