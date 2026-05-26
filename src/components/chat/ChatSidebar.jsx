import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Users, Lock, MessageCircle, Search, Plus, X, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ChatSidebar({ groups, users, user, selectedConv, onSelectGroup, onSelectDM, onNewGroup, onNewChat, isMember, onViewProfile, unreadMap = {}, lastMsgByConv = {} }) {
  const [tab, setTab] = useState('dms');
  const [search, setSearch] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const { data: existingConvIds = [] } = useQuery({
    queryKey: ['dm-conv-ids', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('conversation_id')
        .ilike('conversation_id', `%${user.email}%`);
      if (error) throw error;
      return [...new Set((data || []).map(m => m.conversation_id))];
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const partnerEmails = existingConvIds.map(id => {
    if (id.startsWith(user.email + '_')) return id.slice(user.email.length + 1);
    if (id.endsWith('_' + user.email)) return id.slice(0, id.length - user.email.length - 1);
    return null;
  }).filter(Boolean);

  const normalize = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = normalize(search.trim());

  const dmPartners = (users || [])
    .filter(u => {
      if (u.email === user?.email) return false;
      if (!partnerEmails.includes(u.email)) return false;
      if (!q) return true;
      return normalize(u.username).includes(q) || normalize(u.full_name).includes(q) || (u.email || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const convA = [user?.email, a.email].sort().join('_');
      const convB = [user?.email, b.email].sort().join('_');
      const tA = lastMsgByConv[convA] || '';
      const tB = lastMsgByConv[convB] || '';
      return tB.localeCompare(tA);
    });

  const filteredGroups = (groups || []).filter(g =>
    !q || (g.name || '').toLowerCase().includes(q)
  );

  const otherUsers = (users || []).filter(u => u.email !== user?.email);
  const visibleMembers = otherUsers.slice(0, 5);
  const mq = normalize(memberSearch.trim());
  const filteredMembers = otherUsers.filter(u =>
    !mq || normalize(u.username).includes(mq) || normalize(u.full_name).includes(mq) || (u.email || '').includes(mq)
  );

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* Community members strip */}
      <div className="px-3 pt-3 pb-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Membros da Comunidade</p>
          <span className="text-[10px] text-muted-foreground/50">{otherUsers.length}</span>
        </div>
        <div className="flex gap-1.5 items-center">
          {visibleMembers.map(u => (
            <button
              key={u.id}
              onClick={(e) => { e.stopPropagation(); onViewProfile && onViewProfile(u.email); }}
              title={u.username || u.full_name}
              className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-1 ring-white/10 hover:ring-primary/50 transition-all"
            >
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.username || u.full_name || '?')[0].toUpperCase()}</div>
              }
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); setShowMembers(true); }}
            title="Ver todos os membros"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Conversations header */}
      <div className="p-3 border-b border-white/10 space-y-2 flex-shrink-0">
        <h2 className="font-heading text-base font-bold px-1">Conversas</h2>

        <div className="flex gap-1 bg-black/20 rounded-xl p-1">
          {[{ id: 'dms', label: 'Privado', icon: MessageCircle }, { id: 'groups', label: 'Grupos', icon: Users }].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(''); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={tab === 'groups' ? 'Buscar grupos...' : 'Buscar conversas...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-black/20 border-white/10 rounded-xl"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1">
        {tab === 'groups' ? (
          filteredGroups.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {q ? `Nenhum grupo para "${search}"` : 'Nenhum grupo ainda'}
            </p>
          ) : filteredGroups.map(group => {
            const active = selectedConv?.type === 'group' && selectedConv?.data?.id === group.id;
            return (
              <motion.button
                key={group.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectGroup(group)}
                className={`w-full p-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left ${active ? 'bg-primary/15 border-r-2 border-primary' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                  {group.photo_url
                    ? <img src={group.photo_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {group.is_private && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                    <p className="text-xs font-medium truncate">{group.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{(group.members || []).length} membros</p>
                </div>
                {!isMember(group) && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">Entrar</span>
                )}
              </motion.button>
            );
          })
        ) : (
          dmPartners.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {q ? `Nenhum resultado para "${search}"` : 'Nenhuma conversa ainda'}
            </p>
          ) : dmPartners.map(u => {
            const active = selectedConv?.type === 'dm' && selectedConv?.data?.email === u.email;
            const convId = [user?.email, u.email].sort().join('_');
            const hasUnread = !active && !!unreadMap[convId];
            return (
              <motion.button
                key={u.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectDM(u)}
                className={`w-full p-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left ${active ? 'bg-primary/15 border-r-2 border-primary' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 ring-1 ring-white/10 cursor-pointer"
                    onClick={e => { e.stopPropagation(); onViewProfile && onViewProfile(u.email); }}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.username || u.full_name || 'U')[0]}</div>
                    }
                  </div>
                  {/* Online dot — bottom right */}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${u.is_online ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  {/* Unread dot — top right */}
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${hasUnread ? 'text-foreground' : ''}`}>{u.username || u.full_name}</p>
                  <p className={`text-[10px] ${u.is_online ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {u.is_online ? '● Online' : '○ Offline'}
                  </p>
                </div>
                {hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Members overlay */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-10 flex flex-col"
            style={{ background: 'hsl(222 35% 9%)' }}
          >
            <div className="p-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { setShowMembers(false); setMemberSearch(''); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-heading text-sm font-bold flex-1">Membros da Comunidade</h3>
              <span className="text-xs text-muted-foreground">{otherUsers.length}</span>
            </div>
            <div className="p-3 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar membros..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-black/20 border-white/10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {filteredMembers.map(u => (
                <button
                  key={u.id}
                  onClick={() => onViewProfile && onViewProfile(u.email)}
                  className="w-full p-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-1 ring-white/10">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.username || u.full_name || '?')[0].toUpperCase()}</div>
                    }
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background ${u.is_online ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.username || u.full_name}</p>
                    <p className={`text-[10px] ${u.is_online ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {u.is_online ? '● Online' : '○ Offline'}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
