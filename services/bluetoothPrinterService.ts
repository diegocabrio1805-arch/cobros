// bluetoothPrinterService.ts
// Servicio Híbrido Optimizado: Soporta Plugin Nativo (Cordova/Capacitor) y Web Bluetooth API
// Optimizaciones para gama baja: Chunking, Retries y Timeouts extendidos.

let connectedDevice: any = null;
let printerCharacteristic: any = null;
let isNativeConnection = false;

// Claves para persistencia
const PRINTER_STORAGE_KEY = 'saved_printer_address';

// Configuración para dispositivos gama baja
const CHUNK_SIZE = 100; // Caracteres por paquete (reducido para evitar buffer overflow)
const CHUNK_DELAY = 100; // ms de espera entre paquetes
const CONNECTION_RETRIES = 3;
const RETRY_DELAY = 1500; // ms entre intentos

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
    await waitForPlugin();
    const bs = getBluetoothSerial();
    if (!bs) return false;

    return new Promise((resolve) => {
        bs.isEnabled(
            () => resolve(true),
            () => resolve(false)
        );
    });
};

export const enableBluetooth = async (): Promise<boolean> => {
    await waitForPlugin();
    const bs = getBluetoothSerial();
    if (!bs) return false;

    return new Promise((resolve) => {
        bs.enable(
            () => resolve(true),
            () => resolve(false)
        );
    });
};

// 2. Listar dispositivos pareados (Solo Nativo)
export const listBondedDevices = async (): Promise<any[]> => {
    await waitForPlugin();
    const bs = getBluetoothSerial();
    if (!bs) return [];

    return new Promise((resolve, reject) => {
        bs.list(
            (devices: any[]) => resolve(devices),
            (err: any) => reject(err)
        );
    });
};

// 3. Conexión Genérica Robusta (con Retries)
const attemptNativeConnection = async (address: string): Promise<boolean> => {
    const bs = getBluetoothSerial();
    return new Promise((resolve) => {
        bs.connect(
            address,
            () => {
                isNativeConnection = true;
                localStorage.setItem(PRINTER_STORAGE_KEY, address);
                resolve(true);
            },
            (err: any) => {
                console.warn(`Connection attempt failed to ${address}:`, err);
                resolve(false);
            }
        );
    });
};

export const connectToPrinter = async (addressOrId?: string): Promise<boolean> => {
    // A. Intento Nativo con Retries
    if (await waitForPlugin()) {
        const bs = getBluetoothSerial();
        const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
        const targetAddress = addressOrId || savedAddress;

        if (!targetAddress) {
            console.log("No address provided and none saved.");
            return false;
        }

        // Verificar si ya está conectado al dispositivo correcto
        const isConnectedNow = await new Promise<boolean>(r => bs.isConnected(() => r(true), () => r(false)));
        if (isConnectedNow) {
            isNativeConnection = true;
            return true;
        }

        // Intentar conectar con retries
        console.log(`Iniciando conexión robusta a ${targetAddress}...`);
        for (let i = 0; i < CONNECTION_RETRIES; i++) {
            const success = await attemptNativeConnection(targetAddress);
            if (success) {
                console.log("Conectado exitosamente.");
                // Pequeña pausa para estabilizar conexión en gama baja
                await sleep(500);
                return true;
            }
            if (i < CONNECTION_RETRIES - 1) {
                console.log(`Reintentando conexión (${i + 1}/${CONNECTION_RETRIES})...`);
                await sleep(RETRY_DELAY);
            }
        }
        return false;
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

// 4. Función de Impresión Robusta con Chunking
export const printText = async (rawText: string): Promise<boolean> => {
    // Asegurar conexión antes de imprimir
    const connected = await isPrinterConnected();
    if (!connected) {
        const reconnected = await connectToPrinter();
        if (!reconnected) return false;
    }

    const text = rawText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const bs = getBluetoothSerial();

    // -- Lógica Nativa (Chunking) --
    if (isNativeConnection && bs) {
        // Dividir texto en chunks pequeños para no saturar buffer de impresora barata/vieja
        const chunks = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
            chunks.push(text.substring(i, i + CHUNK_SIZE));
        }

        console.log(`Enviando ${chunks.length} paquetes de datos a la impresora...`);

        try {
            for (const chunk of chunks) {
                await new Promise<void>((resolve, reject) => {
                    bs.write(chunk, () => resolve(), (err: any) => reject(err));
                });
                // Pausa obligatoria entre chunks para gama baja
                await sleep(CHUNK_DELAY);
            }
            return true;
        } catch (e) {
            console.error("Error writing chunk to printer:", e);
            return false;
        }
    }

    // -- Lógica Web Bluetooth --
    if (!isNativeConnection && printerCharacteristic) {
        try {
            const encoder = new TextEncoder();
            // Web Bluetooth también se beneficia del chunking
            const chunks = [];
            for (let i = 0; i < text.length; i += CHUNK_SIZE) {
                chunks.push(text.substring(i, i + CHUNK_SIZE));
            }

            for (const chunk of chunks) {
                const data = encoder.encode(chunk);
                await printerCharacteristic.writeValue(data);
                await sleep(CHUNK_DELAY);
            }
            return true;
        } catch (e) {
            console.error("Web Bluetooth write error:", e);
            return false;
        }
    }
    return false;
};

export const isPrinterConnected = async (): Promise<boolean> => {
    const bs = getBluetoothSerial();
    if (isNativeConnection && bs) {
        return new Promise((resolve) => {
            bs.isConnected(() => resolve(true), () => resolve(false));
        });
    }
    return !!(connectedDevice && connectedDevice.gatt.connected);
};
