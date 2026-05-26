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

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, []);
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
    staleTime: 30_000,
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

  const isMember = (group) => (group.members || []).includes(user?.email);

  const handleSelectGroup = (group) => {
    if (!isMember(group)) joinGroup.mutate(group);
    setSelectedConv({ type: 'group', data: group });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectDM = (u) => {
    setSelectedConv({ type: 'dm', data: u });
    setShowNewChat(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="md:max-w-7xl md:mx-auto md:px-4 md:py-6 md:flex md:flex-col md:gap-4">
      {/* Chat area */}
      <div
        className="flex h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-12rem)] md:rounded-2xl overflow-hidden md:border border-white/10 shadow-2xl"
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
