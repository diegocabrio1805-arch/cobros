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
const CONNECTION_RETRIES = 5;
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

// 4. Función de Impresión Robusta con Chunking y Reintento de Conexión
export const printText = async (rawText: string, retryCount = 0): Promise<boolean> => {
    const bs = getBluetoothSerial();

    // Asegurar conexión antes de imprimir
    const connected = await isPrinterConnected();
    if (!connected) {
        console.log("Printer not connected. Attempting to connect...");
        const reconnected = await connectToPrinter();
        if (!reconnected) return false;
    }

    // Definición de Comandos ESC/POS
    const ESC = '\x1B';
    const GS = '\x1D';
    const CMD_BOLD_ON = ESC + 'E' + '\x01';
    const CMD_BOLD_OFF = ESC + 'E' + '\x00';
    const CMD_SIZE_LARGE = GS + '!' + '\x11'; // Doble ancho y alto
    const CMD_SIZE_MEDIUM = GS + '!' + '\x01'; // Doble alto, ancho normal
    const CMD_SIZE_NORMAL = GS + '!' + '\x00';

    // Normalizar texto y parsear etiquetas
    // Mantenemos las etiquetas para el split pero quitamos acentos del resto
    const parts = rawText.split(/(<B[01]>|<GS[012]>)/);

    const sendChunk = async (chunk: string): Promise<void> => {
        if (chunk === '<B1>') return bs ? bs.write(CMD_BOLD_ON) : printerCharacteristic.writeValue(new Uint8Array([0x1B, 0x45, 0x01]));
        if (chunk === '<B0>') return bs ? bs.write(CMD_BOLD_OFF) : printerCharacteristic.writeValue(new Uint8Array([0x1B, 0x45, 0x00]));
        if (chunk === '<GS1>') return bs ? bs.write(CMD_SIZE_LARGE) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x11]));
        if (chunk === '<GS2>') return bs ? bs.write(CMD_SIZE_MEDIUM) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x01]));
        if (chunk === '<GS0>') return bs ? bs.write(CMD_SIZE_NORMAL) : printerCharacteristic.writeValue(new Uint8Array([0x1D, 0x21, 0x00]));

        const cleanText = chunk.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (isNativeConnection && bs) {
            for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
                await new Promise<void>((res, rej) => bs.write(cleanText.substring(i, i + CHUNK_SIZE), res, rej));
                await sleep(CHUNK_DELAY);
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
        console.warn("Print failed. Retry...", e);
        if (retryCount < 2) {
            if (isNativeConnection && bs) await new Promise<void>(r => bs.disconnect(() => r(), () => r()));
            await sleep(1500);
            return (await connectToPrinter()) ? printText(rawText, retryCount + 1) : false;
        }
        return false;
    }
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
