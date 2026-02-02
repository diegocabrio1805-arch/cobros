import { User, AppSettings, Role } from '../types';

export const resolveSettings = (
    currentUser: User | null,
    allSettings: Record<string, AppSettings>,
    allUsers: User[],
    defaultSettings: AppSettings
): AppSettings => {
    if (!currentUser) return defaultSettings;

    // If Admin or Manager, they use their own settings
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER) {
        return allSettings[currentUser.id] || defaultSettings;
    }

    // If Collector, they inherit from their Manager
    if (currentUser.role === Role.COLLECTOR) {
        if (currentUser.managedBy) {
            // Try to find manager's settings
            const managersSettings = allSettings[currentUser.managedBy];
            if (managersSettings) {
                return managersSettings;
            }
            // If manager has no settings, maybe check if manager exists and fallback?
            // Ideally we fallback to default if manager has no settings yet.
            return defaultSettings;
        }
    }

    // Fallback for standalone collectors or edge cases
    return allSettings[currentUser.id] || defaultSettings;
};
