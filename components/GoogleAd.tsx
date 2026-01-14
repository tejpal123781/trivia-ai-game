import React, { useEffect, useRef, useState } from 'react';

interface GoogleAdProps {
  slotId?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
}

const GoogleAd: React.FC<GoogleAdProps> = ({ slotId = "1234567890", format = "auto", style }) => {
  const initialized = useRef(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      if (typeof window !== 'undefined') {
         // Check if adsbygoogle exists
         const adsByGoogle = (window as any).adsbygoogle;
         if (adsByGoogle) {
            adsByGoogle.push({});
         } else {
             // If AdBlock is present, this object might not exist or push might fail
             console.warn("AdSense script not loaded.");
             setAdError(true);
         }
      }
    } catch (e) {
      console.error("AdSense failed to push", e);
      setAdError(true);
    }
  }, []);

  if (adError) {
      return (
          <div className="w-full h-full min-h-[100px] flex items-center justify-center bg-slate-800/20 rounded-xl border border-dashed border-slate-700 text-slate-600 text-xs p-4 text-center">
              Ad Space (Blocked or Config Missing)
          </div>
      )
  }

  return (
    <div className="google-ad-container w-full flex justify-center items-center bg-slate-800/50 rounded-xl overflow-hidden min-h-[250px] relative">
      <div className="text-[10px] text-slate-600 absolute top-2 right-2 uppercase tracking-wider border border-slate-700 px-1 rounded">Ad</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', ...style }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // REPLACE WITH YOUR REAL PUBLISHER ID
        data-ad-slot={slotId} // REPLACE WITH YOUR REAL AD SLOT ID
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default GoogleAd;