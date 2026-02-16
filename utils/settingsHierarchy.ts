import { User, AppSettings, Role } from '../types';

export const resolveSettings = (
    currentUser: User | null,
    allSettings: Record<string, AppSettings>,
    allUsers: User[],
    defaultSettings: AppSettings
): AppSettings => {
    if (!currentUser) return defaultSettings;

    // Base settings (from Admin/Manager)
    let settings = allSettings[currentUser.id] || defaultSettings;

    // If Collector, prioritize their Manager's settings
    if (currentUser.role === Role.COLLECTOR && currentUser.managedBy) {
        settings = allSettings[currentUser.managedBy] || settings;
    }

    // CRITICAL: Technical support phone should be GLOBAL from the System Admin if possible
    // System Admin ID is b3716a78-fb4f-4918-8c0b-92004e3d63ec
    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const adminSettings = allSettings[SYSTEM_ADMIN_ID];

    if (adminSettings?.technicalSupportPhone) {
        return {
            ...settings,
            technicalSupportPhone: adminSettings.technicalSupportPhone
        };
    }

    return settings;
};
