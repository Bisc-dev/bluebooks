import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Lock, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ChatSidebar({ groups, users, user, selectedConv, onSelectGroup, onSelectDM, onNewGroup, onNewChat, isMember, onViewProfile }) {
  const [tab, setTab] = useState('groups');
  const [search, setSearch] = useState('');

  const normalize = (str) =>
    (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const q = normalize(search.trim());

  const dmPartners = (users || []).filter(u => {
    if (u.email === user?.email) return false;
    if (!q) return true;
    return (
      normalize(u.full_name).includes(q) ||
      normalize(u.username).includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const filteredGroups = (groups || []).filter(g =>
    !q || (g.name || '').toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/10 space-y-2">
        <h2 className="font-heading text-base font-bold px-1">Conversas</h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-black/20 rounded-xl p-1">
          {[{ id: 'groups', label: 'Grupos', icon: Users }, { id: 'dms', label: 'Direto', icon: MessageCircle }].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(''); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={tab === 'groups' ? 'Buscar grupos...' : 'Buscar pessoas...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-black/20 border-white/10 rounded-xl"
          />
        </div>
      </div>

      {/* List */}
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
              {q ? `Nenhum resultado para "${search}"` : 'Nenhum usuário encontrado'}
            </p>
          ) : dmPartners.map(u => {
            const active = selectedConv?.type === 'dm' && selectedConv?.data?.email === u.email;
            return (
              <motion.button
                key={u.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectDM(u)}
                className={`w-full p-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors text-left ${active ? 'bg-primary/15 border-r-2 border-primary' : ''}`}
              >
                <div
                  className="relative w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-1 ring-white/10 cursor-pointer"
                  onClick={e => { e.stopPropagation(); onViewProfile && onViewProfile(u.email); }}
                >
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{(u.full_name || 'U')[0]}</div>
                  }
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background ${u.is_online ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{u.username || u.full_name}</p>
                  <p className={`text-[10px] ${u.is_online ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {u.is_online ? '● Online' : '○ Offline'}
                  </p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
