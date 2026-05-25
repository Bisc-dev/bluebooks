import { motion } from 'framer-motion';

export default function ProfileTags({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map((tag, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white select-none"
          style={{
            backgroundColor: tag.color || '#2054BC',
            boxShadow: `0 0 8px ${tag.color || '#2054BC'}66`,
          }}
        >
          {tag.label}
        </motion.span>
      ))}
    </div>
  );
}
