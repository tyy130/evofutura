'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AdminLogin from '@/components/AdminLogin';
import { format } from 'date-fns';

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  published: boolean;
};

type Subscriber = {
  id: string;
  email: string;
  source: string;
  active: boolean;
  createdAt: string;
};

type EditingPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image: string | null;
  published: boolean;
  revisions?: Revision[];
};

type Revision = {
  id: string;
  createdAt: string;
  changeLog: string;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'editor' | 'audience'>('dashboard');
  const [posts, setPosts] = useState<Post[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // AI Tools State
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('evo_admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
      fetchPosts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && view === 'audience') {
      fetchSubscribers();
    }
  }, [view, isAuthenticated]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/posts', {
        headers: { 'Authorization': 'Bearer evo-admin-2026' },
        cache: 'no-store'
      });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setErrorDetails(`Fetch Posts Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchSubscribers = async () => {
    const res = await fetch('/api/admin/subscribers', {
      headers: { 'Authorization': 'Bearer evo-admin-2026' },
      cache: 'no-store'
    });
    const data = await res.json();
    setSubscribers(data.subscribers || []);
  };

  const handleLogin = () => {
    sessionStorage.setItem('evo_admin_session', 'true');
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('evo_admin_session');
    setIsAuthenticated(false);
    setView('dashboard');
  };

  const exportCSV = () => {
    const headers = ['Email', 'Source', 'Status', 'Joined'];
    const rows = subscribers.map(s => [s.email, s.source, s.active ? 'Active' : 'Unsubscribed', s.createdAt]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `evofutura_audience_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const triggerGeneration = async () => {
    setLoading(true);
    setErrorDetails(null);
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer evo-admin-2026' },
        cache: 'no-store'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Agent failed (${response.status}): ${text}`);
      }

      const data = await response.json();
      if (data.success) {
        fetchPosts();
      }
    } catch (err) {
      setErrorDetails(`Agent Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = async (id: string) => {
    setErrorDetails(null);
    if (!id) {
      setErrorDetails("Error: Cannot open editor, missing Post ID.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        headers: { 'Authorization': 'Bearer evo-admin-2026' },
        cache: 'no-store'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data, null, 2));
      }

      const data = await res.json();
      if (!data.post) throw new Error("API returned no post data");

      setEditingPost(data.post);
      setView('editor');
      setAiResult("");
    } catch (err) {
      console.error(err);
      setErrorDetails(`Editor Load Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const savePost = async () => {
    if (!editingPost) return;
    setErrorDetails(null);
    try {
      const res = await fetch(`/api/admin/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer evo-admin-2026',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPost)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data, null, 2));
      }

      setView('dashboard');
      fetchPosts();
    } catch (err) {
      setErrorDetails(`Save Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setErrorDetails(null);
    try {
      await fetch(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer evo-admin-2026' }
      });
      fetchPosts();
    } catch (err) {
      setErrorDetails(`Delete Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const runAiTool = async (task: string) => {
    if (!editingPost) return;
    setAiLoading(true);
    setErrorDetails(null);
    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer evo-admin-2026' },
        body: JSON.stringify({ task, content: editingPost.content })
      });
      const data = await res.json();
      setAiResult(data.result);
    } catch (err) {
      setErrorDetails(`AI Tool Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (!isAuthenticated) return <AdminLogin onLogin={handleLogin} />;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-3xl font-heading font-black text-slate-950">CMS Command</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">v2.3.2 • Level 5 Access</p>
          </div>

          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setView('dashboard'); setErrorDetails(null); }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Content
            </button>
            <button
              onClick={() => { setView('audience'); setErrorDetails(null); }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${view === 'audience' ? 'bg-white shadow-sm text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Audience
            </button>
          </nav>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest border border-red-100 hover:border-red-200 px-4 py-2 rounded-lg transition-all"
        >
          Secure Sign Out
        </button>
      </header>

      {/* ERROR DISPLAY */}
      {errorDetails && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-red-800 font-bold text-sm uppercase tracking-widest">System Error Diagnostics</h3>
            <button onClick={() => setErrorDetails(null)} className="text-red-400 hover:text-red-600 font-bold">Close ✕</button>
          </div>
          <pre className="text-xs font-mono text-red-600 bg-white p-4 rounded-xl border border-red-100 overflow-x-auto max-h-60">
            {errorDetails}
          </pre>
        </div>
      )}

      {/* VIEW: DASHBOARD */}
      {view === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-950 font-heading flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-200"></span>
                Autonomous Engine
              </h2>
              <p className="text-sm text-slate-500">Trigger the AI agent to generate a fresh data transmission.</p>
            </div>
            <button
              onClick={triggerGeneration}
              disabled={loading}
              className={`px-8 py-4 rounded-xl font-bold text-white transition-all uppercase tracking-widest text-xs border border-white/10
                ${loading ? 'bg-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-lg active:scale-95'}`}
            >
              {loading ? 'Processing Agent...' : '⚡ Trigger New Article'}
            </button>
          </section>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-950 uppercase tracking-widest text-xs">Intelligence Archive</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Article</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Category</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Status</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No articles found in database.</td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-900">{post.title}</td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{post.category}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${post.published ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${post.published ? 'text-green-700' : 'text-yellow-700'}`}>
                            {post.published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right space-x-4">
                        <button onClick={() => openEditor(post.id)} className="text-blue-600 font-bold hover:text-blue-800 transition-colors">Edit</button>
                        <button onClick={() => deletePost(post.id)} className="text-slate-300 hover:text-red-500 font-bold transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: AUDIENCE */}
      {view === 'audience' && (
        <div className="space-y-8 animate-fade-in">
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-950 font-heading">Subscriber Database</h2>
              <p className="text-sm text-slate-500">Manage your newsletter audience ({subscribers.length} total).</p>
            </div>
            <button
              onClick={exportCSV}
              className="px-8 py-4 rounded-xl font-bold bg-slate-950 text-white hover:bg-blue-600 transition-all uppercase tracking-widest text-xs shadow-lg active:scale-95"
            >
              ↓ Export CSV
            </button>
          </section>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Email Identity</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Source</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Joined</th>
                  <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No subscribers yet.</td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-900 font-mono text-xs">{sub.email}</td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{sub.source || 'Unknown'}</span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 text-xs">
                        {format(new Date(sub.createdAt), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${sub.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.active ? 'Active' : 'Unsub'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: EDITOR */}
      {view === 'editor' && editingPost && (
        <div className="grid grid-cols-3 gap-8 min-h-[70vh] animate-fade-in">
          <div className="col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Article Headline</label>
              <input
                value={editingPost.title}
                onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                className="text-4xl font-heading font-extrabold bg-transparent border-none focus:outline-none placeholder-slate-200 w-full text-slate-950"
                placeholder="Article Title"
              />
            </div>

            <div className="flex gap-6 items-center">
              <div className="flex-grow space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Slug URL</label>
                <input
                  value={editingPost.slug}
                  onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
                  className="text-xs font-mono text-blue-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-full focus:outline-none"
                  placeholder="slug-url-here"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Visibility</label>
                <select
                  value={editingPost.published ? 'true' : 'false'}
                  onChange={e => setEditingPost({ ...editingPost, published: e.target.value === 'true' })}
                  className="text-xs font-bold bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 focus:outline-none block"
                >
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Featured Image</label>
              <div className="flex gap-4 items-start">
                <input
                  value={editingPost.image || ''}
                  onChange={e => setEditingPost({ ...editingPost, image: e.target.value })}
                  className="flex-grow px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-mono text-slate-600"
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {editingPost.image && (
                  <div className="w-16 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative">
                    <Image src={editingPost.image} alt="Preview" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-grow flex flex-col space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Content (Markdown/MDX)</label>
              <textarea
                value={editingPost.content}
                onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                className="flex-grow w-full p-8 rounded-[2rem] bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-sm leading-relaxed resize-none shadow-inner text-slate-700 transition-all"
              />
            </div>

            <button onClick={savePost} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
              Push Changes & Snapshot Revision
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-8 shadow-sm">
              <h3 className="font-bold text-slate-950 uppercase tracking-widest text-[10px] border-b border-slate-200 pb-4">AI Co-Pilot</h3>

              <div className="grid grid-cols-1 gap-3">
                {['grammar', 'summarize', 'seo'].map((tool) => (
                  <button
                    key={tool}
                    onClick={() => runAiTool(tool)}
                    disabled={aiLoading}
                    className="w-full text-left px-5 py-4 bg-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-md transition-all border border-slate-100 flex items-center justify-between group"
                  >
                    <span>{tool === 'grammar' ? 'Clean Grammar' : tool === 'summarize' ? 'Generate TL;DR' : 'SEO Analysis'}</span>
                    <span className="text-slate-300 group-hover:text-blue-500">→</span>
                  </button>
                ))}
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 min-h-[200px] text-[11px] font-mono text-blue-300 overflow-y-auto shadow-2xl border border-white/5 leading-relaxed">
                {aiLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                    <span>AI_AGENT_PROCESSING...</span>
                  </div>
                ) : (
                  aiResult || "// System Ready. Select tool to begin analysis."
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100 pb-4">Revision History</h4>
              <ul className="space-y-4">
                {editingPost?.revisions && editingPost.revisions.length > 0 ? (
                  editingPost.revisions.map((rev: Revision) => (
                    <li key={rev.id} className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-950 uppercase tracking-tighter">{format(new Date(rev.createdAt), 'MMM d, HH:mm')}</p>
                        <p className="text-[9px] text-slate-400 font-medium italic">{rev.changeLog}</p>
                      </div>
                      <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">v{rev.id.substring(0, 4)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[10px] text-slate-400 italic">No previous snapshots.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}