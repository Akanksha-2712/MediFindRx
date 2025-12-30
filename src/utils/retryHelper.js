/**
 * Retries an async operation with exponential backoff.
 * @param {Function} operation - The async function to execute
 * @param {number} retries - Number of retries (default 3)
 * @param {number} delay - Initial delay in ms (default 1000)
 */
export const withRetry = async (operation, retries = 3, delay = 1000) => {
    try {
        return await operation();
    } catch (error) {
        if (retries <= 0) throw error;

        console.warn(`Operation failed, retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return withRetry(operation, retries - 1, delay * 2);
    }
};

/**
 * A lightweight heartbeat to keep Supabase connections alive
 * @param {Object} supabase - The supabase client instance
 */
export const keepAlive = async (supabase) => {
    try {
        const { error } = await supabase.from('drugs').select('id').limit(1);
        if (error) throw error;
        console.log("Heartbeat: Connection Active 💓");
    } catch (err) {
        console.warn("Heartbeat: Connection Stale/Error", err);
    }
};
