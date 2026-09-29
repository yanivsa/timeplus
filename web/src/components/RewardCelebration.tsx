import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { RewardEventData } from '../types';
import { audio } from '../services/audio';
import { Sparkles, Trophy, Flame, CheckCircle, ArrowLeft } from 'lucide-react';

interface Props {
  event: RewardEventData;
  onDismiss: () => void;
}

export const RewardCelebration: React.FC<Props> = ({ event, onDismiss }) => {
  const isLevelUp = event.type === 'level_up' || (event.level_after && event.level_before && event.level_after > event.level_before);
  const [displayedMinutes, setDisplayedMinutes] = useState(0);

  useEffect(() => {
    // 1. Sound & Confetti triggers
    if (isLevelUp) {
      audio.playFanfare();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f5c842', '#8b5cf6', '#10b981', '#38bdf8'],
      });
    } else {
      audio.playApproval();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f5c842', '#ffeb99', '#8b5cf6'],
      });
    }

    // 2. Count-up animation for minutes
    const target = event.minutes_delta;
    if (target > 0) {
      let current = 0;
      const step = Math.max(1, Math.floor(target / 15));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setDisplayedMinutes(target);
          clearInterval(interval);
        } else {
          setDisplayedMinutes(current);
        }
      }, 35);
      return () => clearInterval(interval);
    } else {
      setDisplayedMinutes(0);
    }
  }, [event, isLevelUp]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#22184c] to-[#120c2e] p-6 text-center border-2 border-gold-500/50 shadow-2xl shadow-gold-500/20 transform transition-all scale-100 animate-scale-up">
        {/* Glowing badge icon */}
        <div className="mx-auto -mt-14 mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 shadow-lg shadow-gold-500/50 border-4 border-night-900">
          {isLevelUp ? (
            <Trophy className="h-10 w-10 text-night-950 animate-bounce" />
          ) : (
            <Sparkles className="h-10 w-10 text-night-950 animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold font-cinzel text-gold-300 drop-shadow-md">
          {event.title}
        </h2>
        <p className="mt-2 text-sm text-purple-200 leading-relaxed font-alef">
          {event.body}
        </p>

        {/* Big reward numbers */}
        <div className="my-6 flex items-center justify-center gap-4">
          {event.minutes_delta > 0 && (
            <div className="flex-1 rounded-2xl bg-night-900/80 border border-gold-500/30 p-3 shadow-inner">
              <span className="text-3xl font-extrabold text-gold-400 font-cinzel">
                +{displayedMinutes}
              </span>
              <span className="block text-xs text-gold-200/80 mt-1">דקות מסך</span>
            </div>
          )}

          {event.xp_delta > 0 && (
            <div className="flex-1 rounded-2xl bg-night-900/80 border border-purple-500/30 p-3 shadow-inner">
              <span className="text-3xl font-extrabold text-cyan-300 font-cinzel">
                +{event.xp_delta}
              </span>
              <span className="block text-xs text-cyan-200/80 mt-1">נקודות קסם (XP)</span>
            </div>
          )}
        </div>

        {/* Streak bonus banner if present */}
        {event.streak_days > 1 && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 py-2 px-3 text-amber-300 text-xs font-medium">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>רצף של {event.streak_days} ימים פעילים! ממשיכים בקסם!</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 via-gold-300 to-amber-400 hover:from-gold-300 hover:to-amber-300 active:scale-95 transition-all shadow-lg shadow-gold-500/30 text-base"
        >
          <span>יש! תודה רבה</span>
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
