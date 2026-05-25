import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusViewer from './StatusViewer';
import AddStatusModal from './AddStatusModal';

function Avatar({ user, hasStory, seen, onClick, isMe }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className={`p-0.5 rounded-full ${hasStory ? (seen ? 'bg-muted-foreground/30' : 'bg-gradient-to-tr from-primary via-violet-500 to-pink-500') : 'bg-transparent'}`}>
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background bg-muted relative">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10">
              {(user?.username || user?.full_name || '?')[0].toUpperCase()}
            </div>
          )}
          {isMe && !hasStory && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Plus className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">
        {isMe ? 'Seu status' : (user?.username || user?.full_name || '?')}
      </span>
    </motion.button>
  );
}

export default function StatusBar({ currentUser }) {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const now = Date.now();

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
    select: data => data.filter(s => !s.expires_at || s.expires_at > now),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const grouped = {};
  for (const s of allStatuses) {
    if (!grouped[s.author_email]) grouped[s.author_email] = [];
    grouped[s.author_email].push(s);
  }

  const myStatuses = grouped[currentUser?.email] || [];
  const othersWithStatuses = Object.entries(grouped)
    .filter(([email]) => email !== currentUser?.email)
    .map(([email, statuses]) => ({
      email,
      statuses,
      user: allUsers.find(u => u.email === email),
    }));

  const hasSeen = (statuses) =>
    statuses.every(s => (s.views || []).includes(currentUser?.email));

  const openViewer = (email, statuses) => setViewing({ userEmail: email, statuses });

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-none">
        <div className="flex gap-4 px-4 py-3 min-w-max">
          <Avatar
            user={currentUser}
            hasStory={myStatuses.length > 0}
            seen={false}
            isMe={true}
            onClick={() => myStatuses.length > 0 ? openViewer(currentUser?.email, myStatuses) : setShowAdd(true)}
          />

          {othersWithStatuses.map(({ email, statuses, user }) => (
            <Avatar
              key={email}
              user={user}
              hasStory={true}
              seen={hasSeen(statuses)}
              onClick={() => openViewer(email, statuses)}
            />
          ))}
        </div>
      </div>

      {viewing && (
        <StatusViewer
          userEmail={viewing.userEmail}
          statuses={viewing.statuses}
          currentUser={currentUser}
          onClose={() => { setViewing(null); queryClient.invalidateQueries({ queryKey: ['statuses'] }); }}
          onAddOwn={() => { setViewing(null); setShowAdd(true); }}
        />
      )}

      {showAdd && (
        <AddStatusModal
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['statuses'] });
            setShowAdd(false);
          }}
        />
      )}
    </>
  );
}
