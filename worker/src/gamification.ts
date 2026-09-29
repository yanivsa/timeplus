export interface RankInfo {
  level: number;
  rankTitle: string;
  minXp: number;
  maxXp: number;
}

export const WIZARD_RANKS: RankInfo[] = [
  { level: 1, rankTitle: 'שוליית הזמן', minXp: 0, maxXp: 100 },
  { level: 2, rankTitle: 'מחזיק השעון', minXp: 100, maxXp: 250 },
  { level: 3, rankTitle: 'מכוון הכוכבים', minXp: 250, maxXp: 450 },
  { level: 4, rankTitle: 'קוסם שעה', minXp: 450, maxXp: 700 },
  { level: 5, rankTitle: 'אמן הזמן', minXp: 700, maxXp: 1000 },
  { level: 6, rankTitle: 'שומר הממדים', minXp: 1000, maxXp: 1400 },
  { level: 7, rankTitle: 'רב-מג הזמן', minXp: 1400, maxXp: 2000 },
  { level: 8, rankTitle: 'שליט הנצח', minXp: 2000, maxXp: 999999 },
];

export function getRankDetails(xp: number): {
  level: number;
  rankTitle: string;
  xpInLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  let currentRank = WIZARD_RANKS[0];
  for (const rank of WIZARD_RANKS) {
    if (xp >= rank.minXp) {
      currentRank = rank;
    } else {
      break;
    }
  }

  const range = currentRank.maxXp - currentRank.minXp;
  const xpInLevel = Math.max(0, xp - currentRank.minXp);
  const xpNeededForNext = Math.max(0, currentRank.maxXp - xp);
  const progressPercent = Math.min(100, Math.round((xpInLevel / (range || 1)) * 100));

  return {
    level: currentRank.level,
    rankTitle: currentRank.rankTitle,
    xpInLevel,
    xpNeededForNext,
    progressPercent,
  };
}

export function calculateTaskXp(rewardMinutes: number, requiresPhoto = false): number {
  // Base XP: roughly 1.25x the minutes value, minimum 10 XP
  let xp = Math.max(10, Math.round(rewardMinutes * 1.25));
  if (requiresPhoto) {
    xp += 10; // Extra bonus for photo proof verification
  }
  return xp;
}
