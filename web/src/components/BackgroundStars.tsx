import React from 'react';

export const BackgroundStars: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]" aria-hidden="true">
      {/* Deep night celestial gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070512] via-[#0d0920] to-[#120e2a]" />

      {/* Nebula glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/15 blur-[120px]" />
      <div className="absolute top-[40%] left-[20%] w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px]" />

      {/* Subtle star layers */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 15% 15%, #ffffff 100%, transparent),
            radial-gradient(1px 1px at 35% 45%, #f5c842 100%, transparent),
            radial-gradient(1.5px 1.5px at 70% 25%, #ffffff 100%, transparent),
            radial-gradient(1px 1px at 85% 75%, #a855f7 100%, transparent),
            radial-gradient(1px 1px at 50% 85%, #ffffff 100%, transparent),
            radial-gradient(1.5px 1.5px at 20% 70%, #ffffff 100%, transparent),
            radial-gradient(1px 1px at 90% 15%, #f5c842 100%, transparent),
            radial-gradient(1px 1px at 60% 60%, #ffffff 100%, transparent)
          `,
          backgroundSize: '250px 250px',
        }}
      />
    </div>
  );
};
