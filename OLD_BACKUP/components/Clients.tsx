
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Client, AppState, Loan, Frequency, LoanStatus, CollectionLog, CollectionLogType, Role, PaymentStatus, User } from '../types';
import { formatCurrency, calculateTotalReturn, generateAmortizationTable, formatDate, generateReceiptText, getDaysOverdue, getLocalDateStringForCountry } from '../utils/helpers';
import { getTranslation } from '../utils/translations';
import { generateNoPaymentAIReminder } from '../services/geminiService';
import html2canvas from 'html2canvas';

interface ClientsProps {
  state: AppState;
  addClient: (client: Client, loan?: Loan) => void;
  addLoan?: (loan: Loan) => void;
  updateClient?: (client: Client) => void;
  updateLoan?: (loan: Loan) => void;
  deleteCollectionLog?: (logId: string) => void;
  updateCollectionLog?: (logId: string, newAmount: number) => void;
  updateCollectionLogNotes?: (logId: string, notes: string) => void;
  addCollectionAttempt?: (log: CollectionLog) => void;
  deleteClient?: (clientId: string) => void;
  globalState?: AppState;
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

const Clients: React.FC<ClientsProps> = ({ state, addClient, addLoan, updateClient, updateLoan, deleteCollectionLog, updateCollectionLog, updateCollectionLogNotes, addCollectionAttempt, deleteClient, globalState }) => {
  // SAFEGUARD: Ensure settings exist
  const countrySettings = state?.settings?.country || 'CO';
  const countryTodayStr = getLocalDateStringForCountry(countrySettings);

  const [viewMode, setViewMode] = useState<'gestion' | 'nuevos' | 'renovaciones' | 'cartera' | 'ocultos'>('gestion');
  const [filterStartDate, setFilterStartDate] = useState(countryTodayStr);
  const [filterEndDate, setFilterEndDate] = useState(countryTodayStr);

  const [showModal, setShowModal] = useState(false);
  const [showLegajo, setShowLegajo] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // --- PRINTER LOGIC ---
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printerDevices, setPrinterDevices] = useState<any[]>([]);
  const [scanningPrinters, setScanningPrinters] = useState(false);

  const handleOpenPrinterConfig = () => {
    setShowPrinterModal(true);
    handleScanPrinters();
  };

  const handleScanPrinters = async () => {
    setScanningPrinters(true);
    try {
      const { listBondedDevices, checkBluetoothEnabled, enableBluetooth } = await import('../services/bluetoothPrinterService');

      const enabled = await checkBluetoothEnabled();
      if (!enabled) {
        const success = await enableBluetooth();
        if (!success) {
          alert("Es necesario activar el Bluetooth para buscar impresoras.");
          setScanningPrinters(false);
          return;
        }
      }

      const devices = await listBondedDevices();
      setPrinterDevices(devices);
      if (devices.length === 0) {
        alert("No se encontraron dispositivos VINCULADOS. Por favor ve a Ajustes de Android > Bluetooth y vincula tu impresora primero.");
      }
    } catch (e) {
      console.error(e);
      alert("Error buscando impresoras. Asegúrate de estar en la App Android.");
    } finally {
      setScanningPrinters(false);
    }
  };

  const handleSelectPrinter = async (device: any) => {
    try {
      const { connectToPrinter } = await import('../services/bluetoothPrinterService');
      const connected = await connectToPrinter(device.id);
      if (connected) {
        alert(`Conectado a ${device.name}`);
        setShowPrinterModal(false);
      }
    } catch (e) {
      alert("Error al conectar: " + e);
    }
  };

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    principal: 500000,
    interestRate: 20,
    installments: 20,
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
  const [editLoanFormData, setEditLoanFormData] = useState<Loan | null>(null);

  const [initialLoan, setInitialLoan] = useState({
    principal: 0,
    interestRate: 0,
    installments: 0,
    frequency: Frequency.DAILY,
    startDate: countryTodayStr,
    endDate: '',
    customHolidays: [] as string[]
  });

  useEffect(() => {
    if (showModal) {
      const table = generateAmortizationTable(
        initialLoan.principal,
        initialLoan.interestRate,
        initialLoan.installments,
        initialLoan.frequency,
        new Date(initialLoan.startDate + 'T00:00:00'),
        state.settings.country,
        initialLoan.customHolidays
      );
      if (table.length > 0) {
        const lastDate = table[table.length - 1].dueDate.split('T')[0];
        setInitialLoan(prev => ({ ...prev, endDate: lastDate }));
      }
    }
  }, [initialLoan.startDate, initialLoan.installments, initialLoan.frequency, initialLoan.customHolidays, showModal, state.settings.country]);

  useEffect(() => {
    if (isEditingClient && editLoanFormData) {
      const startDateTime = new Date(editLoanFormData.createdAt);
      const table = generateAmortizationTable(
        editLoanFormData.principal,
        editLoanFormData.interestRate,
        editLoanFormData.totalInstallments,
        editLoanFormData.frequency,
        startDateTime,
        state.settings.country,
        editLoanFormData.customHolidays || []
      );

      const totalAmount = calculateTotalReturn(editLoanFormData.principal, editLoanFormData.interestRate);
      const installmentValue = totalAmount / editLoanFormData.totalInstallments;

      const updatedInstallments = table.map(newInst => {
        const existing = editLoanFormData.installments.find(e => e.number === newInst.number);
        if (existing) {
          return { ...newInst, paidAmount: existing.paidAmount, status: existing.status };
        }
        return newInst;
      });

      const hasChanges =
        JSON.stringify(updatedInstallments) !== JSON.stringify(editLoanFormData.installments) ||
        Math.abs(editLoanFormData.totalAmount - totalAmount) > 0.01;

      if (hasChanges) {
        setEditLoanFormData(prev => prev ? {
          ...prev,
          totalAmount: totalAmount,
          installmentValue: installmentValue,
          installments: updatedInstallments
        } : null);
      }
    }
  }, [
    editLoanFormData?.createdAt,
    editLoanFormData?.customHolidays,
    editLoanFormData?.principal,
    editLoanFormData?.interestRate,
    editLoanFormData?.totalInstallments,
    isEditingClient,
    state.settings.country
  ]);

  const [showDossierPaymentModal, setShowDossierPaymentModal] = useState(false);
  const [dossierPaymentAmount, setDossierPaymentAmount] = useState<number>(0);
  const [dossierIsVirtual, setDossierIsVirtual] = useState(false);
  const [dossierIsRenewal, setDossierIsRenewal] = useState(false);
  const [isProcessingDossierAction, setIsProcessingDossierAction] = useState(false);

  const [showEditLogModal, setShowEditLogModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newLogAmount, setNewLogAmount] = useState<number>(0);

  const [showCustomNoPayModal, setShowCustomNoPayModal] = useState(false);
  const [customNoPayText, setCustomNoPayText] = useState('');

  const [addInitialLoan, setAddInitialLoan] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturingType, setCapturingType] = useState<'home' | 'domicilio' | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);

  const isAdmin = state.currentUser?.role === Role.ADMIN;
  const isManager = state.currentUser?.role === Role.MANAGER;
  const isAdminOrManager = isAdmin || isManager;
  const isCollector = state.currentUser?.role === Role.COLLECTOR;
  const currentUserId = state.currentUser?.id;

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

  const filteredClients = useMemo(() => {
    let clients = (state.clients || []).filter(c => !!c); // SAFEGUARD

    if (state.currentUser?.role === Role.MANAGER) {
      const managerId = state.currentUser.id;
      const myCollectorIds = state.users.filter(u => u.managedBy === managerId).map(u => u.id);

      clients = clients.filter(client => {
        const addedByMeOrMine = client.addedBy === managerId || (client.addedBy && myCollectorIds.includes(client.addedBy));
        const activeLoan = state.loans.find(l => l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        const loanManagedByMe = activeLoan && (activeLoan.collectorId === managerId || (activeLoan.collectorId && myCollectorIds.includes(activeLoan.collectorId)));
        return addedByMeOrMine || loanManagedByMe;
      });
    }

    if (state.currentUser?.role === Role.ADMIN) {
      clients = clients.filter(client => {
        const addedByUser = state.users.find(u => u.id === client.addedBy);
        if (!addedByUser) return true;
        if (addedByUser.role === Role.MANAGER) return false;
        if (addedByUser.managedBy) {
          const manager = state.users.find(u => u.id === addedByUser.managedBy);
          if (manager && manager.role === Role.MANAGER) return false;
        }
        return true;
      });
    }

    if (globalSearch) {
      const s = globalSearch.toLowerCase();
      clients = clients.filter(c => (c.name || '').toLowerCase().includes(s) || (c.documentId || '').includes(s));
    }
    if (viewMode === 'gestion') {
      clients = clients.filter(c => c.isActive !== false);
    }
    return clients;
  }, [state.clients, state.loans, globalSearch, state.currentUser, state.users, viewMode]);

  const newCreditsData = useMemo(() => {
    if (viewMode !== 'nuevos') return [];
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');
    let filtered = state.loans.filter(loan => {
      if (loan.isRenewal) return false;
      const created = new Date(loan.createdAt);
      return created >= start && created <= end;
    });
    if (state.currentUser?.role === Role.MANAGER) {
      const managerId = state.currentUser.id;
      const myCollectorIds = state.users.filter(u => u.managedBy === managerId).map(u => u.id);
      filtered = filtered.filter(loan => {
        return loan.collectorId === managerId || (loan.collectorId && myCollectorIds.includes(loan.collectorId));
      });
    }
    if (state.currentUser?.role === Role.ADMIN) {
      filtered = filtered.filter(loan => {
        const collector = state.users.find(u => u.id === loan.collectorId);
        if (!collector) return true;
        if (collector.role === Role.MANAGER) return false;
        if (collector.managedBy) {
          const manager = state.users.find(u => u.id === collector.managedBy);
          if (manager && manager.role === Role.MANAGER) return false;
        }
        return true;
      });
    }
    filtered = filtered.filter(loan => {
      const client = state.clients.find(c => c.id === loan.clientId);
      return client && client.isActive !== false;
    });
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.loans, state.clients, viewMode, filterStartDate, filterEndDate, state.currentUser, state.users]);

  const renewedCreditsData = useMemo(() => {
    if (viewMode !== 'renovaciones') return [];
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');
    let filtered = state.loans.filter(loan => {
      if (!loan.isRenewal) return false;
      const created = new Date(loan.createdAt);
      return created >= start && created <= end;
    });
    if (state.currentUser?.role === Role.MANAGER) {
      const managerId = state.currentUser.id;
      const myCollectorIds = state.users.filter(u => u.managedBy === managerId).map(u => u.id);
      filtered = filtered.filter(loan => {
        return loan.collectorId === managerId || (loan.collectorId && myCollectorIds.includes(loan.collectorId));
      });
    }
    if (state.currentUser?.role === Role.ADMIN) {
      filtered = filtered.filter(loan => {
        const collector = state.users.find(u => u.id === loan.collectorId);
        if (!collector) return true;
        if (collector.role === Role.MANAGER) return false;
        if (collector.managedBy) {
          const manager = state.users.find(u => u.id === collector.managedBy);
          if (manager && manager.role === Role.MANAGER) return false;
        }
        return true;
      });
    }
    filtered = filtered.filter(loan => {
      const client = state.clients.find(c => c.id === loan.clientId);
      return client && client.isActive !== false;
    });
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.loans, state.clients, viewMode, filterStartDate, filterEndDate, state.currentUser, state.users]);
  const getClientMetrics = (client: Client) => {
    if (!client || !state.loans) return { balance: 0, installmentsStr: '0/0', daysOverdue: 0, activeLoan: undefined, totalPaid: 0, lastExpiryDate: '', createdAt: '' };
    const activeLoan = state.loans.find(l => l && l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
    let balance = 0, installmentsStr = '0/0', daysOverdue = 0, totalPaid = 0, lastExpiryDate = '', createdAt = '';
    if (activeLoan) {
      totalPaid = (activeLoan.installments || []).reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      balance = (activeLoan.totalAmount || 0) - totalPaid;
      installmentsStr = `${(activeLoan.installments || []).filter(i => i.status === PaymentStatus.PAID).length} / ${activeLoan.totalInstallments || 0}`;
      lastExpiryDate = activeLoan.installments[activeLoan.installments.length - 1]?.dueDate || '';
      daysOverdue = getDaysOverdue(activeLoan);
      createdAt = activeLoan.createdAt;
    }
    return { balance, installmentsStr, daysOverdue, activeLoan, totalPaid, lastExpiryDate, createdAt };
  };

  const carteraGeneralData = useMemo(() => {
    if (viewMode !== 'cartera' && viewMode !== 'ocultos') return [];

    // SAFEGUARD: Filter out any undefined/null clients causing crashes
    let filteredMembers = (state.clients || []).filter(c => !!c);

    // Filter by viewMode: if 'ocultos', show only hidden. If 'cartera', show only visible.
    if (viewMode === 'ocultos') {
      filteredMembers = filteredMembers.filter(c => c.isActive === false);
    } else {
      filteredMembers = filteredMembers.filter(c => c.isActive !== false);
    }

    if (state.currentUser?.role === Role.MANAGER) {
      const managerId = state.currentUser.id;
      const myCollectorIds = state.users.filter(u => u.managedBy === managerId).map(u => u.id);

      filteredMembers = filteredMembers.filter(client => {
        // Ver si el cliente fue agregado por el gerente o uno de sus cobradores
        // O si tiene un préstamo activo con uno de ellos (por si acaso addedBy no está set)
        const addedByMeOrMine = client.addedBy === managerId || (client.addedBy && myCollectorIds.includes(client.addedBy));

        const activeLoan = state.loans.find(l => l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        const loanManagedByMe = activeLoan && (activeLoan.collectorId === managerId || (activeLoan.collectorId && myCollectorIds.includes(activeLoan.collectorId)));

        return addedByMeOrMine || loanManagedByMe;
      });
    }

    // EXCLUIR CLIENTES DE GERENTES PARA EL ADMIN
    if (state.currentUser?.role === Role.ADMIN) {
      filteredMembers = filteredMembers.filter(client => {
        const addedByUser = state.users.find(u => u.id === client.addedBy);
        // Validamos también por el cobrador del préstamo activo si addedBy no es definitivo
        const activeLoan = state.loans.find(l => l.clientId === client.id && (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DEFAULT));
        const collector = activeLoan ? state.users.find(u => u.id === activeLoan.collectorId) : null;

        // Check 1: AddedBy
        if (addedByUser) {
          if (addedByUser.role === Role.MANAGER) return false;
          if (addedByUser.managedBy) {
            const manager = state.users.find(u => u.id === addedByUser.managedBy);
            if (manager && manager.role === Role.MANAGER) return false;
          }
        }

        // Check 2: Active Loan Collector
        if (collector) {
          if (collector.role === Role.MANAGER) return false;
          if (collector.managedBy) {
            const manager = state.users.find(u => u.id === collector.managedBy);
            if (manager && manager.role === Role.MANAGER) return false;
          }
        }

        return true;
      });
    }

    return filteredMembers.map(client => {
      const metrics = getClientMetrics(client);
      return { ...client, _metrics: metrics };
    }).sort((a, b) => a._metrics.daysOverdue - b._metrics.daysOverdue); // Menor mora primero
  }, [state.clients, state.loans, viewMode, state.currentUser, state.users]);

  const handleOpenMap = (loc?: { lat: number, lng: number }) => {
    if (loc && loc.lat && loc.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
      window.open(url, '_blank');
    } else {
      alert("Sin coordenadas capturadas para este punto.");
    }
  };

  const handleSubmitNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clientId = Math.random().toString(36).substr(2, 9);
      const client: Client = { ...clientData, id: clientId, addedBy: currentUserId, isActive: true };
      let loan: Loan | undefined;

      if (addInitialLoan) {
        const baseDateStr = initialLoan.startDate || countryTodayStr;
        const startDateTime = new Date(baseDateStr + 'T00:00:00');
        const validStartDate = isNaN(startDateTime.getTime()) ? new Date() : startDateTime;
        const total = calculateTotalReturn(initialLoan.principal, initialLoan.interestRate);
        loan = {
          id: Math.random().toString(36).substr(2, 9),
          clientId,
          collectorId: currentUserId,
          principal: initialLoan.principal,
          interestRate: initialLoan.interestRate,
          totalInstallments: initialLoan.installments,
          frequency: initialLoan.frequency,
          totalAmount: total,
          installmentValue: total / initialLoan.installments,
          status: LoanStatus.ACTIVE,
          createdAt: validStartDate.toISOString(),
          customHolidays: initialLoan.customHolidays,
          installments: generateAmortizationTable(initialLoan.principal, initialLoan.interestRate, initialLoan.installments, initialLoan.frequency, validStartDate, state.settings.country, initialLoan.customHolidays)
        };
      }
      addClient(client, loan);
      setShowModal(false);
      setClientData({ id: '', documentId: '', name: '', phone: '', secondaryPhone: '', address: '', creditLimit: 1000000, location: undefined, domicilioLocation: undefined, profilePic: '', housePic: '', businessPic: '', documentPic: '', allowCollectorLocationUpdate: false, isActive: true });
    } catch (error) { alert("Error al crear el cliente."); }
  };

  const handleCaptureLocation = async (type: 'home' | 'domicilio', forEdit: boolean = false) => {
    setIsCapturing(true);
    setCapturingType(type);

    try {
      const { getCurrentLocation } = await import('../services/locationService');
      const location = await getCurrentLocation();

      if (!location) {
        throw new Error('No se pudo obtener la ubicación');
      }

      const newLoc = { lat: location.lat, lng: location.lng };

      if (forEdit && editClientFormData) {
        setEditClientFormData(prev => prev ? { ...prev, [type === 'home' ? 'location' : 'domicilioLocation']: newLoc } : null);
      } else {
        setClientData(prev => ({ ...prev, [type === 'home' ? 'location' : 'domicilioLocation']: newLoc }));
      }

      setIsCapturing(false);
      setCapturingType(null);
      alert('✅ Ubicación capturada correctamente');
    } catch (error: any) {
      setIsCapturing(false);
      setCapturingType(null);
      alert(error.message || 'Error al capturar ubicación');
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
        updateLoan(editLoanFormData);
      }
      setIsEditingClient(false);
      alert("Expediente y Crédito actualizados.");
    }
  };

  const handleOpenDossierPayment = () => {
    if (!activeLoanInLegajo) return;
    setDossierPaymentAmount(activeLoanInLegajo.installmentValue);
    setDossierIsVirtual(false);
    setDossierIsRenewal(false);
    setShowDossierPaymentModal(true);
  };

  const setDossierPaymentMethod = (method: 'cash' | 'virtual' | 'renewal') => {
    setDossierIsVirtual(method === 'virtual');
    setDossierIsRenewal(method === 'renewal');
    if (method === 'renewal' && activeLoanInLegajo) {
      const tPaid = activeLoanInLegajo.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      setDossierPaymentAmount(Math.max(0, activeLoanInLegajo.totalAmount - tPaid));
    } else if (activeLoanInLegajo) {
      setDossierPaymentAmount(activeLoanInLegajo.installmentValue);
    }
  };

  const handleDossierAction = async (type: CollectionLogType, customAmount?: number) => {
    if (isProcessingDossierAction || !clientInLegajo || !activeLoanInLegajo || !addCollectionAttempt) return;
    setIsProcessingDossierAction(true);
    try {
      // Intentar capturar ubicación en el momento del "tikeo"
      let currentLocation = { lat: 0, lng: 0 };
      try {
        const { getCurrentLocation } = await import('../services/locationService');
        const loc = await getCurrentLocation();
        if (loc) currentLocation = loc;
      } catch (err) {
        console.warn("No se pudo obtener ubicación para el log:", err);
        // Continuamos sin ubicación (0,0) para no bloquear el cobro
      }

      const amountToPay = customAmount || dossierPaymentAmount;
      const logId = Math.random().toString(36).substr(2, 9);
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

      if (type === CollectionLogType.PAYMENT) {
        const totalPaidOnLoan = activeLoanInLegajo.installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0) + amountToPay;
        const receiptText = generateReceiptText({
          clientName: clientInLegajo.name,
          amountPaid: amountToPay,
          loanId: activeLoanInLegajo.id,
          startDate: activeLoanInLegajo.createdAt,
          expiryDate: activeLoanInLegajo.installments[activeLoanInLegajo.installments.length - 1].dueDate,
          daysOverdue: getDaysOverdue(activeLoanInLegajo),
          remainingBalance: Math.max(0, activeLoanInLegajo.totalAmount - totalPaidOnLoan),
          paidInstallments: activeLoanInLegajo.installments.filter(i => i.status === PaymentStatus.PAID).length + 1,
          totalInstallments: activeLoanInLegajo.totalInstallments,
          isRenewal: dossierIsRenewal
        }, state.settings);

        // Intentar imprimir por Bluetooth (Failsafe)
        try {
          const { printText, isPrinterConnected, connectToPrinter } = await import('../services/bluetoothPrinterService');

          // Intentar conexión si no existe
          if (!isPrinterConnected()) {
            // Pequeño timeout para no bloquear UI
            await new Promise(resolve => setTimeout(resolve, 100));
            try { await connectToPrinter(); } catch (err) { console.warn("No se pudo autoconectar impresora", err); }
          }

          if (isPrinterConnected()) {
            await printText(receiptText);
          } else {
            console.log("Impresora no conectada, omitiendo impresión ticket fisico.");
            // No lanzar error para no interrumpir flujo, simplemente no se imprime
          }
        } catch (e) {
          console.warn("Error en módulo de impresión (omitido):", e);
          // El pago YA ESTÁ REGISTRADO arriba (addCollectionAttempt).
          // No hacemos fallback con window.open para evitar popups molestos en el APK.
        }

        const phone = clientInLegajo.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(receiptText)}`, '_blank');
      } else if (type === CollectionLogType.NO_PAGO) {
        let msg = clientInLegajo.customNoPayMessage || await generateNoPaymentAIReminder(activeLoanInLegajo, clientInLegajo, getDaysOverdue(activeLoanInLegajo), state.settings);
        window.open(`https://wa.me/${clientInLegajo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e: any) {
      console.error(e);
      alert("ERROR CRITICO AL REGISTRAR PAGO: " + (e.message || e));
    } finally {
      setIsProcessingDossierAction(false);
      setShowDossierPaymentModal(false);
    }
  };

  const handleSharePNG = async () => {
    if (!shareCardRef.current || !clientInLegajo || !activeLoanInLegajo) return;
    setIsSharing(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const canvas = await html2canvas(shareCardRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false, width: 800 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `Estado_Cuenta_${clientInLegajo.name.replace(/\s+/g, '_')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Estado de Cuenta - ${clientInLegajo.name}` });
        } else {
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click();
        }
      }, 'image/png');
    } catch (e) { console.error(e); } finally { setIsSharing(false); }
  };

  const handleEditLog = (log: CollectionLog) => {
    setEditingLogId(log.id);
    setNewLogAmount(log.amount || 0);
    setShowEditLogModal(true);
  };

  const handleSaveEditedLog = async () => {
    if (editingLogId && updateCollectionLog && clientInLegajo && activeLoanInLegajo) {
      const logToEdit = state.collectionLogs.find(l => l.id === editingLogId);
      if (!logToEdit) return;

      const oldAmount = logToEdit.amount || 0;
      updateCollectionLog(editingLogId, newLogAmount);

      // Generar ticket para la corrección (Calculo del nuevo saldo proyectado)
      const currentTotalPaid = activeLoanInLegajo.installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0);
      const newTotalPaid = currentTotalPaid - oldAmount + newLogAmount;

      const receiptText = generateReceiptText({
        clientName: clientInLegajo.name,
        amountPaid: newLogAmount,
        loanId: activeLoanInLegajo.id,
        startDate: activeLoanInLegajo.createdAt,
        expiryDate: activeLoanInLegajo.installments[activeLoanInLegajo.installments.length - 1].dueDate,
        daysOverdue: getDaysOverdue(activeLoanInLegajo),
        remainingBalance: Math.max(0, activeLoanInLegajo.totalAmount - newTotalPaid),
        paidInstallments: activeLoanInLegajo.installments.filter(i => i.status === PaymentStatus.PAID).length,
        totalInstallments: activeLoanInLegajo.totalInstallments,
        isRenewal: logToEdit.isRenewal
      }, state.settings);

      // Soporte de Impresión (Bluetooth o Normal) - SILENT FAILSAFE
      try {
        const { printText, isPrinterConnected, connectToPrinter } = await import('../services/bluetoothPrinterService');

        if (!isPrinterConnected()) {
          try { await connectToPrinter(); } catch (err) { console.warn("No se pudo autoconectar (EditLog)", err); }
        }

        if (isPrinterConnected()) {
          await printText(receiptText);
        }
      } catch (e) {
        console.warn("No se pudo imprimir el ticket de corrección (omitido)", e);
        // Continuamos sin error
      }

      // Notificación WhatsApp
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

  const handleRenewLoan = () => {
    if (!clientInLegajo || !addLoan) return;
    const total = calculateTotalReturn(renewForm.principal, renewForm.interestRate);
    const newLoan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: clientInLegajo.id,
      collectorId: currentUserId,
      principal: renewForm.principal,
      interestRate: renewForm.interestRate,
      totalInstallments: renewForm.installments,
      frequency: renewForm.frequency,
      totalAmount: total,
      installmentValue: total / renewForm.installments,
      status: LoanStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      installments: generateAmortizationTable(renewForm.principal, renewForm.interestRate, renewForm.installments, renewForm.frequency, new Date(), state.settings.country),
      isRenewal: true
    };
    addLoan(newLoan);
    setShowRenewModal(false);
    alert("Crédito renovado exitosamente.");
  };

  const handlePrintCartera = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const rows = carteraGeneralData.map((client, idx) => {
      const m = client._metrics;
      const collector = state.users.find(u => u.id === m.activeLoan?.collectorId);
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '---'}</td>
          <td style="text-transform: uppercase;">${client.name}</td>
          <td>${client.documentId}</td>
          <td style="text-transform: uppercase;">${collector?.name || 'SISTEMA'}</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(m.balance, state.settings)}</td>
          <td style="text-align: center;">${m.installmentsStr}</td>
          <td style="text-align: center; color: ${m.daysOverdue > 0 ? 'red' : 'green'}; font-weight: bold;">${m.daysOverdue} DÍAS</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <html>
        <head>
          <title>PLANILLA CARTERA GENERAL</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #000; color: #fff; padding: 10px; text-align: left; text-transform: uppercase; }
            td { border: 1px solid #ddd; padding: 8px; }
            h1 { text-align: center; font-size: 18px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h1>Cartera General - ${state.settings.companyName || 'DANTE'}</h1>
          <p>Periodo: ${filterStartDate} al ${filterEndDate}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Alta</th>
                <th>Titular</th>
                <th>ID</th>
                <th>Gestor</th>
                <th>Saldo</th>
                <th>Progreso</th>
                <th>Mora</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  };

  const handleDownloadExcel = () => {
    let csv = "Index,Fecha Alta,Titular,ID,Gestor,Saldo,Progreso,Mora\n";
    carteraGeneralData.forEach((client, idx) => {
      const m = client._metrics;
      const collector = state.users.find(u => u.id === m.activeLoan?.collectorId);
      const balance = m.balance.toString().replace(/,/g, '');
      csv += `${idx + 1},${m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '---'},"${client.name.toUpperCase()}","${client.documentId}","${(collector?.name || 'SISTEMA').toUpperCase()}",${balance},${m.installmentsStr},${m.daysOverdue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Cartera_General_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fadeIn ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-[10px] font-black uppercase text-slate-800">{monthNames[month]} {year}</h5>
          <div className="flex gap-1">
            <button type="button" onClick={() => setCurrentCalDate(new Date(year, month - 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><i className="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button type="button" onClick={() => setCurrentCalDate(new Date(year, month + 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><i className="fa-solid fa-chevron-right text-[10px]"></i></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["D", "L", "M", "M", "J", "V", "S"].map(d => <div key={d} className="text-[8px] font-black text-slate-300 py-1">{d}</div>)}
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
                      isSunday ? 'bg-red-50 text-red-400 border-red-100' :
                        'bg-white text-slate-700 border-slate-100 hover:border-blue-400'}`}
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
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className={`relative group aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex flex-col items-center justify-center transition-all ${!disabled ? 'hover:border-blue-500 hover:bg-blue-50 cursor-pointer' : ''}`}>
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
            <i className="fa-solid fa-camera text-slate-300 text-2xl group-hover:text-blue-400 transition-colors"></i>
            <span className="text-[7px] font-black text-slate-400 uppercase mt-2 group-hover:text-blue-500">Subir Imagen</span>
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
      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-xl flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('nuevos')}
          className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'nuevos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-user-plus text-lg"></i>
          NUEVOS
        </button>

        <button
          onClick={() => setViewMode('gestion')}
          className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'gestion' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-plus-circle text-lg"></i>
          AGREGAR
        </button>

        <button
          onClick={() => setViewMode('renovaciones')}
          className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'renovaciones' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-rotate text-lg"></i>
          RENOVACIONES
        </button>

        <button
          onClick={() => setViewMode('cartera')}
          className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'cartera' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-briefcase text-lg"></i>
          CARTERA
        </button>

        <button
          onClick={() => setViewMode('ocultos')}
          className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === 'ocultos' ? 'bg-slate-500 text-white shadow-lg shadow-slate-500/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-eye-slash text-lg"></i>
          OCULTOS
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <i className={`fa-solid ${viewMode === 'gestion' ? 'fa-user-plus text-emerald-600' : viewMode === 'nuevos' ? 'fa-plus-circle text-blue-600' : viewMode === 'renovaciones' ? 'fa-arrows-rotate text-amber-500' : viewMode === 'ocultos' ? 'fa-eye-slash text-slate-500' : 'fa-briefcase text-slate-900'}`}></i>
          {viewMode === 'gestion' ? 'Añadir Cliente' : viewMode === 'nuevos' ? 'Créditos Nuevos' : viewMode === 'renovaciones' ? 'Cartera Renovada' : viewMode === 'ocultos' ? 'Clientes Ocultos' : 'Cartera General'}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {viewMode === 'cartera' || viewMode === 'nuevos' || viewMode === 'renovaciones' || viewMode === 'ocultos' ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-inner w-full sm:w-auto">
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent text-[9px] font-black text-black outline-none uppercase w-full" />
                <span className="text-slate-400 font-bold">-</span>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent text-[9px] font-black text-black outline-none uppercase w-full" />
              </div>
              {(viewMode === 'cartera' || viewMode === 'ocultos') && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handlePrintCartera} className="flex-1 sm:flex-none bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow hover:bg-black transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-print"></i> IMPRIMIR</button>
                  <button onClick={handleDownloadExcel} className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-file-excel"></i> EXCEL</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all"><i className="fa-solid fa-user-plus mr-2 text-black"></i> NUEVO CLIENTE</button>
          )}
        </div>
      </div>

      {viewMode === 'gestion' && (
        <div className="space-y-4">
          <div className="relative">
            <input type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="Buscar por nombre o ID..." className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-black" />
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-900"></i>
          </div>
          <div className="space-y-3 w-full max-w-5xl mx-auto">
            {filteredClients.map((client) => {
              const m = getClientMetrics(client);
              return (
                <div key={client.id} className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col md:flex-row items-center p-3 md:p-4 gap-3 md:gap-8 group relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden shrink-0 shadow-inner">{client.profilePic ? <img src={client.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl md:text-2xl"><i className="fa-solid fa-user"></i></div>}</div>
                  <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 items-center">
                    <div><h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight truncate">{client.name}</h3><p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {client.documentId}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-wider">Saldo</p><p className={`text-xs md:text-sm font-black ${m.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatCurrency(m.balance, state.settings)}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-wider">Progreso</p><p className="text-xs md:text-sm font-black text-slate-700">{m.installmentsStr}</p></div>
                    <div className="flex flex-col"><p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-wider">Mora</p><p className={`text-xs md:text-sm font-black ${m.daysOverdue > 0 ? 'text-orange-500' : 'text-slate-400'}`}>{m.daysOverdue} Días</p></div>
                  </div>
                  <button onClick={() => setShowLegajo(client.id)} className="w-full md:w-auto px-6 py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">EXPEDIENTE</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA CRÉDITOS NUEVOS ESTILO PREMIUM (EXCLUYE RENOVACIONES) */}
      {viewMode === 'nuevos' && (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-6 border-r border-white/5">Fecha Alta</th>
                  <th className="px-6 py-6 border-r border-white/5">Cliente / Titular</th>
                  <th className="px-6 py-6 border-r border-white/5">Cédula</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right">Capital</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-blue-400">Int %</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-emerald-400">Total Crédito</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Frecuencia</th>
                  <th className="px-6 py-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {newCreditsData.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-32 text-center text-slate-300 font-black uppercase text-sm tracking-[0.4em]">No se registran créditos en este periodo</td></tr>
                ) : (
                  newCreditsData.map((loan) => {
                    const client = state.clients.find(c => c.id === loan.clientId);
                    return (
                      <tr key={loan.id} className="hover:bg-blue-50/50 transition-all text-xs font-bold text-slate-700 group">
                        <td className="px-6 py-5 border-r-2 border-slate-50 whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{new Date(loan.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase truncate max-w-[200px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{client?.name || '---'}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-slate-500 font-mono">{client?.documentId || '---'}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-slate-900">{formatCurrency(loan.principal, state.settings)}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-black text-blue-600 bg-blue-50/30">{loan.interestRate}%</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">{formatCurrency(loan.totalAmount, state.settings)}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{loan.frequency}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => setShowLegajo(loan.clientId)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 mx-auto">
                            <i className="fa-solid fa-folder-open text-xs"></i>
                            LEGAJO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> {newCreditsData.length} CRÉDITOS NUEVOS</span>
            <span>SISTEMA DE AUDITORÍA {state.settings.companyName || 'DANTE'}</span>
          </div>
        </div>
      )}

      {/* VISTA CARTERA RENOVADA ESTILO PREMIUM */}
      {viewMode === 'renovaciones' && (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-6 border-r border-white/5">Fecha Renovación</th>
                  <th className="px-6 py-6 border-r border-white/5">Cliente / Titular</th>
                  <th className="px-6 py-6 border-r border-white/5">Cédula</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-emerald-400">Nuevo Capital</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-amber-400">Int %</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right">Total a Pagar</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Frecuencia</th>
                  <th className="px-6 py-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {renewedCreditsData.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-32 text-center text-slate-300 font-black uppercase text-sm tracking-[0.4em]">No se registran renovaciones en este periodo</td></tr>
                ) : (
                  renewedCreditsData.map((loan) => {
                    const client = state.clients.find(c => c.id === loan.clientId);
                    return (
                      <tr key={loan.id} className="hover:bg-amber-50/50 transition-all text-xs font-bold text-slate-700 group">
                        <td className="px-6 py-5 border-r-2 border-slate-50 whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">{new Date(loan.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase truncate max-w-[200px] font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase">{client?.name || '---'}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-slate-500 font-mono">{client?.documentId || '---'}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">{formatCurrency(loan.principal, state.settings)}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-black text-amber-600 bg-amber-50/30">{loan.interestRate}%</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-slate-900">{formatCurrency(loan.totalAmount, state.settings)}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200">{loan.frequency}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => setShowLegajo(loan.clientId)} className="px-4 py-2.5 bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2 mx-auto">
                            <i className="fa-solid fa-folder-open text-xs"></i>
                            LEGAJO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div> {renewedCreditsData.length} RENOVACIONES ACTIVAS</span>
            <span>AUDITORÍA DE CRECIMIENTO {state.settings.companyName || 'DANTE'}</span>
          </div>
        </div>
      )}

      {/* VISTA CARTERA GENERAL ESTILO PREMIUM EXCEL */}
      {viewMode === 'cartera' && (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-4 py-6 border-r border-white/5 w-14 text-center">#</th>
                  <th className="px-6 py-6 border-r border-white/5">Ult. Movimeinto</th>
                  <th className="px-6 py-6 border-r border-white/5">Titular del Crédito</th>
                  <th className="px-6 py-6 border-r border-white/5">ID / Cédula</th>
                  <th className="px-6 py-6 border-r border-white/5">Gestor Responsable</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-rose-400">Saldo Consolidado</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Progreso</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Mora</th>
                  <th className="px-6 py-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {carteraGeneralData.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-32 text-center text-slate-300 font-black uppercase text-sm tracking-[0.4em]">No se reportan clientes registrados</td></tr>
                ) : (
                  carteraGeneralData.map((client, idx) => {
                    const m = client._metrics;
                    const collector = state.users.find(u => u.id === m.activeLoan?.collectorId);
                    return (
                      <tr key={client.id} className="hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 group">
                        <td className="px-4 py-5 border-r-2 border-slate-50 text-center">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto">{idx + 1}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '---'}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase truncate max-w-[200px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{client.name}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-slate-500 font-mono">{client.documentId}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border flex items-center gap-1.5 w-fit ${collector?.id === currentUserId ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <i className="fa-solid fa-user-circle"></i>
                            {collector?.name || 'SISTEMA'}
                          </span>
                        </td>
                        <td className={`px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-[13px] ${m.balance > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-emerald-600 bg-emerald-50/20'}`}>
                          {formatCurrency(m.balance, state.settings)}
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black text-slate-900">{m.installmentsStr}</span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${(parseInt(m.installmentsStr.split('/')[0]) / parseInt(m.installmentsStr.split('/')[1])) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 flex items-center justify-center gap-1.5 ${m.daysOverdue > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <i className={`fa-solid ${m.daysOverdue > 0 ? 'fa-triangle-exclamation' : 'fa-check-circle'}`}></i>
                            {m.daysOverdue} DÍAS
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setShowLegajo(client.id)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center gap-2">
                              <i className="fa-solid fa-folder-tree"></i>
                              VER EXPEDIENTE
                            </button>
                            {isAdminOrManager && (
                              <button
                                onClick={() => {
                                  if (confirm(`OCULTAR CLIENTE: ${client.name}\n\nEl cliente se moverá a la pestaña de "OCULTOS".\n\n¿CONFIRMAR?`)) {
                                    updateClient?.({ ...client, isActive: false });
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 border-2 border-slate-200 flex items-center justify-center shadow-lg hover:bg-slate-600 hover:text-white transition-all active:scale-95"
                                title="Ocultar Cliente"
                              >
                                <i className="fa-solid fa-eye-slash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {viewMode === 'ocultos' ? (
              <span className="flex items-center gap-2"><i className="fa-solid fa-eye-slash text-slate-300"></i> Ocultos: {carteraGeneralData.length}</span>
            ) : (
              <span className="flex items-center gap-2"><i className="fa-solid fa-users text-slate-300"></i> Mi Portafolio: {carteraGeneralData.length} Activos</span>
            )}
            <span className="flex items-center gap-2"><i className="fa-solid fa-shield-halved text-emerald-400"></i> AUDITORÍA DE CARTERA CONSOLIDADA</span>
          </div>
        </div>
      )}

      {/* VISTA CLIENTES OCULTOS (SEPARADA PARA EVITAR CONFLICTOS) */}
      {viewMode === 'ocultos' && (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-4 py-6 border-r border-white/5 w-14 text-center">#</th>
                  <th className="px-6 py-6 border-r border-white/5">Ult. Movimeinto</th>
                  <th className="px-6 py-6 border-r border-white/5">Titular del Crédito</th>
                  <th className="px-6 py-6 border-r border-white/5">ID / Cédula</th>
                  <th className="px-6 py-6 border-r border-white/5">Gestor Responsable</th>
                  <th className="px-6 py-6 border-r border-white/5 text-right text-rose-400">Saldo Consolidado</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Progreso</th>
                  <th className="px-6 py-6 border-r border-white/5 text-center">Mora</th>
                  <th className="px-6 py-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {carteraGeneralData.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-32 text-center text-slate-300 font-black uppercase text-sm tracking-[0.4em]">No hay clientes ocultos</td></tr>
                ) : (
                  carteraGeneralData.map((client, idx) => {
                    const m = client._metrics;
                    const collector = state.users.find(u => u.id === m.activeLoan?.collectorId);
                    return (
                      <tr key={client.id} className="hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 group opacity-75 grayscale hover:grayscale-0">
                        <td className="px-4 py-5 border-r-2 border-slate-50 text-center">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto">{idx + 1}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '---'}</span>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase truncate max-w-[200px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{client.name}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-slate-500 font-mono">{client.documentId}</td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 uppercase">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border flex items-center gap-1.5 w-fit ${collector?.id === currentUserId ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <i className="fa-solid fa-user-circle"></i>
                            {collector?.name || 'SISTEMA'}
                          </span>
                        </td>
                        <td className={`px-6 py-5 border-r-2 border-slate-50 text-right font-mono font-black text-[13px] ${m.balance > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-emerald-600 bg-emerald-50/20'}`}>
                          {formatCurrency(m.balance, state.settings)}
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black text-slate-900">{m.installmentsStr}</span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${(parseInt(m.installmentsStr.split('/')[0]) / parseInt(m.installmentsStr.split('/')[1])) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-r-2 border-slate-50 text-center">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 flex items-center justify-center gap-1.5 ${m.daysOverdue > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <i className={`fa-solid ${m.daysOverdue > 0 ? 'fa-triangle-exclamation' : 'fa-check-circle'}`}></i>
                            {m.daysOverdue} DÍAS
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isAdminOrManager && (
                              <button
                                onClick={() => {
                                  if (confirm(`RESTAURAR CLIENTE: ${client.name}\n\nEl cliente volverá a la cartera activa.\n\n¿CONFIRMAR?`)) {
                                    updateClient?.({ ...client, isActive: true });
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                                title="Restaurar Cliente"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><i className="fa-solid fa-eye-slash text-slate-300"></i> Ocultos: {carteraGeneralData.length}</span>
            <span className="flex items-center gap-2"><i className="fa-solid fa-shield-halved text-emerald-400"></i> AUDITORÍA DE CARTERA CONSOLIDADA</span>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO CLIENTE NUEVO */}
      {/* MODAL REGISTRO CLIENTE NUEVO PREMIUM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[150] p-2 overflow-hidden">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[96vh] flex flex-col animate-scaleIn border-4 border-white/20 relative">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-white/10 sticky top-0 z-20 rounded-t-[2.5rem]">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 border-b-4 border-blue-900">
                  <i className="fa-solid fa-user-plus text-3xl"></i>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">Alta de Nuevo Cliente</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Dossier oficial de registro y crédito</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-all active:scale-90 border border-white/10"
              >
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>

            <form id="new-client-form" onSubmit={handleSubmitNewClient} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 bg-white mobile-scroll-container pb-40">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="h-0.5 w-10 bg-blue-600"></div>
                  I. Información de Identidad
                </h4>
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-inner grid grid-cols-1 md:grid-cols-2">
                  <div className="flex border-b-2 md:border-r-2 border-slate-100">
                    <div className="w-24 bg-slate-900 px-4 py-5 text-[9px] font-black text-white uppercase flex items-center justify-center text-center shrink-0">Nombre</div>
                    <input required type="text" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="flex-1 px-5 py-5 text-sm font-black bg-white text-slate-900 uppercase outline-none focus:bg-blue-50/50 transition-colors" placeholder="..." />
                  </div>
                  <div className="flex border-b-2 border-slate-100 text-black">
                    <div className="w-24 bg-slate-900 px-4 py-5 text-[9px] font-black text-white uppercase flex items-center justify-center text-center shrink-0">Cédula</div>
                    <input required type="text" value={clientData.documentId} onChange={e => setClientData({ ...clientData, documentId: e.target.value })} className="flex-1 px-5 py-5 text-sm font-black bg-white text-slate-900 outline-none focus:bg-blue-50/50 transition-colors" placeholder="..." />
                  </div>
                  <div className="flex border-b-2 md:border-b-0 md:border-r-2 border-slate-100">
                    <div className="w-24 bg-slate-900 px-4 py-5 text-[9px] font-black text-white uppercase flex items-center justify-center text-center shrink-0">WhatsApp</div>
                    <input required type="tel" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="flex-1 px-5 py-5 text-sm font-black bg-white text-slate-900 outline-none focus:bg-blue-50/50 transition-colors" placeholder="..." />
                  </div>
                  <div className="flex">
                    <div className="w-24 bg-slate-900 px-4 py-5 text-[9px] font-black text-white uppercase flex items-center justify-center text-center shrink-0">Otros Tels</div>
                    <input type="tel" value={clientData.secondaryPhone} onChange={e => setClientData({ ...clientData, secondaryPhone: e.target.value })} className="flex-1 px-5 py-5 text-sm font-black bg-white text-slate-900 outline-none focus:bg-blue-50/50 transition-colors" placeholder="..." />
                  </div>
                  <div className="flex col-span-1 md:col-span-2 border-t-2 border-slate-100">
                    <div className="w-24 bg-slate-900 px-4 py-5 text-[9px] font-black text-white uppercase flex items-center justify-center text-center shrink-0">Dirección</div>
                    <input required type="text" value={clientData.address} onChange={e => setClientData({ ...clientData, address: e.target.value })} className="flex-1 px-5 py-5 text-sm font-black bg-white text-slate-900 uppercase outline-none focus:bg-blue-50/50 transition-colors" placeholder="CALLE / BARRIO / CIUDAD" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="h-0.5 w-10 bg-indigo-600"></div>
                  II. Archivo Fotográfico Digital
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <PhotoUploadField label="PERFIL" field="profilePic" value={clientData.profilePic || ''} />
                  <PhotoUploadField label="CÉDULA" field="documentPic" value={clientData.documentPic || ''} />
                  <PhotoUploadField label="VIVIENDA" field="housePic" value={clientData.housePic || ''} />
                  <PhotoUploadField label="NEGOCIO" field="businessPic" value={clientData.businessPic || ''} />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="h-0.5 w-10 bg-rose-600"></div>
                  III. Geolocalización In-Situ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-sm">
                    <button type="button" onClick={() => handleCaptureLocation('home')} className={`w-full py-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${clientData.location ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-500/20' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'}`}>
                      <i className={`fa-solid ${clientData.location ? 'fa-check-circle' : 'fa-house-signal'} text-xl`}></i>
                      {clientData.location ? 'GPS CASA CAPTURADO' : 'CAPTURAR GPS CASA'}
                    </button>
                    {clientData.location && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <span className="text-[9px] font-black text-emerald-600">LAT: {clientData.location.lat.toFixed(6)}</span>
                        <span className="text-[9px] font-black text-emerald-600">LNG: {clientData.location.lng.toFixed(6)}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 shadow-sm">
                    <button type="button" onClick={() => handleCaptureLocation('domicilio')} className={`w-full py-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${clientData.domicilioLocation ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500'}`}>
                      <i className={`fa-solid ${clientData.domicilioLocation ? 'fa-check-circle' : 'fa-briefcase'} text-xl`}></i>
                      {clientData.domicilioLocation ? 'GPS NEGOCIO CAPTURADO' : 'CAPTURAR GPS NEGOCIO'}
                    </button>
                    {clientData.domicilioLocation && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                        <span className="text-[9px] font-black text-blue-600">LAT: {clientData.domicilioLocation.lat.toFixed(6)}</span>
                        <span className="text-[9px] font-black text-blue-600">LNG: {clientData.domicilioLocation.lng.toFixed(6)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {addInitialLoan && (
                <div className="space-y-8 pt-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="h-0.5 w-10 bg-emerald-600"></div>
                    IV. Estructura de Crédito de Bienvenida
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                      <div className="bg-slate-900 border-4 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="flex border-b-2 border-slate-800">
                          <div className="w-32 bg-emerald-600 px-5 py-6 text-[10px] font-black text-white flex items-center justify-center text-center uppercase border-r-2 border-emerald-700">CAPITAL</div>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={initialLoan.principal === 0 ? '' : initialLoan.principal}
                            onChange={e => setInitialLoan({ ...initialLoan, principal: e.target.value === '' ? 0 : Number(e.target.value) })}
                            className="flex-1 px-6 py-6 text-2xl font-black bg-slate-900 text-white outline-none focus:bg-slate-800 transition-colors font-mono"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex border-b-2 border-slate-800">
                          <div className="w-32 bg-blue-600 px-5 py-6 text-[10px] font-black text-white flex items-center justify-center text-center uppercase border-r-2 border-blue-700">INTERÉS %</div>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={initialLoan.interestRate === 0 ? '' : initialLoan.interestRate}
                            onChange={e => setInitialLoan(prev => ({ ...prev, interestRate: e.target.value === '' ? 0 : Number(e.target.value) }))}
                            className="flex-1 px-6 py-6 text-2xl font-black bg-slate-900 text-white outline-none focus:bg-slate-800 transition-colors font-mono"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex border-b-2 border-slate-800">
                          <div className="w-32 bg-slate-800 px-5 py-6 text-[10px] font-black text-white flex items-center justify-center text-center uppercase border-r-2 border-slate-700">CUOTAS</div>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={initialLoan.installments === 0 ? '' : initialLoan.installments}
                            onChange={e => setInitialLoan(prev => ({ ...prev, installments: e.target.value === '' ? 0 : Number(e.target.value) }))}
                            className="flex-1 px-6 py-6 text-2xl font-black bg-slate-900 text-white outline-none focus:bg-slate-800 transition-colors font-mono"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex border-b-2 border-slate-800">
                          <div className="w-32 bg-purple-600 px-5 py-6 text-[10px] font-black text-white flex items-center justify-center text-center uppercase border-r-2 border-purple-700">FRECUENCIA</div>
                          <select
                            value={initialLoan.frequency}
                            onChange={e => setInitialLoan(prev => ({ ...prev, frequency: e.target.value as Frequency }))}
                            className="flex-1 px-6 py-6 text-lg font-black bg-slate-900 text-white outline-none focus:bg-slate-800 transition-colors uppercase appearance-none"
                          >
                            <option value={Frequency.DAILY}>DIARIO</option>
                            <option value={Frequency.WEEKLY}>SEMANAL</option>
                            <option value={Frequency.BIWEEKLY}>QUINCENAL</option>
                            <option value={Frequency.MONTHLY}>MENSUAL</option>
                          </select>
                        </div>
                        <div className="p-6 bg-slate-950 flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">FECHA FINALIZACIÓN PROYECTADA</p>
                            <p className="text-sm font-black text-emerald-400 uppercase">{initialLoan.endDate ? formatDate(initialLoan.endDate).toUpperCase() : 'CALCULANDO...'}</p>
                          </div>
                          <i className="fa-solid fa-calendar-check text-slate-800 text-3xl"></i>
                        </div>
                      </div>
                      <div className="p-5 bg-blue-50 rounded-2xl border-2 border-blue-100 flex items-start gap-3">
                        <i className="fa-solid fa-circle-info text-blue-400 text-xl mt-1"></i>
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                          Asegúrese de establecer la fecha de inicio correcta en el calendario contiguo. El sistema generará automáticamente la tabla de amortización basada en la frecuencia seleccionada.
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
                      <GenericCalendar
                        startDate={initialLoan.startDate}
                        customHolidays={initialLoan.customHolidays}
                        setDate={(iso) => setInitialLoan(prev => ({ ...prev, startDate: iso }))}
                        toggleHoliday={(iso) => setInitialLoan(prev => prev.customHolidays.includes(iso) ? { ...prev, customHolidays: prev.customHolidays.filter(d => d !== iso) } : { ...prev, customHolidays: [...prev.customHolidays, iso] })}
                      />
                    </div>
                  </div>
                </div>
              )}

            </form>
            <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 z-50 fixed bottom-0 left-0 right-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)]">
              <button
                form="new-client-form"
                type="submit"
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-4 border-b-8 border-slate-950"
              >
                <i className="fa-solid fa-cloud-arrow-up text-xl text-emerald-400"></i>
                REGISTRAR EXPEDIENTE Y ACTIVAR CRÉDITO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGAJO / EXPEDIENTE DEL CLIENTE */}
      {showLegajo && clientInLegajo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[120] p-2 overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full md:h-[95vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="p-3 md:p-4 bg-[#0f172a] text-white shrink-0 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowLegajo(null)} className="md:hidden w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center active:bg-white/20 transition-all mr-1">
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 border-white/10 overflow-hidden bg-white/5 shadow-xl">{clientInLegajo.profilePic && <img src={clientInLegajo.profilePic} className="w-full h-full object-cover" />}</div>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter leading-tight truncate">{clientInLegajo.name}</h3>
                  <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5 truncate"><i className="fa-solid fa-location-dot"></i> {clientInLegajo.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingClient && (
                  <>
                    <button
                      disabled={isSharing}
                      onClick={handleSharePNG}
                      className={`px-4 py-2 bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${isSharing ? 'opacity-50' : ''}`}
                    >
                      {isSharing ? <i className="fa-solid fa-spinner animate-spin text-xs"></i> : <i className="fa-brands fa-whatsapp text-xs text-black"></i>}
                      {isSharing ? 'GENERANDO...' : 'COMPARTIR'}
                    </button>
                    {isAdminOrManager && (<button onClick={handleOpenCustomNoPay} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"><i className="fa-solid fa-comment-slash text-xs text-black"></i> EDITAR NO PAGO</button>)}
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
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-lg flex flex-wrap items-center justify-center gap-4 animate-fadeIn">
                    <div className="flex items-center gap-2 border-r-2 pr-4 border-slate-100">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MAPA GPS:</span>
                      <button onClick={() => handleOpenMap(clientInLegajo.location)} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase"><i className="fa-solid fa-house text-lg"></i> CASA</button>
                      <button onClick={() => handleOpenMap(clientInLegajo.domicilioLocation)} className="px-4 py-2.5 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase"><i className="fa-solid fa-briefcase text-lg"></i> NEGOCIO</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CONTACTO:</span>
                      <a href={`tel:${clientInLegajo.phone}`} className="w-11 h-11 bg-white border-2 border-slate-200 text-slate-900 rounded-xl flex items-center justify-center shadow-md hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-phone text-lg"></i></a>
                      <a href={`https://wa.me/${clientInLegajo.phone.replace(/\D/g, '')}`} target="_blank" className="w-11 h-11 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-xl flex items-center justify-center shadow-md hover:bg-emerald-600 hover:text-white transition-all"><i className="fa-brands fa-square-whatsapp text-3xl"></i></a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                      {activeLoanInLegajo ? (
                        <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-xl overflow-hidden" ref={statementRef}>
                          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <i className="fa-solid fa-receipt text-emerald-400"></i>
                              Resumen de Cuenta Oficial
                            </h4>
                            <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase shadow-lg shadow-emerald-500/30">ACTIVO</span>
                          </div>
                          <div className="overflow-x-auto">
                            {(() => {
                              const m = getClientMetrics(clientInLegajo);
                              return (
                                <table className="w-full text-left border-collapse">
                                  <tbody className="divide-y-2 divide-slate-50 text-slate-900 font-bold text-xs md:text-sm">
                                    <tr className="hover:bg-slate-50 transition-colors">
                                      <td className="p-4 bg-slate-50/50 text-slate-500 font-black uppercase text-[9px] tracking-widest border-r-2 border-slate-50 w-1/2">Total Prestado</td>
                                      <td className="p-4 text-right font-black text-xl text-slate-900 font-mono">{formatCurrency(activeLoanInLegajo.totalAmount, state.settings)}</td>
                                    </tr>
                                    <tr className="hover:bg-emerald-50 transition-colors">
                                      <td className="p-4 bg-emerald-50/30 text-emerald-600 font-black uppercase text-[9px] tracking-widest border-r-2 border-slate-50">Abonado a la Fecha</td>
                                      <td className="p-4 text-right font-black text-xl text-emerald-600 font-mono">{formatCurrency(m.totalPaid, state.settings)}</td>
                                    </tr>
                                    <tr className="hover:bg-rose-50 transition-colors">
                                      <td className="p-4 bg-rose-50/30 text-rose-600 font-black uppercase text-[9px] tracking-widest border-r-2 border-slate-50">Saldo Pendiente</td>
                                      <td className="p-4 text-right font-black text-2xl text-rose-600 font-mono">{formatCurrency(m.balance, state.settings)}</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50 transition-colors">
                                      <td className="p-4 bg-blue-50/30 text-blue-600 font-black uppercase text-[9px] tracking-widest border-r-2 border-slate-50">Progreso Cuotas</td>
                                      <td className="p-4 text-right font-black text-lg text-slate-900">{m.installmentsStr}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-10 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-4xl mb-2">
                            <i className="fa-solid fa-money-bill-transfer"></i>
                          </div>
                          <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter leading-tight">Cliente sin crédito vigente</h4>
                          <button onClick={() => setShowRenewModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-blue-500/40 active:scale-95 transition-all flex items-center gap-3">
                            <i className="fa-solid fa-plus-circle text-lg text-black"></i>
                            NUEVO PRÉSTAMO
                          </button>
                        </div>
                      )}

                      <div className="bg-white rounded-[2rem] border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col">
                        <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-history text-blue-600"></i>
                            Historial de Movimientos
                          </h4>
                          <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            En Vivo
                          </span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-xs border-collapse min-w-[450px]">
                            <thead className="bg-slate-100 sticky top-0 font-black text-slate-400 border-b-2 border-slate-200 uppercase tracking-widest">
                              <tr>
                                <th className="px-5 py-4 text-left">Periodo / Fecha</th>
                                <th className="px-5 py-4 text-left">Concepto de Gestión</th>
                                <th className="px-5 py-4 text-right">Valor</th>
                                <th className="px-5 py-4 text-center">Auditoría</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50 font-bold text-slate-700">
                              {clientHistory.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="px-5 py-4">
                                    <p className="text-slate-900 font-black">{new Date(log.date).toLocaleDateString()}</p>
                                    <p className="text-[8px] text-slate-400 font-medium">{new Date(log.date).toLocaleTimeString()}</p>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${log.isOpening ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      log.isRenewal ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        log.type === CollectionLogType.PAYMENT ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                          'bg-rose-50 text-rose-600 border-rose-100'
                                      }`}>
                                      {log.isOpening ? 'Apertura de Crédito' :
                                        log.isRenewal ? 'Liquidación Renovación' :
                                          log.type === CollectionLogType.PAYMENT ? 'Abono Registrado' :
                                            'Reporte No Pago'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-right font-black font-mono text-sm text-slate-900">
                                    {log.amount ? `${formatCurrency(log.amount, state.settings)} $` : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    {isAdminOrManager && (
                                      <div className="flex items-center justify-center gap-2">
                                        {log.type === CollectionLogType.PAYMENT && (
                                          <button onClick={() => handleEditLog(log)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border-2 border-blue-100 flex items-center justify-center shadow-sm hover:bg-blue-600 hover:text-white transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                                        )}
                                        <button onClick={() => { if (confirm('¿ELIMINAR ESTE REGISTRO?')) deleteCollectionLog?.(log.id); }} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border-2 border-rose-100 flex items-center justify-center shadow-sm hover:bg-rose-600 hover:text-white transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {/* GALERÍA MEJORADA */}
                      <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-200 shadow-lg space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase border-b-2 border-slate-50 pb-2 flex items-center justify-between tracking-widest">
                          GALERÍA DE EXPEDIENTE
                          <i className="fa-solid fa-images text-slate-300"></i>
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ key: 'profilePic', label: 'Perfil' }, { key: 'documentPic', label: 'Cédula' }, { key: 'businessPic', label: 'Negocio' }, { key: 'housePic', label: 'Vivienda' }].map((item) => (
                            <div key={item.key} className="flex flex-col items-center">
                              <div className="aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner flex items-center justify-center relative group">
                                {clientInLegajo[item.key as keyof Client] ? (
                                  <img
                                    src={clientInLegajo[item.key as keyof Client] as string}
                                    className="w-full h-full object-cover cursor-zoom-in active:scale-95 transition-transform"
                                    onClick={() => setViewingImage(clientInLegajo[item.key as keyof Client] as string)}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <i className="fa-solid fa-camera text-slate-200 text-xl"></i>
                                    <span className="text-[6px] font-black text-slate-300 uppercase">Sin Foto</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[8px] font-black text-slate-500 uppercase mt-2 tracking-widest">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PAGO RÁPIDO - RESTAURADO Y MEJORADO */}
                      {activeLoanInLegajo && (
                        <div className="bg-white rounded-[2.5rem] border-4 border-emerald-500 shadow-2xl overflow-hidden flex flex-col animate-scaleIn sticky bottom-4 z-10">
                          <div className="p-5 space-y-4 flex-1 bg-gradient-to-b from-white to-emerald-50/30">
                            <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Cobro Express</h4>
                              {(() => {
                                const m = getClientMetrics(clientInLegajo);
                                return (
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border-2 ${m.daysOverdue > 0 ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    {m.daysOverdue > 0 ? `${m.daysOverdue} d mora` : 'Al Día'}
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="bg-slate-900 p-4 rounded-3xl space-y-1.5 border-b-4 border-emerald-500 shadow-xl">
                              <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest text-center">Valor Sugerido de Cuota</p>
                              <p className="text-3xl font-black text-white font-mono text-center tracking-tighter">
                                {formatCurrency(activeLoanInLegajo.installmentValue, state.settings)}
                              </p>
                            </div>

                            <div className="bg-white/60 p-3 rounded-2xl border-2 border-slate-100 text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status Actual</p>
                              <p className="text-[10px] font-black text-slate-800 uppercase leading-none">
                                {getClientMetrics(clientInLegajo).installmentsStr} Cuotas Pagas
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-white border-t-2 border-slate-100 grid grid-cols-2 gap-3 pb-6">
                            <button
                              onClick={() => handleDossierAction(CollectionLogType.NO_PAGO)}
                              className="py-4 bg-rose-50 border-2 border-rose-200 rounded-2xl font-black text-[10px] text-rose-600 uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              <i className="fa-solid fa-times-circle mr-1"></i>
                              No Pago
                            </button>
                            <button
                              onClick={handleOpenDossierPayment}
                              className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/40 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <i className="fa-solid fa-hand-holding-dollar text-black"></i>
                              COBRAR
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm max-w-5xl mx-auto space-y-10 animate-fadeIn pb-32 mobile-scroll-container">
                  <div className="flex justify-between items-center border-b pb-3 sticky top-0 bg-white z-10">
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Modificar Expediente Completo</h4>
                  </div>

                  {isAdminOrManager && (
                    <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-user-lock"></i></div>
                        <div>
                          <p className="text-[10px] font-black text-blue-900 uppercase">Habilitar edición de GPS para el Cobrador</p>
                          <p className="text-[8px] font-bold text-blue-700 opacity-70 uppercase">Si se activa, el cobrador podrá entrar aquí solo para recapturar ubicación.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditClientFormData(prev => prev ? { ...prev, allowCollectorLocationUpdate: !prev.allowCollectorLocationUpdate } : null)}
                        className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${editClientFormData?.allowCollectorLocationUpdate ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${editClientFormData?.allowCollectorLocationUpdate ? 'left-8' : 'left-1'}`}></div>
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-2">I. Datos del Cliente</h5>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-sm">
                      {/* 
                          Fix: Added quotes around Tailwind classes in template literal to avoid "Cannot find name 'opacity'" errors.
                        */}
                      <div className="flex border-b md:border-r border-slate-800"><div className="w-24 bg-slate-800 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Nombre</div><input disabled={isCollector} type="text" value={editClientFormData?.name} onChange={e => setEditClientFormData(prev => prev ? { ...prev, name: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-900 text-white uppercase outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                      <div className="flex border-b border-slate-800"><div className="w-24 bg-slate-800 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Cédula</div><input disabled={isCollector} type="text" value={editClientFormData?.documentId} onChange={e => setEditClientFormData(prev => prev ? { ...prev, documentId: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-900 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                      <div className="flex border-b md:border-b-0 md:border-r border-slate-800"><div className="w-24 bg-slate-800 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">WhatsApp</div><input disabled={isCollector} type="tel" value={editClientFormData?.phone} onChange={e => setEditClientFormData(prev => prev ? { ...prev, phone: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-900 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                      <div className="flex border-b md:border-b-0 border-slate-800"><div className="w-24 bg-slate-800 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Tel. Otros</div><input disabled={isCollector} type="tel" value={editClientFormData?.secondaryPhone} onChange={e => setEditClientFormData(prev => prev ? { ...prev, secondaryPhone: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-900 text-white outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                      <div className="flex col-span-1 md:col-span-2 border-t border-slate-800"><div className="w-24 bg-slate-800 px-3 py-3 text-[7px] font-black text-white uppercase flex items-center border-r border-white/10 shrink-0">Dirección</div><input disabled={isCollector} type="text" value={editClientFormData?.address} onChange={e => setEditClientFormData(prev => prev ? { ...prev, address: e.target.value } : null)} className={`flex-1 px-3 py-3 text-xs font-bold bg-slate-900 text-white uppercase outline-none ${isCollector ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest border-l-4 border-indigo-700 pl-2">II. Documentación Fotográfica</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <PhotoUploadField disabled={isCollector} label="Perfil" field="profilePic" value={editClientFormData?.profilePic || ''} forEdit />
                      <PhotoUploadField disabled={isCollector} label="Cédula" field="documentPic" value={editClientFormData?.documentPic || ''} forEdit />
                      <PhotoUploadField disabled={isCollector} label="Casa" field="housePic" value={editClientFormData?.housePic || ''} forEdit />
                      <PhotoUploadField disabled={isCollector} label="Negocio" field="businessPic" value={editClientFormData?.businessPic || ''} forEdit />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-l-4 border-amber-700 pl-2.5">III. Localización Satelital</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <button type="button" onClick={() => handleCaptureLocation('home', true)} className={`flex items-center justify-center gap-2 w-full px-3 py-4 rounded-xl border-2 transition-all ${editClientFormData?.location ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600 active:bg-slate-50'}`}>🏠 <span className="text-[10px] font-black uppercase">RECAPTURAR CASA</span></button>
                        {editClientFormData?.location && <p className="text-[8px] font-black text-emerald-600 uppercase text-center bg-emerald-50 py-1 rounded-md border border-emerald-200">Lat: {editClientFormData.location.lat.toFixed(6)} | Lng: {editClientFormData.location.lng.toFixed(6)}</p>}
                      </div>
                      <div className="space-y-2">
                        <button type="button" onClick={() => handleCaptureLocation('domicilio', true)} className={`flex items-center justify-center gap-2 w-full px-3 py-4 rounded-xl border-2 transition-all ${editClientFormData?.domicilioLocation ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600 active:bg-slate-50'}`}>🏢 <span className="text-[10px] font-black uppercase">RECAPTURAR NEGOCIO</span></button>
                        {editClientFormData?.domicilioLocation && <p className="text-[8px] font-black text-indigo-100 uppercase text-center bg-indigo-50 py-1 rounded-md border border-indigo-100">Lat: {editClientFormData.domicilioLocation.lat.toFixed(6)} | Lng: {editClientFormData.domicilioLocation.lng.toFixed(6)}</p>}
                      </div>
                    </div>
                  </div>

                  {/* NUEVA SECCIÓN: EDICIÓN DE CRÉDITO Y CALENDARIO */}
                  {!isCollector && editLoanFormData && (
                    <div className="space-y-6 animate-fadeIn">
                      <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-l-4 border-emerald-600 pl-2">IV. Configuración de Crédito y Calendario</h5>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm grid grid-cols-2">
                            <div className="flex border-b border-r border-slate-100">
                              <div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Capital</div>
                              <input type="number" value={editLoanFormData.principal} onChange={e => setEditLoanFormData({ ...editLoanFormData, principal: Number(e.target.value) })} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" />
                            </div>
                            <div className="flex border-b border-slate-100">
                              <div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Int. %</div>
                              <input type="number" value={editLoanFormData.interestRate} onChange={e => setEditLoanFormData(prev => prev ? { ...prev, interestRate: Number(e.target.value) || 0 } : null)} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" />
                            </div>
                            <div className="flex border-r border-slate-100">
                              <div className="w-20 bg-emerald-700 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Cuotas</div>
                              <input type="number" value={editLoanFormData.totalInstallments} onChange={e => setEditLoanFormData(prev => prev ? { ...prev, totalInstallments: Number(e.target.value) || 0 } : null)} className="flex-1 px-3 py-3 text-xs font-black bg-emerald-600 text-white outline-none" />
                            </div>
                            <div className="flex">
                              <div className="w-20 bg-slate-900 px-3 py-3 text-[7px] font-black text-white flex items-center uppercase">Valor Base</div>
                              <div className="flex-1 px-3 py-3 text-[9px] font-black bg-slate-800 text-white flex items-center">{formatCurrency(editLoanFormData.installmentValue, state.settings)}</div>
                            </div>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-[8px] font-bold text-amber-700 leading-relaxed">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            Al modificar el crédito, se recalculará la tabla de pagos. Se intentará mantener el registro de abonos ya realizados si el número de cuota se mantiene.
                          </div>
                        </div>
                        <GenericCalendar
                          startDate={editLoanFormData.createdAt.split('T')[0]}
                          customHolidays={editLoanFormData.customHolidays || []}
                          setDate={(iso) => setEditLoanFormData(prev => prev ? { ...prev, createdAt: iso + 'T00:00:00' } : null)}
                          toggleHoliday={(iso) => setEditLoanFormData(prev => {
                            if (!prev) return null;
                            const currentHolidays = prev.customHolidays || [];
                            return currentHolidays.includes(iso)
                              ? { ...prev, customHolidays: currentHolidays.filter(d => d !== iso) }
                              : { ...prev, customHolidays: [...currentHolidays, iso] };
                          })}
                        />
                      </div>
                    </div>
                  )}

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
        </div>
      )}

      {/* TEMPLATE OCULTO PARA TARJETA DE ESTADO DE CUENTA */}
      <div className="fixed -left-[4000px] top-0 pointer-events-none z-[-1]">
        {showLegajo && clientInLegajo && activeLoanInLegajo && (
          <div ref={shareCardRef} className="w-[800px] bg-[#f8fafc] font-sans overflow-hidden flex flex-col p-0">
            <div className="bg-[#0f172a] p-10 flex justify-between items-center text-white">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center text-3xl shadow-xl">
                  <i className="fa-solid fa-sack-dollar"></i>
                </div>
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{state.settings.companyName || 'DANTE'}</h1>
                  <p className="text-[#10b981] text-[10px] font-black uppercase tracking-[0.3em] mt-1">ESTADO DE CUENTA OFICIAL</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">FECHA DE CORTE</p>
                <p className="text-sm font-black uppercase">{new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</p>
              </div>
            </div>

            <div className="p-10 flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">TITULAR DEL CRÉDITO</p>
                <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{clientInLegajo.name}</h2>
                <p className="text-blue-600 font-bold text-sm mt-1 uppercase tracking-widest">REF: {activeLoanInLegajo.id.toUpperCase()}</p>
              </div>
              <div className="space-y-3 flex flex-col items-end">
                <span className="bg-[#dcfce7] text-[#059669] px-6 py-2 rounded-full font-black text-[10px] uppercase border border-[#10b981]/30">ESTADO: ACTIVO</span>
                <div className="bg-[#0f172a] p-4 rounded-xl text-white min-w-[200px] text-center border-b-4 border-[#10b981]">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">PARA TRANSFERENCIAS</p>
                  <p className="text-sm font-black tracking-widest uppercase">{state.settings.transferAlias || 'SIN ALIAS'}</p>
                </div>
              </div>
            </div>

            <div className="px-10 grid grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-2">TOTAL PRESTADO</p>
                <p className="text-xl font-black text-slate-900 font-mono">{formatCurrency(activeLoanInLegajo.totalAmount, state.settings)}</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-2">ABONADO</p>
                <p className="text-xl font-black text-[#10b981] font-mono">{formatCurrency(getClientMetrics(clientInLegajo).totalPaid, state.settings)}</p>
              </div>
              <div className="bg-[#0f172a] p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center border-b-4 border-[#10b981]">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">SALDO ACTUAL</p>
                <p className="text-2xl font-black text-white font-mono">{formatCurrency(getClientMetrics(clientInLegajo).balance, state.settings)}</p>
              </div>
            </div>

            <div className="px-10 mb-10">
              <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3 mb-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">DETALLE DE CUOTAS</h3>
                <span className="text-[9px] font-black text-slate-500 uppercase">FRECUENCIA: {activeLoanInLegajo.frequency.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {activeLoanInLegajo.installments.map((inst, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${inst.status === PaymentStatus.PAID ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-400'}`}>{inst.number}</div>
                      <div>
                        <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{new Date(inst.dueDate).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'numeric' }).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {inst.status === PaymentStatus.PARTIAL && (
                        <p className="text-[6px] font-black text-[#10b981] uppercase mb-0.5">ABONÓ: {formatCurrency(inst.paidAmount, state.settings)}</p>
                      )}
                      <p className={`text-[10px] font-black font-mono ${inst.status === PaymentStatus.PAID ? 'text-[#10b981]' : 'text-slate-900'}`}>{formatCurrency(inst.amount, state.settings)}</p>
                      {inst.status === PaymentStatus.PARTIAL && (
                        <p className="text-[6px] font-black text-orange-500 uppercase mt-0.5">$ {Math.round(inst.amount - inst.paidAmount)} PEND.</p>
                      )}
                      <p className={`text-[7px] font-black uppercase mt-0.5 ${inst.status === PaymentStatus.PAID ? 'text-[#10b981]' : 'text-slate-300'}`}>{inst.status === PaymentStatus.PAID ? 'PAGO' : 'PENDIENTE'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-10 pb-10">
              <div className="bg-white border-2 border-[#10b981] p-8 rounded-[3rem] shadow-lg text-center space-y-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">WHATSAPP OFICIAL DE SOPORTE</p>
                <div className="flex items-center justify-center gap-4">
                  <i className="fa-brands fa-whatsapp text-[#10b981] text-5xl"></i>
                  <p className="text-5xl font-black text-slate-900 tracking-tighter">{state.settings.contactPhone || '---'}</p>
                </div>
                <p className="text-[#059669] text-[9px] font-black uppercase tracking-widest italic">PONTE EN CONTACTO PARA ABONOS O DUDAS</p>
              </div>
            </div>

            <div className="bg-slate-100 p-6 flex justify-between items-center text-slate-400">
              <p className="text-[9px] font-black uppercase tracking-widest">FINTECH {state.settings.companyName || 'DANTE'}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">GENERADO AUTOMÁTICAMENTE</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL COBRO DESDE EXPEDIENTE */}
      {showDossierPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-2 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden animate-scaleIn border border-white/20">
            <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-base font-black uppercase tracking-tighter">Registrar Abono</h3>
              <button onClick={() => setShowDossierPaymentModal(false)} className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setDossierPaymentMethod('cash')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all ${!dossierIsVirtual && !dossierIsRenewal ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Efectivo</button>
                <button onClick={() => setDossierPaymentMethod('virtual')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all ${dossierIsVirtual ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Transf.</button>
                <button onClick={() => setDossierPaymentMethod('renewal')} className={`py-3 rounded-lg text-[8px] font-black uppercase border transition-all ${dossierIsRenewal ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 active:bg-slate-100'}`}>Liquidar</button>
              </div>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input type="number" autoFocus value={dossierPaymentAmount} onChange={(e) => setDossierPaymentAmount(Number(e.target.value))} className="w-full pl-12 pr-5 py-8 text-3xl font-black bg-slate-50 rounded-2xl text-center outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-slate-900 shadow-inner" />
              </div>
              <button onClick={() => handleDossierAction(CollectionLogType.PAYMENT, dossierPaymentAmount)} disabled={isProcessingDossierAction} className="w-full font-black py-5 bg-emerald-600 text-white rounded-xl shadow-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                {isProcessingDossierAction ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-print"></i>} CONFIRMAR E IMPRIMIR
              </button>

              <button
                onClick={handleOpenPrinterConfig}
                className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-bluetooth-b"></i> CONFIGURAR IMPRESORA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACION IMPRESORA */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scaleIn">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-lg tracking-tighter">
                <i className="fa-brands fa-bluetooth-b text-blue-400 mr-2"></i>
                Configurar Impresora
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-white/50 hover:text-white">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-6">
                <button
                  onClick={handleScanPrinters}
                  disabled={scanningPrinters}
                  className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${scanningPrinters ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                >
                  {scanningPrinters ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> BUSCANDO...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-magnifying-glass"></i> BUSCAR DISPOSITIVOS
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {printerDevices.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fa-solid fa-print text-4xl mb-2 opacity-20"></i>
                    <p className="text-[10px] font-bold uppercase">No se encontraron dispositivos</p>
                    <p className="text-[9px] mt-2">Asegurate de haber vinculado tu impresora desde los ajustes de Bluetooth de Android.</p>
                  </div>
                ) : (
                  printerDevices.map((dev, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPrinter(dev)}
                      className="w-full text-left p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-700 uppercase text-xs">{dev.name || 'Dispositivo Desconocido'}</p>
                          <p className="font-mono text-[10px] text-slate-400">{dev.id}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500"></i>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGTHBOX / VISOR DE IMAGENES COMPLETO */}
      {viewingImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fadeIn">
          <button onClick={() => setViewingImage(null)} className="absolute top-4 right-4 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all z-50">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
          <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
            <img src={viewingImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN ABONO */}
      {showEditLogModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-sm w-full animate-scaleIn shadow-2xl border border-white/20">
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 text-center">Corregir Abono</h3>
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                <input type="number" autoFocus value={newLogAmount} onChange={e => setNewLogAmount(Number(e.target.value))} className="w-full pl-10 pr-4 py-6 bg-white border border-slate-300 rounded-2xl font-black text-3xl text-center text-slate-950 outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner" />
              </div>
              <button onClick={handleSaveEditedLog} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Guardar Corrección</button>
              <button onClick={() => setShowEditLogModal(false)} className="w-full py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES ADICIONALES */}
      {showRenewModal && clientInLegajo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full animate-scaleIn mobile-scroll-container border border-white/10 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <i className="fa-solid fa-arrows-rotate text-7xl text-blue-500"></i>
            </div>

            <div className="relative z-10 text-center mb-8">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <i className="fa-solid fa-arrows-rotate text-3xl text-blue-500"></i>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Renovar Crédito</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Establecer nuevas condiciones</p>
            </div>

            <div className="space-y-5 pb-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nuevo Capital</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">$</span>
                  <input
                    type="number"
                    value={renewForm.principal}
                    onChange={e => setRenewForm({ ...renewForm, principal: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-4 bg-white border border-slate-700 rounded-2xl font-black text-black text-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Interés %</label>
                  <input
                    type="number"
                    value={renewForm.interestRate}
                    onChange={e => setRenewForm({ ...renewForm, interestRate: Number(e.target.value) })}
                    className="w-full p-4 bg-white border border-slate-700 rounded-2xl font-black text-blue-700 text-lg text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nro. Cuotas</label>
                  <input
                    type="number"
                    value={renewForm.installments}
                    onChange={e => setRenewForm({ ...renewForm, installments: Number(e.target.value) })}
                    className="w-full p-4 bg-white border border-slate-700 rounded-2xl font-black text-black text-lg text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleRenewLoan}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-blue-900"
                >
                  <i className="fa-solid fa-rocket"></i>
                  ACTIVAR RENOVACIÓN
                </button>
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="w-full py-4 text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors"
                >
                  DESCARTAR CAMBIOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomNoPayModal && clientInLegajo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-md w-full animate-scaleIn">
            <h3 className="text-lg font-black text-slate-800 uppercase mb-4 tracking-tighter">Mensaje de No Pago</h3>
            <textarea value={customNoPayText} onChange={e => setCustomNoPayText(e.target.value)} rows={6} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Redacta el mensaje que se enviará automáticamente si el cliente no paga hoy..." />
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveCustomNoPay} className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">GUARDAR</button>
              <button onClick={() => setShowCustomNoPayModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
