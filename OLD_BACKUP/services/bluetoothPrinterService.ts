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
            alert("No hay impresora configurada. Por favor usa el botón 'CONFIGURAR IMPRESORA' primero.");
            return false;
        }

        return new Promise((resolve) => {
            // Verificar si ya estamos conectados
            bs.isConnected(
                () => {
                    console.log("Ya estaba conectado");
                    isNativeConnection = true;
                    resolve(true);
                },
                () => {
                    console.log("Intentando conectar a:", targetAddress);
                    bs.connect(
                        targetAddress,
                        () => {
                            console.log("Conectado exitosamente!");
                            isNativeConnection = true;
                            localStorage.setItem(PRINTER_STORAGE_KEY, targetAddress); // Guardar éxito
                            resolve(true);
                        },
                        (err: any) => {
                            console.error("Error conectando:", err);
                            alert(`Error conectando a impresora (${targetAddress}). Verifica que esté encendida.`);
                            resolve(false);
                        }
                    );
                }
            );
        });
    }

    // B. Intento Web Bluetooth (Fallback)
    // @ts-ignore
    if (!('bluetooth' in navigator)) {
        alert("Bluetooth no disponible. Si estás en Android, el plugin falló al cargar.");
        return false;
    }

    try {
        console.log("Iniciando WebBluetooth...");
        // @ts-ignore
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
        });

        const server = await device.gatt.connect();

        // Intentar servicios comunes de impresoras
        const serviceParams = ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'];
        let service;

        for (const uuid of serviceParams) {
            try { service = await server.getPrimaryService(uuid); break; } catch (e) { }
        }

        if (!service) throw new Error("Servicio de impresión no soportado.");

        const characteristics = await service.getCharacteristics();
        // Usar la primera característica de escritura
        printerCharacteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || characteristics[0];

        connectedDevice = device;
        isNativeConnection = false;
        return true;

    } catch (error: any) {
        if (!error.message?.includes('cancelled')) alert("Error WebBluetooth: " + error.message);
        return false;
    }
};

// 4. Función de Impresión Universal
export const printText = async (rawText: string): Promise<boolean> => {
    // Normalizar texto para evitar caracteres extraños en impresoras básicas (quitar acentos)
    const text = rawText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // A. Ruta Nativa
    const bs = getBluetoothSerial();
    if (isNativeConnection && bs) {
        return new Promise((resolve) => {
            bs.write(
                text,
                () => resolve(true),
                (err: any) => {
                    console.error("Error escribiendo nativo:", err);
                    resolve(false);
                }
            );
        });
    }

    // B. Ruta Web
    if (!isNativeConnection && printerCharacteristic) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            await printerCharacteristic.writeValue(data);
            return true;
        } catch (e: any) {
            console.error("Error escribiendo Web:", e);
            // Reintentar conexión una vez
            if (await connectToPrinter()) {
                return printText(text);
            }
        }
    }

    // Si llegamos aquí, no hay conexión válida
    return false;
};

export const disconnectPrinter = async () => {
    const bs = getBluetoothSerial();
    if (isNativeConnection && bs) {
        bs.disconnect();
    }
    if (connectedDevice && connectedDevice.gatt.connected) {
        connectedDevice.gatt.disconnect();
    }
    connectedDevice = null;
    printerCharacteristic = null;
    isNativeConnection = false;
};

export const isPrinterConnected = (): boolean => {
    const bs = getBluetoothSerial();
    return (isNativeConnection && bs) || (!!connectedDevice && connectedDevice.gatt.connected);
};
