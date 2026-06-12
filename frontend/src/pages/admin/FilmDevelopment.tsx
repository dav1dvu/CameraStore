import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { 
  Film, Plus, Trash2, Edit2, Save, X, Loader2, Calendar
} from 'lucide-react';

interface FilmDevRecord {
  id: number;
  ngay_trang: string; // YYYY-MM-DD
  ten_khach: string | null;
  sdt_khach: string | null;
  cuon_film: string;
  lab: string | null;
  ngay_tra: string | null; // YYYY-MM-DD
  created_at: string;
}

export const FilmDevelopment: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FilmDevRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ngayTrang: new Date().toISOString().substring(0, 10),
    tenKhach: '',
    sdtKhach: '',
    cuonFilm: '',
    lab: '',
    ngayTra: ''
  });

  // Inline Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    ngay_trang: '',
    ten_khach: '',
    sdt_khach: '',
    cuon_film: '',
    lab: '',
    ngay_tra: ''
  });

  // Confirm Delete Dialog State
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/reports/film-developments');
      if (res.data.success) {
        setRecords(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách tráng film', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ngayTrang || !formData.cuonFilm) {
      addToast('Vui lòng nhập Ngày tráng và Cuộn film', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.post('/reports/film-developments', {
        ngayTrang: formData.ngayTrang,
        tenKhach: formData.tenKhach.trim() || null,
        sdtKhach: formData.sdtKhach.trim() || null,
        cuonFilm: formData.cuonFilm.trim(),
        lab: formData.lab.trim() || null,
        ngayTra: formData.ngayTra || null
      });

      if (res.data.success) {
        addToast('Ghi nhận dòng tráng film mới thành công', 'success');
        setIsModalOpen(false);
        setFormData({
          ngayTrang: new Date().toISOString().substring(0, 10),
          tenKhach: '',
          sdtKhach: '',
          cuonFilm: '',
          lab: '',
          ngayTra: ''
        });
        fetchRecords();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi ghi nhận tráng film', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (record: FilmDevRecord) => {
    setEditingId(record.id);
    setEditFormData({
      ngay_trang: record.ngay_trang ? record.ngay_trang.substring(0, 10) : '',
      ten_khach: record.ten_khach || '',
      sdt_khach: record.sdt_khach || '',
      cuon_film: record.cuon_film || '',
      lab: record.lab || '',
      ngay_tra: record.ngay_tra ? record.ngay_tra.substring(0, 10) : ''
    });
  };

  const handleInlineSave = async (id: number) => {
    if (!editFormData.ngay_trang || !editFormData.cuon_film) {
      addToast('Ngày tráng và Cuộn film không được để trống', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.put(`/reports/film-developments/${id}`, {
        ngayTrang: editFormData.ngay_trang,
        tenKhach: editFormData.ten_khach.trim() || null,
        sdtKhach: editFormData.sdt_khach.trim() || null,
        cuonFilm: editFormData.cuon_film.trim(),
        lab: editFormData.lab.trim() || null,
        ngayTra: editFormData.ngay_tra || null
      });

      if (res.data.success) {
        addToast('Cập nhật thông tin thành công', 'success');
        setEditingId(null);
        fetchRecords();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const res = await axiosClient.delete(`/reports/film-developments/${id}`);
      if (res.data.success) {
        addToast('Xóa bản ghi tráng film thành công', 'success');
        setConfirmDeleteId(null);
        fetchRecords();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa bản ghi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const query = searchQuery.toLowerCase();
    const ten = (r.ten_khach || '').toLowerCase();
    const sdt = (r.sdt_khach || '').toLowerCase();
    const cuon = (r.cuon_film || '').toLowerCase();
    const lab = (r.lab || '').toLowerCase();
    return ten.includes(query) || sdt.includes(query) || cuon.includes(query) || lab.includes(query);
  });

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <Film className="text-vintage-gold" /> Tráng film
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Quản lý và ghi nhận thông tin tráng film từ khách hàng và các LAB liên kết.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus size={16} /> Thêm dòng tráng film
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 flex flex-col md:flex-row md:items-center gap-4 text-xs font-bold justify-between">
        <div className="flex items-center gap-4">
          <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Tìm kiếm nhanh:</span>
          <input
            type="text"
            placeholder="Tên khách, SĐT, Cuộn film, Lab..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold w-64 text-warm-gray-950"
          />
        </div>
        <div className="text-[10px] text-warm-gray-600 font-mono">
          Tổng số bản ghi: {filteredRecords.length}
        </div>
      </div>

      {/* Table Content */}
      {loading && records.length === 0 ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : filteredRecords.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy bản ghi tráng film nào.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse min-w-full [&_td]:!p-3 [&_th]:!p-3">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-3 w-36">Ngày tráng</th>
                <th className="p-3">Tên khách</th>
                <th className="p-3 w-40">SĐT khách</th>
                <th className="p-3">Cuộn film</th>
                <th className="p-3">Lab</th>
                <th className="p-3 w-36">Ngày trả</th>
                <th className="p-3 text-center w-28">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {filteredRecords.map(item => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-vintage-sepia-50/50">
                    {/* Ngày tráng */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData.ngay_trang}
                          onChange={e => setEditFormData({ ...editFormData, ngay_trang: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs text-warm-gray-900 font-semibold"
                        />
                      ) : (
                        item.ngay_trang ? item.ngay_trang.substring(0, 10) : '-'
                      )}
                    </td>

                    {/* Tên khách */}
                    <td className="p-3 font-bold text-vintage-sepia-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.ten_khach}
                          onChange={e => setEditFormData({ ...editFormData, ten_khach: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-bold text-warm-gray-900"
                          placeholder="Tên khách"
                        />
                      ) : (
                        item.ten_khach || <span className="text-warm-gray-400 italic">Trống</span>
                      )}
                    </td>

                    {/* SĐT khách */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.sdt_khach}
                          onChange={e => setEditFormData({ ...editFormData, sdt_khach: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs text-warm-gray-900 font-semibold font-mono"
                          placeholder="Số điện thoại"
                        />
                      ) : (
                        item.sdt_khach || <span className="text-warm-gray-400 italic">Trống</span>
                      )}
                    </td>

                    {/* Cuộn film */}
                    <td className="p-3 text-warm-gray-800 font-semibold">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.cuon_film}
                          onChange={e => setEditFormData({ ...editFormData, cuon_film: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs text-warm-gray-900 font-semibold"
                          placeholder="Tên cuộn film"
                        />
                      ) : (
                        item.cuon_film
                      )}
                    </td>

                    {/* Lab */}
                    <td className="p-3 text-warm-gray-700">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.lab}
                          onChange={e => setEditFormData({ ...editFormData, lab: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs text-warm-gray-900"
                          placeholder="Tên Lab"
                        />
                      ) : (
                        item.lab || <span className="text-warm-gray-400 italic">Trống</span>
                      )}
                    </td>

                    {/* Ngày trả */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData.ngay_tra}
                          onChange={e => setEditFormData({ ...editFormData, ngay_tra: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-vintage-sepia-200 bg-white text-xs text-warm-gray-900 font-semibold"
                        />
                      ) : (
                        item.ngay_tra ? item.ngay_tra.substring(0, 10) : <span className="text-warm-gray-400 italic">Chưa trả</span>
                      )}
                    </td>

                    {/* Hành động */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleInlineSave(item.id)}
                              disabled={loading}
                              title="Lưu bản ghi này"
                              className="p-1.5 rounded bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              title="Hủy bỏ"
                              className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(item)}
                              title="Chỉnh sửa bản ghi"
                              className="p-1.5 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Xóa bản ghi"
                              className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer"
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

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2">
                <Film size={18} className="text-vintage-gold" /> Ghi nhận dòng tráng film mới
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-vintage-sepia-200 transition-colors cursor-pointer text-warm-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ngày tráng *</label>
                  <input
                    type="date"
                    required
                    value={formData.ngayTrang}
                    onChange={e => setFormData({ ...formData, ngayTrang: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ngày trả (nếu có)</label>
                  <input
                    type="date"
                    value={formData.ngayTra}
                    onChange={e => setFormData({ ...formData, ngayTra: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Tên khách hàng</label>
                  <input
                    type="text"
                    placeholder="Tên khách"
                    value={formData.tenKhach}
                    onChange={e => setFormData({ ...formData, tenKhach: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">SĐT khách hàng</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={formData.sdtKhach}
                    onChange={e => setFormData({ ...formData, sdtKhach: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Tên cuộn film *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kodak ColorPlus 200, Fuji Superia..."
                  value={formData.cuonFilm}
                  onChange={e => setFormData({ ...formData, cuonFilm: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Tên Lab tráng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: LLab, Croplab..."
                  value={formData.lab}
                  onChange={e => setFormData({ ...formData, lab: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 font-semibold"
                />
              </div>

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3 font-bold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 hover:bg-vintage-gold hover:text-vintage-sepia-950 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Lưu bản ghi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-vintage-sepia-200 text-center space-y-4 text-xs font-semibold text-warm-gray-800">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Xác nhận xóa bản ghi</h3>
            <p className="text-sm text-warm-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi tráng film này? Hành động này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống.
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
export default FilmDevelopment;
