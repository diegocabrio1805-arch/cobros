import { v4 as uuidv4 } from 'uuid';

export const addToSyncQueue = (item: { operation: string; data: any }) => {
    try {
        const currentQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        currentQueue.push({
            ...item,
            _id: uuidv4(),
            timestamp: new Date().toISOString(),
            retryCount: 0
        });
        localStorage.setItem('syncQueue', JSON.stringify(currentQueue));
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('sync_queue_added'));
        }
    } catch (error) {
        console.error('Error adding to sync queue:', error);
    }
};
