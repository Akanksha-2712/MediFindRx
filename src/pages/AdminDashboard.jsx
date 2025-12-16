import React from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '../supabaseClient';
import { Users, Building2, Pill, Activity } from 'lucide-react';

const AdminDashboard = () => {
    const { drugs, pharmacies } = useData();

    const [pendingPharmacies, setPendingPharmacies] = React.useState([]);
    const [stats, setStats] = React.useState([
        { label: 'Total Pharmacies', value: 0, icon: Building2, color: 'bg-blue-500' },
        { label: 'Total Drugs Listed', value: 0, icon: Pill, color: 'bg-green-500' },
        { label: 'Active Users', value: 0, icon: Users, color: 'bg-purple-500' },
        { label: 'Pending Approvals', value: 0, icon: Activity, color: 'bg-orange-500' },
    ]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchAdminData();
    }, [pharmacies, drugs]); // Re-fetch if global context changes

    const fetchAdminData = async () => {
        try {
            // 1. Fetch Stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // 2. Fetch Pending Pharmacies
            const { data: pendingPharma } = await supabase
                .from('pharmacies')
                .select('*')
                .eq('approved', false);

            // 3. Fetch Pending Hospitals
            const { data: pendingHospitals } = await supabase
                .from('hospitals')
                .select('*')
                .eq('approved', false);

            const combinedPending = [
                ...(pendingPharma || []).map(p => ({ ...p, type: 'pharmacy' })),
                ...(pendingHospitals || []).map(h => ({ ...h, type: 'hospital' }))
            ];

            setPendingPharmacies(combinedPending);

            setStats([
                { label: 'Total Pharmacies', value: pharmacies.length, icon: Building2, color: 'bg-blue-500' },
                { label: 'Total Drugs Listed', value: drugs.length, icon: Pill, color: 'bg-green-500' },
                { label: 'Active Users', value: userCount || 0, icon: Users, color: 'bg-purple-500' },
                { label: 'Pending Approvals', value: combinedPending.length, icon: Activity, color: 'bg-orange-500' },
            ]);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, type) => {
        if (!confirm("Approve this account?")) return;

        const table = type === 'pharmacy' ? 'pharmacies' : 'hospitals';
        const { error } = await supabase
            .from(table)
            .update({ approved: true })
            .eq('id', id);

        if (!error) {
            alert("Account Approved!");
            fetchAdminData(); // Refresh list
        } else {
            console.error("Approval error:", error);
            alert("Failed to approve.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Portal</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`${stat.color} p-3 rounded-lg text-white`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending Approvals Section */}
            {pendingPharmacies.length > 0 && (
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6 mb-8">
                    <h2 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5" /> Pending Approvals
                    </h2>
                    <div className="space-y-4">
                        {pendingPharmacies.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {item.name} <span className="text-xs text-gray-500">({item.type === 'hospital' ? 'Hospital' : 'Pharmacy'})</span>
                                    </h3>
                                    <p className="text-sm text-gray-500">{item.address || 'No address provided'}</p>
                                    <p className="text-xs text-gray-400">ID: {item.id} | Name: {item.name}</p>
                                </div>
                                <button
                                    onClick={() => handleApprove(item.id, item.type)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Approve Registration
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Registered List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Registered Pharmacies</h2>
                    <div className="space-y-4">
                        {pharmacies.filter(p => !pendingPharmacies.find(pending => pending.id === p.id)).map((pharmacy) => (
                            <div key={pharmacy.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{pharmacy.name}</h3>
                                    <p className="text-sm text-gray-500">{pharmacy.address}</p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${pharmacy.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {pharmacy.approved ? 'Active' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity (Mock for now, could link to logs) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                        <div className="p-4 text-center text-gray-500 italic">
                            Activity logs coming soon...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
