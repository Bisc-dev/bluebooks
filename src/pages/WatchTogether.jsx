import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Tv, Trash2, Clapperboard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import RoomCard from '@/components/cineblue/RoomCard';
import PasswordModal from '@/components/cineblue/PasswordModal';
import WatchRoom from '@/components/cineblue/WatchRoom.jsx';
import UserProfile from '@/pages/UserProfile';

export default function WatchTogether() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Clapperboard className="w-10 h-10 text-primary/60" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold">CineBlue</h1>
        <p className="text-muted-foreground max-w-sm">
          Esta funcionalidade está em construção e em breve estará disponível para você.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground/60 bg-muted/30 px-4 py-2 rounded-full">
        <Clock className="w-4 h-4" />
        <span>Em breve</span>
      </div>
    </div>
  );

  const [showCreate, setShowCreate] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [newRoom, setNewRoom] = useState({
    name: '', description: '', video_url: '',
    video_source: 'youtube', is_private: false, room_password: '',
  });
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

  const { data: rooms = [] } = useQuery({
    queryKey: ['watch-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watch_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Auto-cleanup: mark rooms with 0 participants as inactive
  useEffect(() => {
    if (!rooms.length) return;
    rooms.forEach(async (room) => {
      const parts = room.participants || [];
      if (parts.length === 0 && room.is_active) {
        await supabase.from('watch_rooms').update({ is_active: false }).eq('id', room.id);
        queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
      }
    });
  }, [rooms]);

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('watch_rooms')
        .insert({
          ...newRoom,
          host_email: user?.email,
          host_name: user?.username || user?.full_name,
          participants: [user?.email],
          is_playing: false,
          current_time: 0,
          last_sync_at: Date.now(),
          is_active: true,
          created_date: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
      setShowCreate(false);
      setNewRoom({ name: '', description: '', video_url: '', video_source: 'youtube', is_private: false, room_password: '' });
      setActiveRoom(created);
    },
  });

  const joinRoom = async (room) => {
    const participants = room.participants || [];
    let activeRoomData = room;
    if (!participants.includes(user?.email)) {
      const { data } = await supabase
        .from('watch_rooms')
        .update({ participants: [...participants, user?.email] })
        .eq('id', room.id)
        .select()
        .single();
      queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
      activeRoomData = data || room;
    }
    setActiveRoom(activeRoomData);
  };

  const handleJoin = (room) => {
    if (room.is_private && room.room_password && room.host_email !== user?.email) {
      setPendingRoom(room);
    } else {
      joinRoom(room);
    }
  };

  const adminDeleteRoom = async (room) => {
    await supabase.from('watch_rooms').update({ is_active: false }).eq('id', room.id);
    await supabase.from('watch_rooms').delete().eq('id', room.id);
    queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
  };

  const isAdmin = user?.role === 'admin';

  if (activeRoom) {
    return (
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        <WatchRoom
          initialRoom={activeRoom}
          user={user}
          onViewProfile={setViewingProfile}
          onLeave={async () => {
            const room = activeRoom;
            const participants = (room.participants || []).filter(e => e !== user?.email);
            if (participants.length === 0) {
              await supabase.from('watch_rooms').update({ is_active: false, participants }).eq('id', room.id);
              await supabase.from('watch_rooms').delete().eq('id', room.id);
            } else {
              await supabase.from('watch_rooms').update({ participants }).eq('id', room.id);
            }
            setActiveRoom(null);
            queryClient.invalidateQueries({ queryKey: ['watch-rooms'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">CineBlue</h1>
          <p className="text-sm text-muted-foreground mt-1">Assista vídeos com seus amigos em tempo real</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-xl gap-2 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" /> Criar Sala
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading">Nova Sala CineBlue</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome da sala" value={newRoom.name} onChange={e => setNewRoom(r => ({ ...r, name: e.target.value }))} className="rounded-xl" />
              <Textarea placeholder="Descrição (opcional)" value={newRoom.description} onChange={e => setNewRoom(r => ({ ...r, description: e.target.value }))} className="rounded-xl" rows={2} />
              <Select value={newRoom.video_source} onValueChange={v => setNewRoom(r => ({ ...r, video_source: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="googledrive">Google Drive</SelectItem>
                  <SelectItem value="direct">Link Direto</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="URL do vídeo" value={newRoom.video_url} onChange={e => setNewRoom(r => ({ ...r, video_url: e.target.value }))} className="rounded-xl" />
              <div className="flex items-center gap-2">
                <Switch checked={newRoom.is_private} onCheckedChange={v => setNewRoom(r => ({ ...r, is_private: v }))} />
                <Label>Sala privada</Label>
              </div>
              {newRoom.is_private && (
                <Input type="password" placeholder="Senha da sala" value={newRoom.room_password} onChange={e => setNewRoom(r => ({ ...r, room_password: e.target.value }))} className="rounded-xl" />
              )}
              <Button onClick={() => createRoom.mutate()} disabled={!newRoom.name || !newRoom.video_url || createRoom.isPending} className="w-full bg-primary rounded-xl">
                {createRoom.isPending ? 'Criando...' : 'Criar Sala'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map(room => (
          <div key={room.id} className="relative group">
            <RoomCard room={room} onJoin={handleJoin} />
            {isAdmin && room.host_email !== user?.email && (
              <button
                onClick={() => adminDeleteRoom(room)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Admin: excluir sala"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full text-center py-20">
            <Tv className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma sala ativa. Crie a primeira!</p>
          </div>
        )}
      </div>

      {pendingRoom && (
        <PasswordModal
          room={pendingRoom}
          onConfirm={() => { joinRoom(pendingRoom); setPendingRoom(null); }}
          onCancel={() => setPendingRoom(null)}
        />
      )}

      {viewingProfile && (
        <UserProfile userEmail={viewingProfile} onClose={() => setViewingProfile(null)} />
      )}
    </div>
  );
}
