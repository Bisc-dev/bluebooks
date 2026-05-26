import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { MessageCircle } from 'lucide-react';
import ChatSidebar from '@/components/chat/ChatSidebar.jsx';
import ChatWindow from '@/components/chat/ChatWindow';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import NewChatModal from '@/components/chat/NewChatModal.jsx';
import UserProfile from '@/pages/UserProfile';

export default function Chats() {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const queryClient = useQueryClient();

  const { user: authUser } = useAuth();

  const { data: user } = useQuery({
    queryKey: ['me', authUser?.email],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('email', authUser.email).single();
      return data;
    },
    enabled: !!authUser?.email,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['chat-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_groups')
        .select('*')
        .order('updated_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchInterval: 10_000,
  });

  const createGroup = useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.from('chat_groups').insert({
        ...form,
        members: [user?.email],
        admins: [user?.email],
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setShowCreate(false);
    },
  });

  const joinGroup = useMutation({
    mutationFn: async (group) => {
      const members = group.members || [];
      if (!members.includes(user?.email)) {
        const { error } = await supabase
          .from('chat_groups')
          .update({ members: [...members, user?.email] })
          .eq('id', group.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-groups'] }),
  });

  // Unread DM tracking
  const [lastRead, setLastRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dm_last_read') || '{}'); }
    catch { return {}; }
  });

  const markRead = (convId) => {
    setLastRead(prev => {
      const next = { ...prev, [convId]: new Date().toISOString() };
      localStorage.setItem('dm_last_read', JSON.stringify(next));
      return next;
    });
  };

  const { data: recentDmMessages = [] } = useQuery({
    queryKey: ['dm-recent-messages', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('conversation_id, created_by, created_date')
        .ilike('conversation_id', `%${user.email}%`)
        .order('created_date', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
    refetchInterval: 8_000,
  });

  // From recentDmMessages derive two maps in one pass
  const lastMsgByConv = {};     // convId → latest created_date (any sender, for sorting)
  const lastIncomingByConv = {}; // convId → latest msg from others (for unread)
  for (const msg of recentDmMessages) {
    if (!lastMsgByConv[msg.conversation_id]) {
      lastMsgByConv[msg.conversation_id] = msg.created_date;
    }
    if (msg.created_by !== user?.email && !lastIncomingByConv[msg.conversation_id]) {
      lastIncomingByConv[msg.conversation_id] = msg;
    }
  }

  // Mark current DM as read whenever it becomes active or new messages arrive
  useEffect(() => {
    if (!selectedConv || selectedConv.type !== 'dm' || !user?.email) return;
    const convId = [user.email, selectedConv.data.email].sort().join('_');
    markRead(convId);
  }, [selectedConv?.data?.email, recentDmMessages, user?.email]);

  const unreadMap = Object.fromEntries(
    Object.entries(lastIncomingByConv).map(([convId, msg]) => {
      const readAt = lastRead[convId];
      const isUnread = !readAt || new Date(msg.created_date) > new Date(readAt);
      return [convId, isUnread];
    })
  );

  const isMember = (group) => (group.members || []).includes(user?.email);

  const handleSelectGroup = (group) => {
    if (!isMember(group)) joinGroup.mutate(group);
    setSelectedConv({ type: 'group', data: group });
  };

  const handleSelectDM = (u) => {
    const convId = [user?.email, u.email].sort().join('_');
    markRead(convId);
    setSelectedConv({ type: 'dm', data: u });
    setShowNewChat(false);
  };

  return (
    <div className="md:max-w-7xl md:mx-auto md:px-4 md:py-6 md:flex md:flex-col md:gap-4">
      {/* Chat area — fixed on mobile to avoid page-scroll issues */}
      <div
        className="flex fixed inset-x-0 top-16 bottom-14 md:static md:h-[calc(100vh-12rem)] md:rounded-2xl overflow-hidden md:border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, hsl(222 35% 9%) 0%, hsl(222 30% 13%) 100%)' }}
      >
        {/* Sidebar */}
        <div className={`w-full md:w-72 border-r border-white/10 flex-shrink-0 ${selectedConv ? 'hidden md:block' : 'block'}`}>
          <ChatSidebar
            groups={groups}
            users={users}
            user={user}
            selectedConv={selectedConv}
            onSelectGroup={handleSelectGroup}
            onSelectDM={handleSelectDM}
            onNewGroup={() => setShowCreate(true)}
            onNewChat={() => setShowNewChat(true)}
            isMember={isMember}
            onViewProfile={setViewingProfile}
            unreadMap={unreadMap}
            lastMsgByConv={lastMsgByConv}
          />
        </div>

        {/* Chat window */}
        <div className={`flex-1 ${!selectedConv ? 'hidden md:flex' : 'flex'} flex-col`}>
          {selectedConv ? (
            <ChatWindow
              conv={selectedConv}
              user={user}
              onClose={() => setSelectedConv(null)}
              onViewProfile={setViewingProfile}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <MessageCircle className="w-8 h-8 text-primary/60" />
              </div>
              <p className="font-heading font-bold text-lg text-foreground/70">Suas conversas</p>
              <p className="text-sm max-w-xs">Selecione um grupo ou inicie uma conversa direta.</p>
            </div>
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={createGroup.mutate}
        isPending={createGroup.isPending}
        users={users}
        currentUser={user}
      />

      {showNewChat && (
        <NewChatModal
          currentUser={user}
          onSelect={handleSelectDM}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {viewingProfile && (
        <UserProfile
          userEmail={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onStartChat={(email) => {
            const target = users.find(u => u.email === email);
            if (target) handleSelectDM(target);
            setViewingProfile(null);
          }}
        />
      )}
    </div>
  );
}
