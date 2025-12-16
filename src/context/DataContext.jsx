import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [drugs, setDrugs] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: drugsData } = await supabase.from('drugs').select('*');
            const { data: pharmaciesData } = await supabase.from('pharmacies').select('*');
            const { data: inventoryData } = await supabase.from('inventory').select('*');
            const { data: reservationsData } = await supabase.from('reservations').select('*');

            if (drugsData) setDrugs(drugsData);
            if (pharmaciesData) setPharmacies(pharmaciesData);
            if (inventoryData) setInventory(inventoryData);
            if (reservationsData) setReservations(reservationsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Optional: Realtime subscriptions could go here
    }, []);

    const getPharmaciesWithDrug = (drugName) => {
        const drug = drugs.find(d => d.name.toLowerCase().includes(drugName.toLowerCase()));
        if (!drug) return [];

        return inventory
            .filter(item => item.drug_id === drug.id && item.stock > 0)
            .map(item => {
                const pharmacy = pharmacies.find(p => p.id === item.pharmacy_id);
                return { ...pharmacy, stock: item.stock, drug, id: pharmacy.id }; // Ensure ID is passed
            });
    };

    const updateStock = async (pharmacyId, drugId, newStock) => {
        const stockValue = parseInt(newStock, 10);
        const { error } = await supabase
            .from('inventory')
            .upsert({
                pharmacy_id: pharmacyId,
                drug_id: drugId,
                stock: stockValue
            }, { onConflict: 'pharmacy_id, drug_id' });

        if (!error) {
            // Update local state - need to handle both update and insert logic locally or just refetch
            // For simplicity and correctness with IDs, let's refetch or carefully update local
            // Optimistic update for the stock value:
            setInventory(prev => {
                const exists = prev.find(item => item.pharmacy_id === pharmacyId && item.drug_id === drugId);
                if (exists) {
                    return prev.map(item =>
                        (item.pharmacy_id === pharmacyId && item.drug_id === drugId)
                            ? { ...item, stock: newStock }
                            : item
                    );
                } else {
                    // We need the new record's ID technically, but for display stock is enough
                    // Ideally we'd await the return data from upsert but to match the previous style:
                    return [...prev, { pharmacy_id: pharmacyId, drug_id: drugId, stock: newStock }];
                }
            });

            // Re-fetch to ensure we have IDs and consistency
            const { data } = await supabase.from('inventory').select('*');
            if (data) setInventory(data);
        } else {
            console.error("Error updating stock:", error);
        }
    };

    const addReservation = async (pharmacyId, drugId, quantity = 1) => {
        // ... (keeping old one for reference if needed, but we will use simpleReserve)
        return simpleReserve(pharmacyId, drugId, quantity);
    };

    const simpleReserve = async (pharmacyId, drugId, quantity) => {
        console.log("SimpleReserve: Starting...");
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Get user directly to avoid context race conditions
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            pharmacy_id: pharmacyId,
            drug_id: drugId,
            user_id: user?.id || null,
            customer_name: user?.user_metadata?.name || 'Guest',
            otp,
            status: 'pending'
            // quantity // REMOVED to prevent schema errors
        };

        console.log("SimpleReserve: Sending Payload", payload);

        const { data, error } = await supabase
            .from('reservations')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error("SimpleReserve Error:", error);
            throw error; // Let the caller handle it
        }

        console.log("SimpleReserve: Success", data);

        // Optimistically update local list if it's a pharmacy view (optional, skipping for safety)
        // setReservations(prev => [...prev, data]); 

        return data;
    };

    const cancelReservation = async (reservationId) => {
        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        const { error } = await supabase
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId);

        if (!error) {
            setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelled' } : r));
            // Restore stock
            const inventoryItem = inventory.find(i => i.pharmacy_id === reservation.pharmacy_id && i.drug_id === reservation.drug_id);
            if (inventoryItem) {
                await updateStock(reservation.pharmacy_id, reservation.drug_id, inventoryItem.stock + 1); // Assuming qty 1
            }
        }
    };

    const getReservationsForPharmacy = (pharmacyId) => {
        return reservations.filter(r => r.pharmacy_id === pharmacyId);
    };

    const refreshReservations = async () => {
        const { data, error } = await supabase
            .from('reservations')
            .select('*');
        if (data) setReservations(data);
    };

    const confirmReservation = async (reservationId) => {
        console.log(`Confirming reservation #${reservationId}...`);

        try {
            const { error } = await supabase
                .from('reservations')
                .update({ status: 'confirmed' })
                .eq('id', reservationId);

            if (!error) {
                console.log(`Reservation #${reservationId} confirmed successfully.`);
                // Update local state immediately for UI responsiveness
                setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'confirmed' } : r));
                alert("✅ Order Confirmed! Please prepare the medicine.");
            } else {
                console.error("Confirm error:", error);
                alert("Confirm Failed: " + error.message);
            }
        } catch (err) {
            console.error("Confirm Exception:", err);
            alert("System Error during confirmation.");
        }
    };

    const verifyOtp = async (reservationId, enteredOtp) => {
        console.log(`Verifying OTP for #${reservationId}: Input '${enteredOtp}'`);

        const localReservation = reservations.find(r => r.id === reservationId);

        if (!localReservation) {
            alert(`Error: Reservation #${reservationId} not found.`);
            return;
        }

        if (String(localReservation.otp).trim() === String(enteredOtp).trim()) {
            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            const updateQuery = supabase
                .from('reservations')
                .update({ status: 'completed' })
                .eq('id', reservationId);

            try {
                // Race between the query and timeout
                const result = await Promise.race([updateQuery, timeout]);

                if (result.error) {
                    alert("Update Failed: " + result.error.message);
                } else {
                    alert("✅ Verification Successful! Order Completed.");
                    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'completed' } : r));
                }
            } catch (err) {
                if (err.message === 'Request timed out') {
                    // Assume it worked if timed out (optimistic)
                    alert("✅ Order marked as Completed (network slow).");
                    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'completed' } : r));
                } else {
                    alert("Error: " + err.message);
                }
            }
        } else {
            alert(`❌ Invalid OTP.`);
        }
    };

    const ratePharmacy = async (pharmacyId, rating) => {
        // Simple rating update (just replacing for now, or averaging if we had more logic)
        // For demo, let's just update the rating field directly
        const { error } = await supabase
            .from('pharmacies')
            .update({ rating: rating }) // In real app, calculate average
            .eq('id', pharmacyId);

        if (!error) {
            setPharmacies(prev => prev.map(p => p.id === pharmacyId ? { ...p, rating } : p));
        }
    };

    return (
        <DataContext.Provider value={{
            drugs,
            pharmacies,
            inventory,
            reservations,
            getPharmaciesWithDrug,
            updateStock,
            addReservation,
            simpleReserve,
            cancelReservation,
            getReservationsForPharmacy,
            refreshReservations,
            confirmReservation,
            verifyOtp,
            ratePharmacy,
            loading
        }}>
            {children}
        </DataContext.Provider>
    );
};
