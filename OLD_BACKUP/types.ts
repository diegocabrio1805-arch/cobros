export enum Role {
  ADMIN = 'Administrador',
  COLLECTOR = 'Cobrador',
  MANAGER = 'Gerente'
}

export enum LoanStatus {
  ACTIVE = 'Activo',
  PAID = 'Pagado',
  DEFAULT = 'Mora'
}

export enum PaymentStatus {
  PENDING = 'Pendiente',
  PAID = 'Pagado',
  PARTIAL = 'Parcial'
}

export enum Frequency {
  DAILY = 'Diaria',
  WEEKLY = 'Semanal',
  BIWEEKLY = 'Quincenal',
  MONTHLY = 'Mensual'
}

export enum ExpenseCategory {
  TRANSPORT = 'Transporte',
  SALARIES = 'Sueldos',
  MARKETING = 'Marketing',
  OFFICE = 'Oficina',
  OTHERS = 'Otros'
}

export enum CollectionLogType {
  PAYMENT = 'PAGO',
  NO_PAGO = 'NO_PAGO'
}

export type Language = 'es' | 'en' | 'pt' | 'fr';

export type CountryCode = 
  | 'AR' | 'BO' | 'BR' | 'CL' | 'CO' | 'EC' | 'GY' | 'PY' | 'PE' | 'SR' | 'UY' | 'VE'
  | 'BZ' | 'CR' | 'SV' | 'GT' | 'HN' | 'NI' | 'PA'
  | 'CA' | 'US' | 'MX'
  | 'DO' | 'CU' | 'HT' | 'JM' | 'TT' | 'BS' | 'BB' | 'LC' | 'VC' | 'GD' | 'AG' | 'DM' | 'KN';

export interface AppSettings {
  language: Language;
  country: CountryCode;
  companyName?: string;
  contactPhone?: string;
  transferAlias?: string;
  technicalSupportPhone?: string; 
  numberFormat?: 'dot' | 'comma'; // 'dot' -> 1.000,00 | 'comma' -> 1,000.00
}

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  password?: string;
  blocked?: boolean; 
  expiryDate?: string; 
  managedBy?: string; // ID del Gerente que supervisa a este usuario
}

export interface Client {
  id: string;
  documentId: string; 
  name: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  addedBy?: string; 
  branchId?: string; // ID de la sucursal (Gerente) a la que pertenece
  profilePic?: string; 
  housePic?: string;   
  businessPic?: string; 
  documentPic?: string; 
  location?: {
    lat: number;
    lng: number;
  };
  domicilioLocation?: {
    lat: number;
    lng: number;
  };
  creditLimit: number;
  allowCollectorLocationUpdate?: boolean; 
  customNoPayMessage?: string; 
  /**
   * Indica si el cliente está activo para operaciones de crédito y cobro.
   */
  isActive?: boolean;
}

export interface Installment {
  number: number;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAmount: number;
}

export interface Loan {
  id: string;
  clientId: string;
  collectorId?: string; 
  branchId?: string; // ID de la sucursal (Gerente)
  principal: number;
  interestRate: number; 
  totalInstallments: number;
  frequency: Frequency;
  totalAmount: number;
  installmentValue: number;
  status: LoanStatus;
  createdAt: string;
  installments: Installment[];
  isRenewal?: boolean;
  customHolidays?: string[]; // Fechas YYYY-MM-DD omitidas en el cobro
}

export interface PaymentRecord {
  id: string;
  loanId: string;
  clientId: string;
  branchId?: string; // ID de la sucursal (Gerente)
  amount: number;
  date: string;
  installmentNumber: number;
  location?: { lat: number; lng: number };
  isVirtual?: boolean;
  isRenewal?: boolean; 
}

export interface CollectionLog {
  id: string;
  loanId: string;
  clientId: string;
  branchId?: string; // ID de la sucursal (Gerente)
  type: CollectionLogType;
  amount?: number;
  date: string;
  location: { lat: number; lng: number };
  isVirtual?: boolean;
  isRenewal?: boolean; 
  isOpening?: boolean;
  recordedBy?: string; // ID del usuario que marcó el abono
  notes?: string; // Nota opcional para el motivo de No Pago
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  branchId?: string; // ID de la sucursal (Gerente)
}

export interface CommissionBracket {
  maxMora: number; // Porcentaje máximo de mora (Ej: 20)
  payoutPercent: number; // Porcentaje de la comisión base que se paga (Ej: 100)
}

export interface AppState {
  clients: Client[];
  loans: Loan[];
  payments: PaymentRecord[];
  expenses: Expense[];
  collectionLogs: CollectionLog[];
  users: User[];
  currentUser: User | null;
  commissionPercentage: number;
  commissionBrackets: CommissionBracket[];
  initialCapital: number;
  settings: AppSettings;
}