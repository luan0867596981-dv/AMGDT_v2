import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Search, Trash2, Edit, ShieldAlert, CheckCircle2, AlertCircle, Shield, X, Save, User } from 'lucide-react';

export default function UserManagement() {
  const { user, token } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi tải danh sách người dùng');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchUsers();
    }
  }, [token, user]);

  const handleEditClick = (u) => {
    setEditingUser(u.id);
    setEditForm({
      role: u.role,
      is_active: u.is_active,
      email: u.email,
      password: ''
    });
  };

  const handleSaveEdit = async (uId) => {
    try {
      const body = { ...editForm };
      if (!body.password) delete body.password; // Don't send empty password
      
      const res = await fetch(`http://127.0.0.1:8000/admin/users/${uId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Lỗi cập nhật');
      }
      
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Lỗi xóa người dùng');
      }
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldAlert size={40} className="text-rose-500 mb-6" />
        <h2 className="text-2xl font-black mb-2 uppercase text-slate-800 dark:text-slate-100">Truy cập bị từ chối</h2>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 pb-24 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Users className="text-indigo-500"/> Quản lý người dùng
            </h1>
            <p className="text-slate-500 font-medium mt-2">Tổng số: <span className="font-black text-indigo-600">{users.length}</span> tài khoản</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm username hoặc email..." 
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-medium outline-none focus:ring-2 ring-indigo-500/50"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 font-bold text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <tr>
                  <th className="p-4">Người dùng</th>
                  <th className="p-4">Liên hệ</th>
                  <th className="p-4">Phân quyền</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 text-center">Hoạt động</th>
                  <th className="p-4 text-center">Lượt dự đoán</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 animate-pulse">Đang tải dữ liệu...</td></tr>
                ) : filteredUsers.map((u) => {
                  const isEditing = editingUser === u.id;
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center shrink-0">
                            {u.avatar_url ? (
                              <img src={`http://127.0.0.1:8000${u.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{u.username}</p>
                            <p className="text-[10px] text-slate-400">ID: {u.id}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <input 
                            type="email" 
                            value={editForm.email} 
                            onChange={e=>setEditForm({...editForm, email: e.target.value})} 
                            className="w-full p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                          />
                        ) : (
                          <span className="font-medium text-slate-600 dark:text-slate-400">{u.email}</span>
                        )}
                        
                        {isEditing && (
                          <input 
                            type="password" 
                            placeholder="Mật khẩu mới (bỏ trống nếu giữ nguyên)"
                            value={editForm.password} 
                            onChange={e=>setEditForm({...editForm, password: e.target.value})} 
                            className="w-full p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs mt-2"
                          />
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <select 
                            value={editForm.role} 
                            onChange={e=>setEditForm({...editForm, role: e.target.value})}
                            className="p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30'}`}>
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                          <select 
                            value={editForm.is_active} 
                            onChange={e=>setEditForm({...editForm, is_active: e.target.value === 'true'})}
                            className="p-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                          >
                            <option value="true">Hoạt động</option>
                            <option value="false">Khóa</option>
                          </select>
                        ) : (
                          <div className="flex justify-center">
                            {u.is_active ? 
                              <CheckCircle2 size={18} className="text-emerald-500" title="Hoạt động" /> : 
                              <AlertCircle size={18} className="text-rose-500" title="Bị khóa" />
                            }
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Ngày tạo:</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                          {u.created_at ? new Date(u.created_at + 'Z').toLocaleDateString('vi-VN') : 'Không rõ'}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Lần cuối:</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {u.last_login ? new Date(u.last_login + 'Z').toLocaleString('vi-VN') : 'Chưa có'}
                        </p>
                      </td>

                      <td className="p-4 text-center font-bold text-indigo-500">
                        {u.prediction_count}
                      </td>

                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={()=>handleSaveEdit(u.id)} className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-200"><Save size={16}/></button>
                            <button onClick={()=>setEditingUser(null)} className="p-2 bg-slate-100 text-slate-600 dark:bg-slate-800 rounded-lg hover:bg-slate-200"><X size={16}/></button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 opacity-50 hover:opacity-100 transition-opacity">
                            <button onClick={()=>handleEditClick(u)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Sửa"><Edit size={16}/></button>
                            {u.id !== user.id && (
                              <button onClick={()=>setDeletingUser(u)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg" title="Xóa"><Trash2 size={16}/></button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Cảnh báo xóa</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn có chắc chắn muốn xóa người dùng <strong className="text-rose-500">{deletingUser.username}</strong>? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-4">
              <button onClick={()=>setDeletingUser(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 text-slate-700 dark:text-slate-300">Hủy</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-500/30 hover:bg-rose-600">Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
