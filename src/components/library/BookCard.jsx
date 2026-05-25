import { motion } from 'framer-motion';
import { Heart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookCard({ book, rank, showRank, compact }) {
  const isFeatured = showRank && rank;

  return (
    <Link to={`/livraria/${book.id}`}>
      <motion.div
        whileHover={{ scale: 1.06, y: -6 }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="group relative cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-2xl hover:shadow-primary/20 transition-shadow duration-300"
      >
        {/* Cover */}
        <div className="aspect-[2/3] bg-muted">
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Rank badge */}
        {isFeatured && (
          <div className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
            <span className="text-white font-bold text-xs">{rank}</span>
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3"
        >
          <p className="text-white font-semibold text-xs leading-tight line-clamp-2 mb-1">
            {book.title}
          </p>
          <span className="text-[10px] text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full w-fit mb-2">
            {book.genre}
          </span>
          <div className="flex items-center gap-3 text-white/70 text-[10px]">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> {book.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {book.views || 0}
            </span>
          </div>
        </motion.div>

        {/* Always-visible subtle bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity duration-200" />
        <div className="absolute bottom-0 inset-x-0 p-2 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
          <p className="text-white text-[11px] font-medium line-clamp-1">{book.title}</p>
        </div>
      </motion.div>
    </Link>
  );
}
