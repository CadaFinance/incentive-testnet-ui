'use client';

export const dynamic = 'force-dynamic';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/MissionControl/DashboardLayout';
import { Dialog, DialogPanel } from '@headlessui/react';
import { ADMIN_ADDRESS } from '@/contracts';

interface Task {
    id: number;
    type: string;
    title: string;
    description: string;
    reward_points: number;
    verification_type: string;
    verification_data: string;
    is_active: boolean;
    requires_verification?: boolean;
    requires_telegram?: boolean;
    requires_discord?: boolean;
}

export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Form State
    const [newTask, setNewTask] = useState({
        type: 'SOCIAL',
        title: '',
        description: '',
        reward_points: 50,
        verification_type: 'LINK_CLICK',
        verification_data: '',
        icon_url: '',
        requires_verification: false,
        requires_telegram: false,
        requires_discord: false
    });

    // Presale Settings State
    const [presaleSettings, setPresaleSettings] = useState({
        goal_amount: 0,
        starting_amount: 0,
        hourly_rate: 1335,
        countdown_start_date: '',
        countdown_end_date: '',
        current_price: 0,
        next_price: 0
    });
    const [isPresaleLoading, setIsPresaleLoading] = useState(false);

    useEffect(() => {
        if (isConnected && address?.toLowerCase() === ADMIN_ADDRESS) {
            fetchTasks();
            fetchPresaleSettings();
        }
    }, [address, isConnected]);

    const fetchPresaleSettings = async () => {
        try {
            const res = await fetch('/api/admin/presale');
            const data = await res.json();
            if (data && !data.error) {
                // Ensure dates are formatted for input datetime-local if needed, or just keep string
                setPresaleSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch presale settings', error);
        }
    };

    const handleUpdatePresale = async () => {
        setIsPresaleLoading(true);
        try {
            const res = await fetch('/api/admin/presale', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(presaleSettings)
            });
            if (res.ok) {
                alert('Presale settings updated successfully');
                fetchPresaleSettings();
            } else {
                alert('Failed to update presale settings');
            }
        } catch (e) {
            console.error(e);
            alert('Error updating settings');
        } finally {
            setIsPresaleLoading(false);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/admin/tasks');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                setIsCreateOpen(false);
                fetchTasks();
                // Reset form
                setNewTask({
                    type: 'SOCIAL',
                    title: '',
                    description: '',
                    reward_points: 50,
                    verification_type: 'LINK_CLICK',
                    verification_data: '',
                    icon_url: '',
                    requires_verification: false,
                    requires_telegram: false,
                    requires_discord: false
                });
            } else {
                alert('Failed to create task');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setIsEditOpen(true);
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;
        try {
            const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingTask.title,
                    description: editingTask.description,
                    reward_points: editingTask.reward_points,
                    verification_data: editingTask.verification_data,
                    requires_verification: editingTask.requires_verification,
                    requires_telegram: editingTask.requires_telegram,
                    requires_discord: editingTask.requires_discord
                })
            });
            if (res.ok) {
                setIsEditOpen(false);
                fetchTasks();
            } else {
                alert('Failed to update task');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete/archive this task?')) return;
        try {
            const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTasks();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleActive = async (task: Task) => {
        try {
            const res = await fetch(`/api/admin/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !task.is_active })
            });
            if (res.ok) {
                fetchTasks();
            }
        } catch (e) {
            console.error(e);
        }
    };


    if (!address || address.toLowerCase() !== ADMIN_ADDRESS) {
        return (
            <DashboardLayout>
                <div className="h-[60vh] flex flex-col items-center justify-center bg-[#0b0b0b] border border-red-500/20 text-center p-8">
                    <h1 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-4">
                        ACCESS DENIED
                    </h1>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                            Mission <span className="text-[#e2ff3d]">manager</span>
                        </h1>
                        <p className="text-gray-500 font-mono text-xs mt-1">Manage static social and partner missions.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-[#e2ff3d] text-black px-4 py-2 font-bold font-mono text-xs uppercase tracking-wider hover:bg-white transition-colors"
                    >
                        + New Mission
                    </button>
                </div>

                {/* PRESALE SETTINGS SECTION */}
                <div className="bg-[#090909] border border-white/10 p-6 space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="text-[#e2ff3d]">⚡</span> Presale Settings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Goal Amount ($)</label>
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                value={presaleSettings.goal_amount}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, goal_amount: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-[#e2ff3d] mb-1">Starting Amount ($) - Offset</label>
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-[#e2ff3d]/30 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                value={presaleSettings.starting_amount}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, starting_amount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-orange-400 mb-1">Hourly Rate ($/hour)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-zinc-900 border border-orange-500/30 p-2 text-white font-mono text-sm focus:border-orange-400 outline-none"
                                value={presaleSettings.hourly_rate}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, hourly_rate: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-blue-400 mb-1">Progress Start Date (ISO)</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-900 border border-blue-500/30 p-2 text-white font-mono text-sm focus:border-blue-400 outline-none"
                                value={presaleSettings.countdown_start_date}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, countdown_start_date: e.target.value })}
                                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Countdown End Date (ISO)</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                value={presaleSettings.countdown_end_date}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, countdown_end_date: e.target.value })}
                                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Current Price ($)</label>
                            <input
                                type="number"
                                step="0.00001"
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                value={presaleSettings.current_price}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, current_price: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">Next Price ($)</label>
                            <input
                                type="number"
                                step="0.00001"
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                value={presaleSettings.next_price}
                                onChange={(e) => setPresaleSettings({ ...presaleSettings, next_price: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleUpdatePresale}
                            disabled={isPresaleLoading}
                            className="bg-[#e2ff3d] text-black px-6 py-2 font-bold font-mono text-xs uppercase hover:bg-white disabled:opacity-50"
                        >
                            {isPresaleLoading ? 'UPDATING...' : 'UPDATE SETTINGS'}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-gray-500 font-mono">Loading missions...</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {tasks.map((task) => (
                            <div key={task.id} className="bg-zinc-900/50 border border-white/5 p-4 flex items-center justify-between group hover:border-[#e2ff3d]/30 transition-all">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 border ${task.is_active ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'} font-mono uppercase`}>
                                            {task.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                        <span className="text-xs font-mono text-gray-500 uppercase">{task.type}</span>
                                        {task.requires_verification && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1 border border-blue-500/20">X CHECK</span>}
                                        {task.requires_telegram && <span className="text-[10px] bg-blue-400/10 text-blue-300 px-1 border border-blue-400/20">TG CHECK</span>}
                                        {task.requires_discord && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1 border border-indigo-500/20">DS CHECK</span>}
                                        {task.id < 0 && <span className="text-[10px] bg-red-500/10 text-red-400 px-1">SYSTEM (READ ONLY)</span>}
                                    </div>
                                    <h3 className="text-white font-bold">{task.title}</h3>
                                    <p className="text-gray-500 text-sm">{task.reward_points} PTS • {task.description}</p>
                                </div>

                                {task.id > 0 && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleActive(task)}
                                            className="text-xs font-mono border border-white/10 px-3 py-1.5 text-gray-300 hover:text-white hover:border-white/30"
                                        >
                                            {task.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(task)}
                                            className="text-xs font-mono border border-blue-500/20 px-3 py-1.5 text-blue-500 hover:bg-blue-500/10"
                                        >
                                            EDIT
                                        </button>
                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="text-xs font-mono border border-red-500/20 px-3 py-1.5 text-red-500 hover:bg-red-500/10"
                                        >
                                            DELETE
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="relative z-[150]">
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-md bg-[#090909] border border-white/10 p-6 space-y-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Create New Mission</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">Title</label>
                                <input
                                    className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">Description</label>
                                <input
                                    className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">Type</label>
                                    <select
                                        className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm outline-none"
                                        value={newTask.type}
                                        onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                                    >
                                        <option value="SOCIAL">SOCIAL</option>
                                        <option value="PARTNER">PARTNER</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">Points</label>
                                    <input
                                        type="number"
                                        className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm outline-none"
                                        value={newTask.reward_points}
                                        onChange={(e) => setNewTask({ ...newTask, reward_points: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">Link (Verification Data)</label>
                                <input
                                    className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                    placeholder="https://..."
                                    value={newTask.verification_data}
                                    onChange={(e) => setNewTask({ ...newTask, verification_data: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="req_ver"
                                        className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                        checked={newTask.requires_verification}
                                        onChange={(e) => setNewTask({ ...newTask, requires_verification: e.target.checked })}
                                    />
                                    <label htmlFor="req_ver" className="text-xs font-mono text-gray-300">Requires Twitter (X)?</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="req_tg"
                                        className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                        checked={newTask.requires_telegram}
                                        onChange={(e) => setNewTask({ ...newTask, requires_telegram: e.target.checked })}
                                    />
                                    <label htmlFor="req_tg" className="text-xs font-mono text-gray-300">Requires Telegram?</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="req_ds"
                                        className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                        checked={newTask.requires_discord}
                                        onChange={(e) => setNewTask({ ...newTask, requires_discord: e.target.checked })}
                                    />
                                    <label htmlFor="req_ds" className="text-xs font-mono text-gray-300">Requires Discord?</label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleCreate}
                                className="bg-[#e2ff3d] text-black px-6 py-2 font-bold font-mono text-xs uppercase hover:bg-white"
                            >
                                CREATE MISSION
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog >

            {/* EDIT MODAL */}
            <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} className="relative z-[150]">
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-md bg-[#090909] border border-white/10 p-6 space-y-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Edit Mission</h2>

                        {editingTask && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">Title</label>
                                    <input
                                        className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                        value={editingTask.title}
                                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">Description</label>
                                    <input
                                        className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                        value={editingTask.description}
                                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono text-gray-400 mb-1">Type</label>
                                        <div className="w-full bg-zinc-900/50 border border-white/5 p-2 text-gray-500 font-mono text-sm cursor-not-allowed">
                                            {editingTask.type}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono text-gray-400 mb-1">Points</label>
                                        <input
                                            type="number"
                                            className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm outline-none"
                                            value={editingTask.reward_points}
                                            onChange={(e) => setEditingTask({ ...editingTask, reward_points: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">Link (Verification Data)</label>
                                    <input
                                        className="w-full bg-zinc-900 border border-white/10 p-2 text-white font-mono text-sm focus:border-[#e2ff3d] outline-none"
                                        value={editingTask.verification_data}
                                        onChange={(e) => setEditingTask({ ...editingTask, verification_data: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="edit_req_ver"
                                            className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                            checked={editingTask.requires_verification || false}
                                            onChange={(e) => setEditingTask({ ...editingTask, requires_verification: e.target.checked })}
                                        />
                                        <label htmlFor="edit_req_ver" className="text-xs font-mono text-gray-300">Requires Twitter (X)?</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="edit_req_tg"
                                            className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                            checked={editingTask.requires_telegram || false}
                                            onChange={(e) => setEditingTask({ ...editingTask, requires_telegram: e.target.checked })}
                                        />
                                        <label htmlFor="edit_req_tg" className="text-xs font-mono text-gray-300">Requires Telegram?</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="edit_req_ds"
                                            className="w-4 h-4 accent-[#e2ff3d] bg-zinc-900 border-white/10"
                                            checked={editingTask.requires_discord || false}
                                            onChange={(e) => setEditingTask({ ...editingTask, requires_discord: e.target.checked })}
                                        />
                                        <label htmlFor="edit_req_ds" className="text-xs font-mono text-gray-300">Requires Discord?</label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleUpdateTask}
                                className="bg-blue-500 text-black px-6 py-2 font-bold font-mono text-xs uppercase hover:bg-white"
                            >
                                SAVE CHANGES
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </DashboardLayout>
    );
}
