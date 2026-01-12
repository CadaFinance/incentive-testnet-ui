'use client';

import dynamic from 'next/dynamic';

// Disable SSR for HomePage - it uses client-only APIs
const HomePage = dynamic(() => import("@/components/HomePage"), {
    ssr: false,
    loading: () => <div className="min-h-screen bg-black" />
});

export default function HomePageWrapper() {
    return <HomePage />;
}
