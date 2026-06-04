import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, BookOpen, Save, X, ArrowLeft, Users, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import TagsManager from '@/components/admin/TagsManager';

const genres = [
  'Romance', 'Dark Romance', 'Fantasia', 'Fantasia Sombria',
  'Ficção', 'Ficção Científica', 'Drama', 'Suspense',
  'Terror', 'Horror Psicológico', 'Mistério', 'Investigação',
  'Ação', 'Aventura', 'Distopia', 'Sobrenatural',
  'Mitologia', 'Histórico', 'Contemporâneo', 'Slice of Life',
  'LGBTQIA+', 'Comédia', 'Comédia Romântica', 'Escolar',
  'Vida Universitária', 'Poesia', 'Filosofia', 'Autoajuda',
  'Desenvolvimento Pessoal', 'Espiritualidade', 'Crimes', 'Biografia',
  'Mangá', 'Manhwa', 'Quadrinhos', 'HQ', 'Webtoon', 'Light Novel',
  'Horror Cósmico', 'Outros',
];

function convertGoogleDriveLink(url) {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  return url;
}

export default function Admin() {
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

  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground mt-2">Apenas administradores podem acessar esta área.</p>
        <Link to="/">
          <Button className="mt-6 rounded-xl">Voltar ao Painel</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/perfil" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Painel Administrativo
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie livros, administradores e conteúdo</p>
        </div>
      </div>

      <Tabs defaultValue="books">
        <TabsList className="bg-card/80 border border-border/50 rounded-xl p-1">
          <TabsTrigger value="books" className="rounded-lg gap-1.5"><BookOpen className="w-4 h-4" /> Livros</TabsTrigger>
          <TabsTrigger value="admins" className="rounded-lg gap-1.5"><Users className="w-4 h-4" /> Admins</TabsTrigger>
          <TabsTrigger value="tags" className="rounded-lg gap-1.5"><Tag className="w-4 h-4" /> Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <BooksManager queryClient={queryClient} />
        </TabsContent>
        <TabsContent value="admins">
          <AdminsManager queryClient={queryClient} currentUser={user} />
        </TabsContent>
        <TabsContent value="tags">
          <TagsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BooksManager({ queryClient }) {
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', cover_url: '', cover_drive_input: '', genre: 'Dark Romance', pdf_link: '', epub_link: '' });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const startEdit = (book) => {
    setForm({
      title: book.title || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
      cover_drive_input: '',
      genre: book.genre || 'Dark Romance',
      pdf_link: book.pdf_link || '',
      epub_link: book.epub_link || '',
    });
    setEditingBook(book);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ title: '', description: '', cover_url: '', cover_drive_input: '', genre: 'Dark Romance', pdf_link: '', epub_link: '' });
    setEditingBook(null);
    setShowForm(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line no-unused-vars
      const { cover_drive_input, ...bookData } = form;
      if (editingBook) {
        const { error } = await supabase.from('books').update(bookData).eq('id', editingBook.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('books').insert({
          ...bookData,
          likes: 0,
          views: 0,
          liked_by: [],
          created_date: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{books.length} livros cadastrados</p>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Adicionar Livro
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 border border-border/50 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold">{editingBook ? 'Editar Livro' : 'Novo Livro'}</h3>
            <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
            <Select value={form.genre} onValueChange={v => setForm({ ...form, genre: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl" />

          <div className="space-y-2">
            {form.cover_url && (
              <img src={form.cover_url} alt="Preview" className="w-32 aspect-[2/3] object-cover rounded-xl" />
            )}
            <Input
              placeholder="Link do Google Drive (ex: https://drive.google.com/file/d/.../view?usp=sharing)"
              value={form.cover_drive_input ?? ''}
              onChange={e => {
                const raw = e.target.value;
                setForm({ ...form, cover_drive_input: raw, cover_url: convertGoogleDriveLink(raw) });
              }}
              className="rounded-xl"
            />
          </div>

          <Input placeholder="Link do PDF (Google Drive)" value={form.pdf_link} onChange={e => setForm({ ...form, pdf_link: e.target.value })} className="rounded-xl" />
          <Input placeholder="Link do EPUB (Google Drive)" value={form.epub_link} onChange={e => setForm({ ...form, epub_link: e.target.value })} className="rounded-xl" />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.cover_url || saveMutation.isPending} className="bg-primary rounded-xl gap-2">
              <Save className="w-4 h-4" /> {editingBook ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {books.map(book => (
          <div key={book.id} className="bg-card/60 border border-border/30 rounded-xl p-4 flex items-center gap-4">
            <img src={book.cover_url} alt="" className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{book.title}</p>
              <p className="text-xs text-muted-foreground">{book.genre} • {book.views || 0} views • {book.likes || 0} likes</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => startEdit(book)} className="rounded-lg">Editar</Button>
              <Button variant="outline" size="sm" onClick={() => confirm('Excluir este livro?') && deleteMutation.mutate(book.id)} className="rounded-lg text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminsManager({ queryClient, currentUser }) {
  const { toast } = useToast();
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    },
  });

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  const promoteMutation = useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await supabase.from('users').update({ role: 'admin' }).eq('id', userId).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Nenhuma linha atualizada — verifique as políticas RLS da tabela users no Supabase.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário promovido a administrador.' });
    },
    onError: (err) => toast({ title: 'Erro ao promover', description: err.message, variant: 'destructive' }),
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await supabase.from('users').update({ role: 'user' }).eq('id', userId).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Nenhuma linha atualizada — verifique as políticas RLS da tabela users no Supabase.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Administrador removido.' });
    },
    onError: (err) => toast({ title: 'Erro ao remover admin', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h3 className="font-heading font-bold mb-3">Administradores Ativos ({admins.length})</h3>
        <div className="space-y-2">
          {admins.map(admin => (
            <div key={admin.id} className="bg-card/60 border border-border/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 ring-1 ring-border/30">
                {admin.avatar_url ? (
                  <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">
                    {(admin.full_name || 'A')[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{admin.full_name}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
              {admin.email !== currentUser?.email && (
                <Button
                  variant="outline" size="sm"
                  disabled={demoteMutation.isPending}
                  onClick={() => confirm('Remover administrador?') && demoteMutation.mutate(admin.id)}
                  className="rounded-lg text-destructive"
                >
                  {demoteMutation.isPending ? 'Removendo...' : 'Remover Admin'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-bold mb-3">Usuários ({regularUsers.length})</h3>
        <div className="space-y-2">
          {regularUsers.map(u => (
            <div key={u.id} className="bg-card/60 border border-border/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0 ring-1 ring-border/30">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {(u.full_name || 'U')[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Button
                variant="outline" size="sm"
                disabled={promoteMutation.isPending}
                onClick={() => confirm('Promover a administrador?') && promoteMutation.mutate(u.id)}
                className="rounded-lg text-primary"
              >
                <Shield className="w-3.5 h-3.5 mr-1" />
                {promoteMutation.isPending ? 'Promovendo...' : 'Promover'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
