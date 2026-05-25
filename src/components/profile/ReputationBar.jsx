import { motion } from 'framer-motion';
import { getLevelInfo } from '@/lib/reputation';
import { Star } from 'lucide-react';

export default function ReputationBar({ xp = 0, compact = false }) {
  const { current, next, progress } = getLevelInfo(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
          style={{ backgroundColor: current.color }}
        >
          {current.level}
        </div>
        <span className="text-[11px] font-medium" style={{ color: current.color }}>
          {current.name}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card/80 border border-border/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white font-heading font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: current.color, boxShadow: `0 4px 20px ${current.color}55` }}
        >
          {current.level}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Star className="w-3.5 h-3.5" style={{ color: current.color }} />
            <p className="font-semibold text-sm" style={{ color: current.color }}>{current.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">{xp} XP total</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>{current.minXp} XP</span>
          {next ? <span>{next.minXp} XP → {next.name}</span> : <span>Nível máximo!</span>}
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ backgroundColor: current.color, boxShadow: `0 0 8px ${current.color}88` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{progress}%</p>
      </div>
    </div>
  );
}
