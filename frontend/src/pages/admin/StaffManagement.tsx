import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { 
  Users, Plus, Edit2, Trash2, X, Loader2, Save, RefreshCw, AlertTriangle
} from 'lucide-react';

interface Employee {
  id: number;
  staff_code: string;
  full_name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export const StaffManagement: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Add Employee Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    staffCode: '',
    fullName: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    staffCode: '',
    fullName: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Custom Delete Confirm State
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/employees');
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách nhân viên', 'error');
      // Stub fallback for local testing
      setEmployees([
        {
          id: 1,
          staff_code: 'NV001',
          full_name: 'Trần Thị Mỹ Duyên',
          phone: '0912345678',
          address: '456 Nguyễn Thị Minh Khai, Q3, TPHCM',
          notes: 'Nhân viên kỹ thuật chính',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          staff_code: 'NV002',
          full_name: 'Lê Hoàng Long',
          phone: '0987654321',
          address: '789 Võ Văn Tần, Q3, TPHCM',
          notes: 'Nhân viên bán hàng ca sáng',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.staffCode || !newEmployee.fullName) {
      addToast('Mã nhân viên và Họ tên là bắt buộc', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.post('/employees', newEmployee);
      if (res.data.success) {
        addToast('Thêm nhân viên mới thành công', 'success');
        setNewEmployee({
          staffCode: '',
          fullName: '',
          phone: '',
          address: '',
          notes: ''
        });
        setShowAddForm(false);
        fetchEmployees();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi thêm nhân viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingRowId(emp.id);
    setEditFormData({
      staffCode: emp.staff_code,
      fullName: emp.full_name,
      phone: emp.phone || '',
      address: emp.address || '',
      notes: emp.notes || ''
    });
  };

  const handleEditSave = async (id: number) => {
    if (!editFormData.staffCode || !editFormData.fullName) {
      addToast('Mã nhân viên và Họ tên là bắt buộc', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.put(`/employees/${id}`, editFormData);
      if (res.data.success) {
        addToast('Cập nhật thông tin nhân viên thành công', 'success');
        setEditingRowId(null);
        fetchEmployees();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi cập nhật nhân viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const res = await axiosClient.delete(`/employees/${id}`);
      if (res.data.success) {
        addToast('Xóa nhân viên thành công', 'success');
        setConfirmDeleteId(null);
        fetchEmployees();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa nhân viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <Users className="text-vintage-gold" /> Nhân sự
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Quản lý danh sách nhân sự thuộc mảng cho thuê máy.
          </p>
        </div>
        <button
          onClick={fetchEmployees}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-100 hover:bg-vintage-gold/15 text-xs text-warm-gray-800 transition-all cursor-pointer font-bold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Tải lại
        </button>
      </div>

      {/* Control / Add button */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Hủy' : 'Thêm nhân viên mới'}
        </button>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-4">
          <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Đăng ký nhân viên mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-warm-gray-700 mb-1">Mã nhân viên (MSNV) <span className="text-film-red">*</span></label>
              <input
                type="text"
                value={newEmployee.staffCode}
                onChange={e => setNewEmployee({ ...newEmployee, staffCode: e.target.value })}
                placeholder="Ví dụ: NV003"
                className="w-full px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 text-sm text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-warm-gray-700 mb-1">Họ tên nhân viên <span className="text-film-red">*</span></label>
              <input
                type="text"
                value={newEmployee.fullName}
                onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn B"
                className="w-full px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 text-sm text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-warm-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={newEmployee.phone}
                onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                placeholder="Ví dụ: 0901234567"
                className="w-full px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 text-sm text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-warm-gray-700 mb-1">Địa chỉ</label>
              <input
                type="text"
                value={newEmployee.address}
                onChange={e => setNewEmployee({ ...newEmployee, address: e.target.value })}
                placeholder="Ví dụ: 123 Lý Tự Trọng, Quận 1"
                className="w-full px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 text-sm text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-warm-gray-700 mb-1">Ghi chú</label>
              <input
                type="text"
                value={newEmployee.notes}
                onChange={e => setNewEmployee({ ...newEmployee, notes: e.target.value })}
                placeholder="Ghi chú về nhân viên..."
                className="w-full px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 text-sm text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-gold hover:bg-vintage-gold-light text-vintage-sepia-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
              Lưu nhân viên
            </button>
          </div>
        </form>
      )}

      {/* Employees Table */}
      {loading && employees.length === 0 ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : employees.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy thông tin nhân viên nào.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-4 w-28">MSNV</th>
                <th className="p-4">Tên nhân viên</th>
                <th className="p-4">Số điện thoại</th>
                <th className="p-4">Địa chỉ cư trú</th>
                <th className="p-4">Ghi chú</th>
                <th className="p-4 text-center w-36">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {employees.map(emp => {
                const isEditing = editingRowId === emp.id;
                return (
                  <tr key={emp.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4 font-mono font-bold text-warm-gray-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.staffCode}
                          onChange={e => setEditFormData({ ...editFormData, staffCode: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-vintage-sepia-200 bg-white text-xs font-mono font-bold focus:outline-none"
                        />
                      ) : (
                        emp.staff_code
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.fullName}
                          onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-vintage-sepia-200 bg-white text-xs font-bold focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-sm text-vintage-sepia-900">{emp.full_name}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-warm-gray-700">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-vintage-sepia-200 bg-white text-xs focus:outline-none"
                        />
                      ) : (
                        emp.phone || '-'
                      )}
                    </td>
                    <td className="p-4 text-warm-gray-700">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.address}
                          onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-vintage-sepia-200 bg-white text-xs focus:outline-none"
                        />
                      ) : (
                        emp.address || '-'
                      )}
                    </td>
                    <td className="p-4 text-warm-gray-700 italic">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.notes}
                          onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-vintage-sepia-200 bg-white text-xs focus:outline-none"
                        />
                      ) : (
                        emp.notes || '-'
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleEditSave(emp.id)}
                              disabled={loading}
                              title="Lưu dòng này"
                              className="p-2 rounded bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              title="Hủy bỏ"
                              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(emp)}
                              title="Chỉnh sửa dòng này"
                              className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(emp.id)}
                              title="Xóa nhân viên"
                              className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-vintage-sepia-200 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-film-red mx-auto" />
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Xác nhận xóa nhân viên</h3>
            <p className="text-sm text-warm-gray-700">
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 text-sm font-semibold text-warm-gray-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-lg bg-film-red hover:bg-film-red-light text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Xác thực Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffManagement;
