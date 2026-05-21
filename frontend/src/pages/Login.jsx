/**
 * src/pages/Login.jsx
 * ────────────────────
 * Trang đăng nhập: form username + password, gọi POST /auth/login,
 * lưu token vào AuthContext + localStorage, rồi chuyển về Home.
 */
import React, { useState } from 'react';
import { Network, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ onLoginSuccess, onGoRegister }) {
  const { login } = useAuth();

  const [form, setForm]     = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotContact, setForgotContact] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  const handle = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login({ username: form.username, password: form.password });
      onLoginSuccess?.();
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotContact) return;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: forgotContact.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi hệ thống');
      setForgotMsg({ type: 'success', text: `${data.message} ${data.code ? 'Mã của bạn là: ' + data.code : ''}` });
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.message });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d3b38 60%, #134e4a 100%)' }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-900/50 mb-4">
            <Network size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">AMNTDDA</h1>
          <p className="text-teal-300 text-sm mt-1 font-semibold">Drug–Disease Prediction System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-8">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-teal-300 uppercase tracking-widest">
                Tên đăng nhập (Email)
              </label>
              <input
                type="text"
                value={form.username}
                onChange={handle('username')}
                autoFocus
                placeholder="vd: vana@gmail.com"
                className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 font-bold outline-none focus:border-teal-400 focus:bg-white/15 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-teal-300 uppercase tracking-widest">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handle('password')}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 font-bold outline-none focus:border-teal-400 focus:bg-white/15 transition-all pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-teal-300 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  className="text-[10px] font-black text-teal-300 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-teal-900/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Đang đăng nhập...</span>
              ) : (
                <><LogIn size={18} /> Đăng nhập</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              Chưa có tài khoản?{' '}
              <button
                onClick={onGoRegister}
                className="text-teal-300 font-black hover:text-teal-200 transition-colors"
              >
                Đăng ký ngay
              </button>
            </p>
            <p className="text-white/30 text-xs mt-3">
              Mặc định: admin / admin123 · user / user123
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-2">Quên mật khẩu</h3>
            <p className="text-sm text-slate-400 mb-6">Nhập Email hoặc số điện thoại để nhận mã khôi phục tạm thời.</p>
            
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={forgotContact}
                  onChange={(e) => setForgotContact(e.target.value)}
                  placeholder="Email / Số điện thoại"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-semibold"
                />
              </div>
              
              {forgotMsg && (
                <div className={`p-3 rounded-xl text-sm font-semibold ${forgotMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                  {forgotMsg.text}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotMsg(null); setForgotContact(''); }}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotContact}
                  className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all"
                >
                  {forgotLoading ? 'Đang gửi...' : 'Gửi mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
