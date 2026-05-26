import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';

export default function RoomChat({ room, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', room.id)
      .order('created_date', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase
      .channel(`room-chat-${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `group_id=eq.${room.id}`,
      }, (payload) => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `group_id=eq.${room.id}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    const { data } = await supabase.from('chat_messages').insert({
      group_id: room.id,
      content,
      sender_name: user?.username || user?.full_name || 'Anônimo',
      sender_avatar: user?.avatar_url || '',
      message_type: 'text',
      created_by: user?.email || '',
      created_date: new Date().toISOString(),
    }).select().single();
    if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.created_by === user?.email;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/20 flex-shrink-0">
                {msg.sender_avatar
                  ? <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-primary">{(msg.sender_name || '?')[0]}</div>
                }
              </div>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">{msg.sender_name}</span>}
                <div className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card/80 border border-border/30 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/20 p-2 flex gap-2 items-center">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Mensagem..."
          disabled={sending}
          className="flex-1 min-w-0 bg-card/60 border border-border/30 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
