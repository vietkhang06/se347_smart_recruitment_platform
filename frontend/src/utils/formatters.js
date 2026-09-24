export const formatCurrency = (amount) => {
  if (typeof amount === 'number') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
  return amount || 'Thỏa thuận';
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getStatusTone = (status) => {
  const text = String(status || '').toLowerCase();
  if (/đang|hoạt động|hiển thị|xác minh|xác nhận|thấp|online|đề nghị|thành công/.test(text)) {
    return 'success';
  }
  if (/chờ|mới|trung bình|sắp|bài kiểm tra|sàng lọc/.test(text)) {
    return 'warning';
  }
  if (/khóa|cao|nghiêm|từ chối|đóng|hủy/.test(text)) {
    return 'danger';
  }
  return 'neutral';
};

export const getMatchScoreColor = (score) => {
  if (score >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 80) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  if (score >= 70) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
};
