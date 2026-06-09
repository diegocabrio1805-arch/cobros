const fs = require('fs');
const path = require('path');

const compPath = path.join(__dirname, 'components', 'Settings.tsx');
let compCode = fs.readFileSync(compPath, 'utf8');

const replacements = [
  ['>Opciones<', '>{t.settingsPage?.optionsTitle || "Opciones"}<'],
  ['>Configuración Regional<', '>{t.settings.title || "Configuración Regional"}<'],
  ['>CONFIGURAR SOPORTE TÉCNICO<', '>{t.settingsPage?.supportBtn || "CONFIGURAR SOPORTE TÉCNICO"}<'],
  ['>Datos de la Empresa<', '>{t.settingsPage?.companyDataTitle || "Datos de la Empresa"}<'],
  ['>Para Recibos y Legajos<', '>{t.settingsPage?.companyDataDesc || "Para Recibos y Legajos"}<'],
  ['>Nombre de la Empresa (Título App)<', '>{t.settingsPage?.companyNameLabel || "Nombre de la Empresa (Título App)"}<'],
  ['>Teléfono Público<', '>{t.settingsPage?.publicPhoneLabel || "Teléfono Público"}<'],
  ['>Marca<', '>{t.settingsPage?.brandLabel || "Marca"}<'],
  ['>ID Empresa (Legajo)<', '>{t.settingsPage?.companyIdLabel || "ID Empresa (Legajo)"}<'],
  ['>Nombres de banco o cuentas bancarias<', '>{t.settingsPage?.bankNamesLabel || "Nombres de banco o cuentas bancarias"}<'],
  ['>Numero de cuenta o alias de la empresa<', '>{t.settingsPage?.accountNumberLabel || "Numero de cuenta o alias de la empresa"}<'],
  ['> Negrita<', '>{t.settingsPage?.boldBtn || "Negrita"}<'],
  ['>Normal<', '>{t.settingsPage?.sizeNormal || "Normal"}<'],
  ['>Med.<', '>{t.settingsPage?.sizeMedium || "Med."}<'],
  ['>Gnd.<', '>{t.settingsPage?.sizeLarge || "Gnd."}<'],
  ['>Mediano<', '>{t.settingsPage?.sizeMedium || "Mediano"}<'],
  ['>Grande<', '>{t.settingsPage?.sizeLarge || "Grande"}<'],
  ['>Estilos de Impresión (Resaltado)<', '>{t.settingsPage?.printStylesTitle || "Estilos de Impresión"}<'],
  ['>Nombre de Empresa<', '>{t.settingsPage?.printNameLabel || "Nombre de Empresa"}<'],
  ['>ID Legal (NIT/RUC)<', '>{t.settingsPage?.printIdLabel || "ID Legal (NIT/RUC)"}<'],
  ['>Teléfono Soporte<', '>{t.settingsPage?.printPhoneLabel || "Teléfono Soporte"}<'],
  ['>Margen Final (Cola del Recibo)<', '>{t.settingsPage?.printMarginTitle || "Margen Final"}<'],
  ['>Largo del papel sobrante<', '>{t.settingsPage?.printMarginDesc || "Largo del papel sobrante"}<'],
  ['>LÍNEAS<', '>{t.settingsPage?.lines || "LÍNEAS"}<'],
  ['GUARDAR DATOS DE EMPRESA', '{t.settingsPage?.saveCompanyData || "GUARDAR DATOS DE EMPRESA"}'],
  ['>Integración de Bancard (Cobro QR)<', '>{t.settingsPage?.bancardTitle || "Integración de Bancard"}<'],
  ['>Configuración de Credenciales para Cobro Móvil<', '>{t.settingsPage?.bancardDesc || "Configuración de Credenciales"}<'],
  ['>Código de Comercio (Shop ID)<', '>{t.settingsPage?.shopIdLabel || "Código de Comercio"}<'],
  ['>Clave Pública (Public Key)<', '>{t.settingsPage?.publicKeyLabel || "Clave Pública"}<'],
  ['>Clave Privada (Private Key)<', '>{t.settingsPage?.privateKeyLabel || "Clave Privada"}<'],
  ["{isLoadingBancard ? 'GUARDANDO...' : 'GUARDAR CREDENCIALES DE BANCARD'}", "{isLoadingBancard ? (t.settingsPage?.saving || 'GUARDANDO...') : (t.settingsPage?.saveBancard || 'GUARDAR CREDENCIALES DE BANCARD')}"],
  ['>Zona de Estabilización<', '>{t.settingsPage?.syncZoneTitle || "Zona de Estabilización"}<'],
  ['>Solución de Sincronización<', '>{t.settingsPage?.syncZoneDesc || "Solución de Sincronización"}<'],
  ["{isOnline ? 'Conexión Estable' : 'Sin Internet Real'}", "{isOnline ? (t.settingsPage?.connStable || 'Conexión Estable') : (t.settingsPage?.connOffline || 'Sin Internet Real')}"],
  ["{isOnline ? 'La App tiene acceso verificado a los servidores.' : 'Detectamos problemas de conexión. Los datos se guardarán localmente.'}", "{isOnline ? (t.settingsPage?.connStableDesc || 'La App tiene acceso verificado a los servidores.') : (t.settingsPage?.connOfflineDesc || 'Detectamos problemas de conexión. Los datos se guardarán localmente.')}"],
  ["{isSyncing ? 'SINCRONIZANDO...' : 'FORZAR SINCRONIZACIÓN'}", "{isSyncing ? (t.settingsPage?.syncing || 'SINCRONIZANDO...') : (t.settingsPage?.forceSyncBtn || 'FORZAR SINCRONIZACIÓN')}"],
  ['>LIMPIAR COLA<', '>{t.settingsPage?.clearQueueBtn || "LIMPIAR COLA"}<'],
  ['>REPARAR PROBL. SINCRONIZACIÓN<', '>{t.settingsPage?.repairSyncBtn || "REPARAR PROBL. SINCRONIZACIÓN"}<'],
  ['>ACTUALIZACIÓN PROFUNDA<', '>{t.settingsPage?.deepUpdateBtn || "ACTUALIZACIÓN PROFUNDA"}<'],
  ['>* Use "Forzar Sincronización" si sus pagos no aparecen. Use "Reparación Profunda" solo si el problema persiste tras forzar.<', '>{t.settingsPage?.syncWarning || "* Use Forzar Sincronización..."}<'],
  ['>Formato de Moneda<', '>{t.settingsPage?.currencyFormatTitle || "Formato de Moneda"}<'],
  ['>PUNTO DE MIL<', '>{t.settingsPage?.dotFormat || "PUNTO DE MIL"}<'],
  ['>PUNTO DE COMA<', '>{t.settingsPage?.commaFormat || "PUNTO DE COMA"}<'],
  ['>Configuración de Impresora<', '>{t.settingsPage?.printerConfigTitle || "Configuración de Impresora"}<'],
  ["{scanningPrinters ? 'BUSCANDO...' : 'BUSCAR IMPRESORA'}", "{scanningPrinters ? (t.settingsPage?.searching || 'BUSCANDO...') : (t.settingsPage?.searchPrinterBtn || 'BUSCAR IMPRESORA')}"],
  ['>PROBAR IMPRESIÓN<', '>{t.settingsPage?.testPrintBtn || "PROBAR IMPRESIÓN"}<'],
  ['>* Conecte su impresora térmica vía Bluetooth para imprimir recibos automáticamente tras cada cobro.<', '>{t.settingsPage?.printerWarning || "* Conecte su impresora..."}<'],
  ['Vinculado:', '{t.settingsPage?.linked || "Vinculado:"}'],
  ['>Idioma App<', '>{t.settings.language || "Idioma App"}<'],
  ['>País de Operación<', '>{t.settings.country || "País de Operación"}<'],
  ['>Ajusta festivos y formato de moneda.<', '>{t.settings.countryDesc || "Ajusta festivos y formato de moneda."}<'],
  ['GUARDAR Y SALIR', '{t.settingsPage?.saveAndExit || "GUARDAR Y SALIR"}']
];

for (const [from, to] of replacements) {
  compCode = compCode.split(from).join(to);
}

fs.writeFileSync(compPath, compCode, 'utf8');
