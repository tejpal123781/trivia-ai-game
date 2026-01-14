import React, { useEffect, useState } from 'react';
import { AdminStats, getAdminStats, resetAdminStats } from '../services/adminRevenue';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AdminStats>({ totalRevenue: 0, adImpressions: 0, adClicks: 0 });

  useEffect(() => {
    setStats(getAdminStats());
  }, []);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear local analytics?")) {
        setStats(resetAdminStats());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto p-6 animate-fade-in w-full text-white">
      <div className="flex justify-between w-full items-center mb-8 border-b border-slate-700 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
            <p className="text-slate-400">Analytics & Google AdSense Status</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-lg text-sm font-mono flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              LIVE ADS ENABLED
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
        {/* Impressions Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Interstitial Views</h3>
            <p className="text-5xl font-mono font-bold text-blue-400">
                {stats.adImpressions}
            </p>
             <p className="text-xs text-slate-500 mt-4">Total ad pages shown to users</p>
        </div>

        {/* External Link Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-all"></div>
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Revenue Status</h3>
            <div className="flex flex-col gap-2">
                <p className="text-lg font-bold text-white">Managed by Google</p>
                <a 
                    href="https://adsense.google.com/start/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm underline"
                >
                    View Earnings on AdSense
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
            </div>
            <p className="text-xs text-slate-500 mt-4">Revenue tracking is handled externally to ensure accuracy.</p>
        </div>
      </div>

      <div className="w-full bg-slate-900/50 p-8 rounded-2xl border border-slate-800 mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Integration Status
          </h3>
          <div className="space-y-4 text-sm text-slate-400">
              <p>
                The app is currently configured to serve real Google Ads. To ensure ads appear and revenue is generated:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                  <li>Open <code>index.html</code> and replace <code>ca-pub-YOUR_PUBLISHER_ID</code> in the script tag.</li>
                  <li>Open <code>components/GoogleAd.tsx</code> and <code>components/AdInterstitial.tsx</code> to ensure the correct Publisher ID and Slot IDs are used.</li>
                  <li>Ensure your domain is verified in the Google AdSense console.</li>
                  <li>Note: Ad Blockers may prevent ads from appearing in this dashboard view.</li>
              </ul>
          </div>
      </div>

      <div className="flex gap-4">
        <button
            onClick={handleReset}
            className="px-6 py-3 rounded-xl font-bold bg-red-900/50 text-red-400 border border-red-900 hover:bg-red-900 transition-colors"
        >
            Reset Views
        </button>
        <button
            onClick={onBack}
            className="px-8 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        >
            Back to App
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;