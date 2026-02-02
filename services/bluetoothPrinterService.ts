// bluetoothPrinterService.ts
// Servicio Híbrido: Soporta Plugin Nativo (Cordova/Capacitor) y Web Bluetooth API

let connectedDevice: any = null;
let printerCharacteristic: any = null;
let isNativeConnection = false;

// Claves para persistencia
const PRINTER_STORAGE_KEY = 'saved_printer_address';

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

// 3. Conexión Genérica (Usa guardado o parámetro)
export const connectToPrinter = async (addressOrId?: string): Promise<boolean> => {
    // A. Intento Nativo
    if (await waitForPlugin()) {
        const bs = getBluetoothSerial();
        const savedAddress = localStorage.getItem(PRINTER_STORAGE_KEY);
        const targetAddress = addressOrId || savedAddress;

        if (!targetAddress) {
            console.log("No address provided and none saved.");
            return false;
        }

        return new Promise((resolve) => {
            bs.isConnected(
                () => {
                    isNativeConnection = true;
                    resolve(true);
                },
                () => {
                    bs.connect(
                        targetAddress,
                        () => {
                            isNativeConnection = true;
                            localStorage.setItem(PRINTER_STORAGE_KEY, targetAddress);
                            resolve(true);
                        },
                        (err: any) => {
                            console.error("Error connecting:", err);
                            resolve(false);
                        }
                    );
                }
            );
        });
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

// 4. Función de Impresión Universal
export const printText = async (rawText: string): Promise<boolean> => {
    const text = rawText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const bs = getBluetoothSerial();
    if (isNativeConnection && bs) {
        return new Promise((resolve) => {
            bs.write(text, () => resolve(true), () => resolve(false));
        });
    }

    if (!isNativeConnection && printerCharacteristic) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            await printerCharacteristic.writeValue(data);
            return true;
        } catch (e) {
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
