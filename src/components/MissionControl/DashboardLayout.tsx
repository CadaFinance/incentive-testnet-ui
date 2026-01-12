'use client';
import { ReactNode } from 'react';
import { Target, Shield, Trophy } from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20">
            <div className="max-w-7xl mx-auto px-6">



                {/* Main Content Area */}
                <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </main>

            </div>
        </div>
    );
}
