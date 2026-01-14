import React, { useEffect, useState } from 'react';
import { recordAdImpression } from '../services/adminRevenue';
import GoogleAd from './GoogleAd';

interface AdInterstitialProps {
  onComplete: () => void;
}

const AdInterstitial: React.FC<AdInterstitialProps> = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    // Record that an interstitial page was shown (internal analytics)
    recordAdImpression();
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black/95 relative animate-fade-in p-6 z-50">
      <div className="absolute top-4 right-4 z-20">
        {!canSkip ? (
           <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-mono text-sm border border-slate-700">
             Reward in {timeLeft}s
           </div>
        ) : (
           <button 
             onClick={onComplete}
             className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
           >
             Skip Advertisement 
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
           </button>
        )}
      </div>

      <div className="max-w-4xl w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Support TriviaAI</h2>
            <p className="text-slate-400">Viewing ads helps keep our servers running!</p>
        </div>

        {/* Primary Ad Unit */}
        <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 min-h-[300px] flex items-center justify-center">
             <GoogleAd slotId="YOUR_RECTANGLE_AD_SLOT_ID" format="rectangle" />
        </div>
        
        {/* Fallback/Secondary text if ad block is on or ad doesn't fill */}
        <p className="text-xs text-slate-600 max-w-lg text-center">
            If you do not see an ad above, please ensure you have added your valid <code>ca-pub-ID</code> and <code>slot-ID</code> in the code and allowed scripts from Google.
        </p>
      </div>
    </div>
  );
};

export default AdInterstitial;