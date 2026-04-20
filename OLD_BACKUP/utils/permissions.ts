import { Geolocation } from '@capacitor/geolocation';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

// Declare global cordova for the plugin
declare var window: any;

export const requestAppPermissions = async () => {
    // Solo ejecutar en modo nativo (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
        console.log("No estamos en una plataforma nativa. Saltando permisos.");
        return;
    }

    console.log("Iniciando solicitud de permisos (Modo Nativo)...");

    // 1. Plugins de Capacitor (Modernos, basados en Promesas)
    try {
        console.log("Solicitando Geolocalización...");
        const geoStatus = await Geolocation.checkPermissions();
        if (geoStatus.location !== 'granted') {
            await Geolocation.requestPermissions();
        }
    } catch (e) {
        console.warn("Error solicitando geolocalización:", e);
    }

    try {
        console.log("Solicitando Contactos (Capacitor Community)...");
        const contactStatus = await Contacts.checkPermissions();
        if (contactStatus.contacts !== 'granted') {
            await Contacts.requestPermissions();
        }
    } catch (e) {
        console.warn("Error solicitando contactos (plugin community):", e);
    }

    // 2. Plugins de Cordova (Legacy/Wrappers, requieren 'deviceready' y callbacks)
    const requestCordovaPermissions = () => {
        const permissions = window.cordova?.plugins?.permissions;
        if (!permissions) {
            console.warn("Cordova Permissions Plugin no encontrado o no inicializado.");
            return;
        }

        const list = [
            permissions.CALL_PHONE,
            permissions.READ_CONTACTS, // Refuerzo para contactos
            permissions.BLUETOOTH,
            permissions.BLUETOOTH_ADMIN,
            'android.permission.BLUETOOTH_CONNECT', // Android 12+
            'android.permission.BLUETOOTH_SCAN',    // Android 12+
            'android.permission.POST_NOTIFICATIONS', // Android 13+
            'android.permission.ACCESS_FINE_LOCATION', // Refuerzo
            'android.permission.ACCESS_COARSE_LOCATION'
        ];

        console.log("Solicitando permisos vía Cordova:", list);

        permissions.requestPermissions(
            list,
            (s: any) => console.log('Permisos Cordova solicitados con ÉXITO', s),
            (e: any) => console.error('Error solicitando permisos Cordova', e)
        );
    };

    if (window.cordova) {
        requestCordovaPermissions();
    } else {
        console.log("Esperando evento deviceready para permisos Cordova...");
        document.addEventListener('deviceready', requestCordovaPermissions, false);
    }
};
