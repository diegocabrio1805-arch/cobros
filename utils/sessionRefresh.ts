import { supabase } from './supabaseClient';

/**
 * Manually refresh the Supabase session token ONLY when online.
 * This prevents automatic logout when there's no internet connection.
 * 
 * Call this function periodically when the app detects it's online.
 */
export const refreshSessionIfOnline = async (): Promise<boolean> => {
    try {
        // Check if we're online first
        if (!navigator.onLine) {
            console.log('Offline - skipping token refresh');
            return false;
        }

        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.log('No active session to refresh');
            return false;
        }

        // Check if token is close to expiring (within 5 minutes)
        const expiresAt = session.expires_at;
        if (!expiresAt) return false;

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;

        // Only refresh if token expires in less than 5 minutes
        if (timeUntilExpiry < 300) {
            console.log('Token expiring soon, refreshing...');
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('Failed to refresh session:', error);
                return false;
            }

            console.log('Session refreshed successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error in refreshSessionIfOnline:', error);
        return false;
    }
};
