import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { formatVND } from '../../utils/currency';
import { 
  CreditCard, Plus, Trash2, Edit2, X, Loader2, DollarSign
} from 'lucide-react';

interface Expense {
  id: number;
  business_type: 'MUONMAYCHUT' | 'BANMAYFILM';
  expense_date: string;
  description: string;
  amount: number;
  paid_by: string;
  notes?: string;
  transaction_type: 'CHI' | 'THU';
  created_at: string;
}

interface Employee {
  id: number;
  full_name: string;
  staff_code: string;
}

interface ExpensesProps {
  businessType: 'MUONMAYCHUT' | 'BANMAYFILM';
}

export const Expenses: React.FC<ExpensesProps> = ({ businessType }) => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Date Picker
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [summary, setSummary] = useState<{ paidBy: string; totalAmount: number }[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    expenseDate: now.toISOString().substring(0, 10),
    description: '',
    amount: 0,
    paidBy: 'Doanh nghiệp',
    notes: '',
    transactionType: 'CHI' as 'CHI' | 'THU'
  });

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = ['2026', '2027', '2028'];

  const fetchEmployees = async () => {
    const endpoint = businessType === 'MUONMAYCHUT' ? '/employees' : '/sale-employees';
    try {
      const res = await axiosClient.get(endpoint);
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/expenses?type=${businessType}&month=${selectedMonth}&year=${selectedYear}`);
      if (res.data.success) {
        setExpenses(res.data.data || []);
      }
      
      const summaryRes = await axiosClient.get(`/expenses/summary?type=${businessType}&month=${selectedMonth}&year=${selectedYear}`);
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải chi phí', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchExpenses();
  }, [businessType, selectedMonth, selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.amount <= 0 || !formData.paidBy) {
      addToast('Vui lòng nhập đầy đủ thông tin bắt buộc', 'error');
      return;
    }

    try {
      const payload = {
        businessType,
        expenseDate: formData.expenseDate,
        description: formData.description,
        amount: Number(formData.amount),
        paidBy: formData.paidBy,
        notes: formData.notes,
        transactionType: formData.transactionType
      };

      if (editingExpense) {
        const res = await axiosClient.put(`/expenses/${editingExpense.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật phát sinh thành công', 'success');
          fetchExpenses();
        }
      } else {
        const res = await axiosClient.post('/expenses', payload);
        if (res.data.success) {
          addToast('Ghi nhận phát sinh thành công', 'success');
          fetchExpenses();
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu thông tin chi phí', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dòng phát sinh này?')) return;
    try {
      const res = await axiosClient.delete(`/expenses/${id}`);
      if (res.data.success) {
        addToast('Xóa phát sinh thành công', 'success');
        fetchExpenses();
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xóa chi phí', 'error');
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expenseDate: expense.expense_date.substring(0, 10),
      description: expense.description,
      amount: expense.amount,
      paidBy: expense.paid_by,
      notes: expense.notes || '',
      transactionType: expense.transaction_type || 'CHI'
    });
    setIsModalOpen(true);
  };

  const totalSum = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <CreditCard className="text-vintage-gold" /> Phát sinh
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Ghi nhận và đối soát các khoản phát sinh (thu/chi) hàng tháng.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              expenseDate: new Date().toISOString().substring(0, 10),
              description: '',
              amount: 0,
              paidBy: 'Doanh nghiệp',
              notes: '',
              transactionType: 'CHI'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus size={16} /> Thêm phát sinh
        </button>
      </div>

      {/* Month Picker Bar */}
      <div className="bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 flex items-center gap-4 text-xs font-bold">
        <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Lọc theo thời gian:</span>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
          >
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
          >
            {years.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : expenses.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không có khoản phát sinh nào trong tháng {selectedMonth}/{selectedYear}.</p>
      ) : (
        <div className="space-y-6">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-sm text-[13px] overflow-x-auto w-full">
            <table className="w-full min-w-[800px] text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider whitespace-nowrap">
                  <th className="p-4 w-32">Ngày phát sinh</th>
                  <th className="p-4 w-20">Loại</th>
                  <th className="p-4">Nội dung</th>
                  <th className="p-4 w-36 text-right">Số tiền</th>
                  <th className="p-4 w-44">Người thu/chi</th>
                  <th className="p-4">Ghi chú</th>
                  <th className="p-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200 font-medium">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4 font-mono whitespace-nowrap">{e.expense_date.substring(0, 10)}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        e.transaction_type === 'THU' ? 'bg-muted-green-150 text-muted-green-800' : 'bg-film-red/10 text-film-red'
                      }`}>
                        {e.transaction_type || 'CHI'}
                      </span>
                    </td>
                    <td className="p-4 text-vintage-sepia-900 font-semibold">{e.description}</td>
                    <td className={`p-4 text-right font-mono font-bold whitespace-nowrap ${
                      e.transaction_type === 'THU' ? 'text-muted-green-600' : 'text-film-red'
                    }`}>
                      {e.transaction_type === 'THU' ? '+' : '-'}{formatVND(e.amount)}
                    </td>
                    <td className="p-4 text-warm-gray-800 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                        e.paid_by === 'Doanh nghiệp' ? 'bg-vintage-gold/15 text-vintage-gold' : 'bg-warm-gray-200 text-warm-gray-800'
                      }`}>
                        {e.paid_by}
                      </span>
                    </td>
                    <td className="p-4 text-warm-gray-600 truncate max-w-xs">{e.notes || '-'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(e)}
                          className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>

          {/* Breakdown summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-vintage-sepia-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 border-b border-vintage-sepia-150 pb-2">
                Tổng phát sinh theo từng người
              </h3>
              {summary.length === 0 ? (
                <p className="text-xs text-warm-gray-500 italic py-2">Không ghi nhận phát sinh nào trong tháng.</p>
              ) : (
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-sepia-200 text-warm-gray-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2">Người thu/chi</th>
                      <th className="py-2 text-right">Tổng phát sinh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-sepia-100">
                    {summary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-vintage-sepia-50/50">
                        <td className="py-2 font-bold text-vintage-sepia-950">{item.paidBy}</td>
                        <td className={`py-2 text-right font-mono font-bold ${
                          item.totalAmount < 0 ? 'text-muted-green-600' : 'text-film-red'
                        }`}>
                          {item.totalAmount < 0 ? `+${formatVND(Math.abs(item.totalAmount))}` : `-${formatVND(item.totalAmount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingExpense ? 'Chỉnh sửa phát sinh' : 'Ghi nhận phát sinh'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              
              {/* Loại giao dịch */}
              <div className="mb-4">
                <label className="block font-bold text-warm-gray-700 mb-2">Loại phát sinh *</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border flex-1 cursor-pointer transition-colors ${
                    formData.transactionType === 'CHI' 
                      ? 'border-film-red bg-film-red/5' 
                      : 'border-vintage-sepia-200 hover:bg-vintage-sepia-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="transactionType" 
                      value="CHI"
                      checked={formData.transactionType === 'CHI'}
                      onChange={() => setFormData({ ...formData, transactionType: 'CHI' })}
                      className="accent-film-red"
                    />
                    <span className="font-bold text-film-red">Chi tiền</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border flex-1 cursor-pointer transition-colors ${
                    formData.transactionType === 'THU' 
                      ? 'border-muted-green-600 bg-muted-green-150/30' 
                      : 'border-vintage-sepia-200 hover:bg-vintage-sepia-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="transactionType" 
                      value="THU"
                      checked={formData.transactionType === 'THU'}
                      onChange={() => setFormData({ ...formData, transactionType: 'THU' })}
                      className="accent-muted-green-600"
                    />
                    <span className="font-bold text-muted-green-600">Thu tiền</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ngày phát sinh *</label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số tiền (₫) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-bold text-warm-gray-900"
                    />
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Nội dung *</label>
                <input
                  type="text"
                  required
                  placeholder={formData.transactionType === 'CHI' ? "Ví dụ: Nhập cuộn film Kodak, Trả tiền điện nước..." : "Ví dụ: Tiền bồi thường, Thu nhập khác..."}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Người thu/chi *</label>
                <select
                  value={formData.paidBy}
                  onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                >
                  <option value="Doanh nghiệp">Doanh nghiệp (Doanh thu chung)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.full_name}>{emp.full_name} ({emp.staff_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
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
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 hover:bg-vintage-gold cursor-pointer"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
