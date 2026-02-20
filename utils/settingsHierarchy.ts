import { User, AppSettings, Role } from '../types';

export const resolveSettings = (
    currentUser: User | null,
    allSettings: Record<string, AppSettings>,
    allUsers: User[],
    defaultSettings: AppSettings
): AppSettings => {
    if (!currentUser) return defaultSettings;

    const SYSTEM_ADMIN_ID = 'b3716a78-fb4f-4918-8c0b-92004e3d63ec';
    const adminSettings = allSettings[SYSTEM_ADMIN_ID] || defaultSettings;

    // Base settings: start with global admin settings so all fields are populated
    let settings: AppSettings = { ...adminSettings };

    // Override with manager/branch settings if the current user has a branch
    const managerOrSelfId = (currentUser.role === Role.COLLECTOR && currentUser.managedBy)
        ? currentUser.managedBy
        : currentUser.id;

    const branchSettings = allSettings[managerOrSelfId];
    if (branchSettings) {
        // Merge: use branch settings but keep admin values for any field that is empty/undefined in branch
        settings = {
            ...settings,
            ...branchSettings,
            // CRITICAL: For receipt fields, never let branch settings overwrite with empty values
            shareValue: branchSettings.shareValue || adminSettings.shareValue || settings.shareValue,
            shareLabel: branchSettings.shareLabel || adminSettings.shareLabel || settings.shareLabel,
            contactPhone: branchSettings.contactPhone || adminSettings.contactPhone || settings.contactPhone,
            technicalSupportPhone: branchSettings.technicalSupportPhone || adminSettings.technicalSupportPhone || settings.technicalSupportPhone,
            companyIdentifier: branchSettings.companyIdentifier || adminSettings.companyIdentifier || settings.companyIdentifier,
            companyName: branchSettings.companyName || adminSettings.companyName || settings.companyName,
        };
    }

    return settings;
};

