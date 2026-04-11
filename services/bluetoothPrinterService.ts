// bluetoothPrinterService.ts
// Servicio Híbrido Optimizado: Soporta Plugin Nativo (Cordova/Capacitor) y Web Bluetooth API
// Optimizaciones para gama baja: Chunking, Retries y Timeouts extendidos.

let connectedDevice: any = null;
let printerCharacteristic: any = null;
let isNativeConnection = false;
let isCurrentlyPrinting = false;
let connectionKeeperInterval: any = null; // Interval ID for keep-alive

// Cola de tickets pendientes: Si la impresora estaba apagada, se imprimen al reconectar
const pendingPrintQueue: { text: string; timestamp: number }[] = [];
const MAX_PENDING_QUEUE = 10; // Máximo de tickets guardados en memoria

// Claves para persistencia
const PRINTER_STORAGE_KEY = 'saved_printer_address';

// Configuración OPTIMIZADA
const CHUNK_SIZE = 200; // Mantenido a 200
const CHUNK_DELAY = 25; // Aumentado (antes 15ms) para no saturar buffer de impresoras baratas
const CONNECTION_RETRIES = 5; // Aumentado para mayor tolerancia a fallos
const RETRY_DELAY = 500; // 500ms entre intentos iniciales
const KEEPER_INTERVAL_MS = 15000; // 15s: Envío de ping real (DLE EOT 1) para evitar sleep

// Helper seguro para obtener la referencia al plugin
const getBluetoothSerial = (): any => {
    // @ts-ignore
    return window.BluetoothSerial || window.bluetoothSerial || (window.cordova ? (window.cordova.plugins && window.cordova.plugins.BluetoothSerial) : null);
};

// Helper para esperar al plugin con timeout
const waitForPlugin = async (): Promise<boolean> => {
    let attempts = 0;
    while (attempts < 20) { // 2 segundos
        if (getBluetoothSerial()) return true;
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return !!getBluetoothSerial();
};

// Utility: Espera asíncrona
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Verificar estado y activar Bluetooth
export const checkBluetoothEnabled = async (): Promise<boolean> => {
    try {
        await waitForPlugin();
        const bs = getBluetoothSerial();
        if (!bs) return false;

        return new Promise((resolve) => {
            bs.isEnabled(
                () => resolve(true),
                () => resolve(false)
            );
        });
    } catch (e) {
        console.warn("Exception checkBluetoothEnabled:", e);
        return false;
    }
};

export const enableBluetooth = async (): Promise<boolean> => {
    try {
        await waitForPlugin();
        const bs = getBluetoothSerial();
        if (!bs) return false;

        return new Promise((resolve) => {
            bs.enable(
                () => resolve(true),
                () => resolve(false)
            );
        });
    } catch (e) {
        console.warn("Exception enableBluetooth:", e);
        return false;
    }
};

// 2. Listar dispositivos pareados (Solo Nativo)
export const listBondedDevices = async (): Promise<any[]> => {
    try {
        await waitForPlugin();
        const bs = getBluetoothSerial();
        if (!bs) return [];

        return new Promise((resolve, reject) => {
            bs.list(
                (devices: any[]) => resolve(devices),
                (err: any) => reject(err)
            );
        });
    } catch (e) {
        console.warn("Exception listBondedDevices:", e);
        return [];
    }
};

// 3. Conexión Genérica Robusta
const attemptNativeConnection = async (address: string, attemptNumber = 1, silent = false): Promise<boolean> => {
    try {
        const bs = getBluetoothSerial();
        return new Promise((resolve) => {
            if (!silent) console.log(`[Bluetooth] Connection attempt ${attemptNumber} to ${address}...`);
            bs.connect(
                address,
                () => {
                    if (!silent) console.log(`[Bluetooth] ✓ Connected successfully on attempt ${attemptNumber}`);
                    isNativeConnection = true;
                    connectedDevice = { address };
                    localStorage.setItem(PRINTER_STORAGE_KEY, address);
                    resolve(true);
                },
                (err: any) => {
                    if (!silent) console.warn(`[Bluetooth] ✗ Attempt ${attemptNumber} failed:`, err?.message || err);
                    resolve(false);
                }
            );
        });
    } catch (e) {
        console.warn(`[Bluetooth] Exception in attemptNativeConnection ${attemptNumber}:`, e);
        return false;
    }
};

export const connectToPrinter = async (addressOrId?: string, forceReconnect = false, silent = false): Promise<boolean> => {
    // A. Intento Nativo con Retries
    if (await waitForPlugin()) {
        const bs = getBluetoothSerial();
        const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
        const targetAddress = addressOrId || savedAddress;

        if (!targetAddress) {
            if (!silent) console.log("No address provided and none saved.");
            return false;
        }

        try {

        // FAST PATH: Verificar si ya está conectado al dispositivo correcto
        if (!forceReconnect) {
            const isConnectedNow = await new Promise<boolean>(r => bs.isConnected(() => r(true), () => r(false)));
            if (isConnectedNow) {
                if (!silent) console.log('[Bluetooth] Fast Path: Already connected');
                isNativeConnection = true;
                connectedDevice = { address: targetAddress };
                return true;
            }
        }

        // Solo desconectar si forzamos reconexión o falló el chequeo rápido
        if (forceReconnect) {
            try {
                await new Promise<void>(r => bs.disconnect(() => r(), () => r()));
                await sleep(500); // Increased wait time for complete hardware reset
            } catch (e) {
                if (!silent) console.log('[Bluetooth] No previous connection to clear');
            }
        }

        // Intentar conectar con retries optimizados
        if (!silent) console.log(`[Bluetooth] Starting connection to ${targetAddress}...`);
        for (let i = 0; i < CONNECTION_RETRIES; i++) {
            const success = await attemptNativeConnection(targetAddress, i + 1, silent);
            if (success) {
                await sleep(200); // Reduced stabilization delay
                return true;
            }
            if (i < CONNECTION_RETRIES - 1) {
                // Faster retries: 500ms, 1000ms, 1500ms
                const delay = RETRY_DELAY * (i + 1);
                if (!silent) console.log(`[Bluetooth] Waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        }
        return false;
        } catch (err) {
            if (!silent) console.warn("[Bluetooth] Exception in connectToPrinter:", err);
            return false;
        }
    }

    // B. Fallback Web Bluetooth (si no hay plugin)
    if (!('bluetooth' in navigator)) return false;

    try {
        // @ts-ignore
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristics = await service.getCharacteristics();
        printerCharacteristic = characteristics[0];
        connectedDevice = device;
        isNativeConnection = false;
        return true;
    } catch (e) {
        return false;
    }
};


// 4. COLA DE IMPRESIÓN PENDIENTE
// Permite que los tickets de cobros se impriman automáticamente al encender la impresora.
export const queuePrintJob = (rawText: string): void => {
    if (pendingPrintQueue.length >= MAX_PENDING_QUEUE) {
        pendingPrintQueue.shift(); // Eliminar el más antiguo si la cola está llena
    }
    pendingPrintQueue.push({ text: rawText, timestamp: Date.now() });
    console.log(`[BT Queue] Ticket encolado. Cola actual: ${pendingPrintQueue.length}`);
};

const drainPrintQueue = async (): Promise<void> => {
    if (pendingPrintQueue.length === 0) return;
    console.log(`[BT Queue] Procesando ${pendingPrintQueue.length} ticket(s) pendiente(s)...`);
    while (pendingPrintQueue.length > 0) {
        const job = pendingPrintQueue.shift()!;
        // Ignorar tickets de más de 4 horas
        if (Date.now() - job.timestamp > 4 * 60 * 60 * 1000) {
            console.log('[BT Queue] Ticket expirado, descartando.');
            continue;
        }
        const success = await printText(job.text);
        if (!success) {
            // Re-encolar al frente si falló
            pendingPrintQueue.unshift(job);
            console.warn('[BT Queue] Fallo al imprimir, reintentando en el próximo ciclo del keeper.');
            break;
        }
        console.log('[BT Queue] Ticket impreso exitosamente.');
        await sleep(500); // Pequeña pausa entre tickets
    }
};

// 5. Función de Impresión Robusta con Chunking Rápido
export const printText = async (rawText: string, retryCount = 0): Promise<boolean> => {
    if (isCurrentlyPrinting && retryCount === 0) {
        console.warn("Print already in progress. Skipping duplicate request.");
        return false;
    }

    isCurrentlyPrinting = true;
    const bs = getBluetoothSerial();

    // Asegurar conexión antes de imprimir (sin forzar desconexión inicial)
    const connected = await isPrinterConnected();
    if (!connected) {
        console.log("Printer not connected. Attempting fast connection...");
        const reconnected = await connectToPrinter(undefined, false);
        if (!reconnected) {
            // Encolar el trabajo para cuando la impresora se encienda
            if (retryCount === 0) {
                console.log('[BT Queue] Impresora no disponible. Encolando ticket para imprimir al encender.');
                queuePrintJob(rawText);
            }
            isCurrentlyPrinting = false;
            return false;
        }
    }

    // Definición de Comandos ESC/POS
    const ESC = '\x1B';
    const GS = '\x1D';
    const CMD_BOLD_ON = ESC + 'E' + '\x01';
    const CMD_BOLD_OFF = ESC + 'E' + '\x00';
    const CMD_SIZE_LARGE = GS + '!' + '\x11'; // Doble ancho y alto
    const CMD_SIZE_MEDIUM = GS + '!' + '\x01'; // Doble alto, ancho normal
    const CMD_SIZE_NORMAL = GS + '!' + '\x00';

    // --- MARGIN LOGIC ---
    const getPrintMargin = (): number => {
        const saved = localStorage.getItem('printer_margin_bottom');
        const val = saved ? parseInt(saved, 10) : 2; // Default to 2 lines if not set (matches Settings default)
        return isNaN(val) ? 2 : val;
    };
    const marginLines = getPrintMargin();
    const marginText = '\n'.repeat(marginLines);

    // Append margin to the raw text (Feed paper)
    const finalText = rawText + marginText;

    // Normalizar texto y parsear etiquetas
    const parts = finalText.split(/(<B[01]>|<GS[012]>)/);

    const sendChunk = async (chunk: string): Promise<void> => {
        if (chunk === '<B1>') return bs ? bs.write(CMD_BOLD_ON) : printerCharacteristic.writeValue(new Uint8Array([0x1B, 0x45, 0x01]));
        if (chunk === '<B0>') return bs ? bs.write(CMD_BOLD_OFF) : printerCharacteristic.writeValue(new Uint8Array([0x1B, 0x45, 0x00]));
        if (chunk === '<GS1>') return bs ? bs.write(CMD_SIZE_LARGE) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x11]));
        if (chunk === '<GS2>') return bs ? bs.write(CMD_SIZE_MEDIUM) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x01]));
        if (chunk === '<GS0>') return bs ? bs.write(CMD_SIZE_NORMAL) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x00]));

        const cleanText = chunk.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (isNativeConnection && bs) {
            // Optimización: Enviar chunks más grandes con menos delay
            for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
                await new Promise<void>((res, rej) => bs.write(cleanText.substring(i, i + CHUNK_SIZE), res, rej));
                await sleep(CHUNK_DELAY); // 15ms
            }
        } else if (printerCharacteristic) {
            const encoder = new TextEncoder();
            for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
                await printerCharacteristic.writeValue(encoder.encode(cleanText.substring(i, i + CHUNK_SIZE)));
                await sleep(CHUNK_DELAY);
            }
        }
    };

    try {
        for (const part of parts) {
            if (part) await sendChunk(part);
        }
        return true;
    } catch (e) {
        console.warn("Print failed. Attempting recovery...", e);
        if (retryCount < 1) { // Solo 1 reintento para no bloquear
            // Forzar reconexión "limpia" solo si falló la escritura
            const reconnected = await connectToPrinter(undefined, true);
            if (reconnected) {
                return printText(rawText, retryCount + 1);
            }
        }
        return false;
    } finally {
        isCurrentlyPrinting = false;
    }
};

export const isPrintingNow = () => isCurrentlyPrinting;

export const isPrinterConnected = async (): Promise<boolean> => {
    try {
        const bs = getBluetoothSerial();
        if (isNativeConnection && bs) {
            return new Promise((resolve) => {
                bs.isConnected(() => resolve(true), () => resolve(false));
            });
        }
        return !!(connectedDevice && connectedDevice.gatt.connected);
    } catch (e) {
        console.warn("Error in isPrinterConnected:", e);
        return false;
    }
};

// 5. CONNECTION KEEPER (Mantiene la conexi?n viva y reconecta autom?ticamente)
export const forceReconnect = async (): Promise<boolean> => {
    const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (!savedAddress) return false;
    console.log("[Bluetooth] Forcing fresh reconnection...");
    return await connectToPrinter(savedAddress, true, false);
};

export const startConnectionKeeper = () => {
    if (connectionKeeperInterval) return;

    const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (!savedAddress) {
        console.log("[Bluetooth Keeper] No printer saved. Keeper will not start.");
        return;
    }

    console.log("[Bluetooth Keeper] Starting background connection keeper...");
    
    // Configurar listener de Capacitor para reconectar INMEDIATAMENTE al volver a la app
    try {
        const { App: CapApp } = require('@capacitor/app');
        CapApp.addListener('appStateChange', async (state: any) => {
            if (state.isActive) {
                const currentSavedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
                if (currentSavedAddress) {
                    console.log("[Bluetooth Keeper] App resumed. Reconnecting eagerly...");
                    try {
                        const connected = await isPrinterConnected();
                        if (!connected) {
                            const reconnected = await connectToPrinter(currentSavedAddress, false, true);
                            // Si reconectó y hay tickets pendientes, imprimirlos
                            if (reconnected && pendingPrintQueue.length > 0) {
                                console.log('[Bluetooth Keeper] App reactiva + impresora reconectada. Imprimiendo tickets pendientes...');
                                setTimeout(drainPrintQueue, 1500);
                            }
                        } else if (pendingPrintQueue.length > 0) {
                            // Impresora ya estaba conectada, imprimir directamente
                            console.log('[Bluetooth Keeper] App reactiva. Impresora disponible. Procesando cola...');
                            setTimeout(drainPrintQueue, 500);
                        }
                    } catch (err) {
                        console.warn("[Bluetooth Keeper] Eager reconnect error:", err);
                    }
                }
            }
        });
    } catch (e) {
        console.log("Capacitor App module not available for BT keeper");
    }

    connectionKeeperInterval = setInterval(async () => {
        if (isCurrentlyPrinting) return;

        const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
        if (!savedAddress) return;

        try {
            const connected = await isPrinterConnected();
            if (!connected) {
                console.log("[Bluetooth Keeper] Lost connection. Attempting silent reconnect...");
                const wasReconnected = await connectToPrinter(savedAddress, false, true);
                // Si logró reconectar, procesar tickets pendientes
                if (wasReconnected && pendingPrintQueue.length > 0) {
                    console.log('[Bluetooth Keeper] Reconectado. Procesando cola de tickets pendientes...');
                    setTimeout(drainPrintQueue, 1000); // Esperar 1s para que la impresora esté lista
                }
            } else {
                // Primero procesar cola pendiente si hay tickets
                if (pendingPrintQueue.length > 0 && !isCurrentlyPrinting) {
                    console.log('[Bluetooth Keeper] Impresora activa. Procesando tickets pendientes...');
                    drainPrintQueue();
                } else {
                    // Ping activo (DLE EOT 1 - Real-time status) para evitar que la impresora entre en auto-sleep.
                    // Es un comando invisible que NO avanza el papel.
                    const bs = getBluetoothSerial();
                    if (isNativeConnection && bs) {
                        const pingCmd = '\x10\x04\x01';
                        bs.write(pingCmd, 
                            () => { /* Ping OK, hardware despierto */ }, 
                            () => {
                                console.log("[Bluetooth Keeper] Ping failed, socket dead. Reconnecting...");
                                connectToPrinter(savedAddress, true, true);
                            }
                        );
                    }
                }
            }
        } catch (e) {
            console.warn("[Bluetooth Keeper] Error checking status:", e);
        }
    }, KEEPER_INTERVAL_MS);
};

export const stopConnectionKeeper = () => {
    if (connectionKeeperInterval) {
        clearInterval(connectionKeeperInterval);
        connectionKeeperInterval = null;
        console.log("[Bluetooth Keeper] Stopped.");
    }
};
