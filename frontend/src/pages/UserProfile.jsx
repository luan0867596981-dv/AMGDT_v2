import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Key, Camera, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react';

export default function UserProfile() {
  const { user, token, setUser } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Sync state if context user updates
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (newPassword && newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (newPassword && !oldPassword) {
      setError('Vui lòng nhập mật khẩu cũ để đổi mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName !== user.full_name ? fullName : undefined,
          phone: phone !== user.phone ? phone : undefined,
          old_password: oldPassword || undefined,
          new_password: newPassword || undefined
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi cập nhật');
      
      setUser(data.user);
      setMessage('Cập nhật hồ sơ thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi tải ảnh lên');
      
      setUser({ ...user, avatar_url: data.avatar_url });
      setMessage('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 pb-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Hồ sơ cá nhân</h1>
          <p className="text-slate-500 font-medium mt-2">Quản lý thông tin tài khoản và bảo mật của bạn</p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm">{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Cột trái: Thông tin hiển thị & Avatar */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
              
              <div className="relative mt-8 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={`http://127.0.0.1:8000${user.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-slate-400" />
                  )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <h2 className="text-2xl font-black mt-4 text-slate-800 dark:text-white">{user.username}</h2>
              <span className={`mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${user.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                {user.role}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500"><Calendar size={18}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Ngày tham gia</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{user.created_at ? new Date(user.created_at + 'Z').toLocaleDateString('vi-VN') : 'Không rõ'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500"><Clock size={18}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Hoạt động cuối</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{user.last_login ? new Date(user.last_login + 'Z').toLocaleString('vi-VN') : 'Chưa có'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Form cập nhật */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm">
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Mail size={20} className="text-teal-500"/> Thông tin liên hệ</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Tên đăng nhập</label>
                      <input type="text" value={user.username} disabled className="w-full p-4 mt-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700 text-slate-500 cursor-not-allowed font-medium outline-none" />
                      <p className="text-[10px] text-slate-400 mt-1">Không thể thay đổi tên đăng nhập.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên</label>
                        <input 
                          type="text" 
                          value={fullName} 
                          onChange={e=>setFullName(e.target.value)} 
                          placeholder="vd: Nguyễn Văn A"
                          className="w-full p-4 mt-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 ring-teal-500/50" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Số điện thoại</label>
                        <input 
                          type="tel" 
                          value={phone} 
                          onChange={e=>setPhone(e.target.value)} 
                          placeholder="vd: 0912345678"
                          className="w-full p-4 mt-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 ring-teal-500/50" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Shield size={20} className="text-rose-500"/> Đổi mật khẩu</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu cũ (hoặc Mã khôi phục) <span className="text-rose-500">*</span></label>
                      <input 
                        type="password" 
                        value={oldPassword} 
                        onChange={e=>setOldPassword(e.target.value)} 
                        placeholder="Nhập mật khẩu hiện tại hoặc mã khôi phục"
                        className="w-full p-4 mt-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 ring-teal-500/50" 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu mới</label>
                        <input 
                          type="password" 
                          value={newPassword} 
                          onChange={e=>setNewPassword(e.target.value)} 
                          placeholder="Nhập mật khẩu mới"
                          className="w-full p-4 mt-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 ring-teal-500/50" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Xác nhận mật khẩu</label>
                        <input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={e=>setConfirmPassword(e.target.value)} 
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full p-4 mt-1 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 ring-teal-500/50" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
