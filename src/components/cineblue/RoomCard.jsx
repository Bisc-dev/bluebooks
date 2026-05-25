import { motion } from 'framer-motion';
import { Play, Lock, Users, Crown } from 'lucide-react';

function getYoutubeThumbnail(url) {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export default function RoomCard({ room, onJoin }) {
  const thumbnail = room.thumbnail_url || getYoutubeThumbnail(room.video_url);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
      onClick={() => onJoin(room)}
    >
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/50 relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="w-14 h-14 rounded-full bg-primary/80 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
        {room.is_private && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <Lock className="w-3 h-3 text-white" />
            <span className="text-xs text-white">Privada</span>
          </div>
        )}
        {room.is_playing && (
          <div className="absolute top-3 left-3 bg-red-500/90 px-2 py-1 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs text-white font-medium">AO VIVO</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading font-bold line-clamp-1">{room.name}</h3>
        {room.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{room.description}</p>}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {(room.participants || []).length}</span>
          <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-yellow-400" /> {room.host_name}</span>
        </div>
      </div>
    </motion.div>
  );
}
