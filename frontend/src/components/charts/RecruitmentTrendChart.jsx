import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function RecruitmentTrendChart({ weeklyData, isLoading = false, error = null, onRetry }) {
  let isDark = false;
  try {
    const themeContext = useTheme ? useTheme() : null;
    isDark = themeContext?.theme === 'dark';
  } catch {
    isDark = false;
  }

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5" style={{ minHeight: "260px" }}>
        <Spinner animation="border" variant="success" size="sm" className="mb-2" />
        <span className="small">Đang tải xu hướng tuyển dụng...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5 text-center" style={{ minHeight: "260px" }}>
        <i className="bi bi-exclamation-triangle text-warning fs-3 mb-2" />
        <span className="small text-danger mb-2">{error}</span>
        {onRetry && (
          <Button variant="outline-success" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  const applications = Array.isArray(weeklyData?.applications) ? weeklyData.applications : [0, 0, 0, 0, 0, 0, 0];
  const views = Array.isArray(weeklyData?.views) ? weeklyData.views : [0, 0, 0, 0, 0, 0, 0];
  const hasData = applications.some((v) => v > 0) || views.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5 border border-dashed rounded bg-surface-2" style={{ minHeight: "260px" }}>
        <i className="bi bi-bar-chart-line fs-2 mb-2 text-secondary opacity-50" />
        <span className="small fw-medium">Chưa có lượt nộp đơn hay xem tin 7 ngày qua</span>
        <span className="small text-muted" style={{ fontSize: "12px" }}>Biểu đồ sẽ hiển thị khi tin tuyển dụng bắt đầu tiếp cận ứng viên</span>
      </div>
    );
  }

  const data = {
    labels: weeklyData?.labels || ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"],
    datasets: [
      {
        label: 'Lượt nộp hồ sơ',
        data: applications,
        backgroundColor: isDark ? '#3fb978' : '#2d8653',
        borderRadius: 6,
      },
      {
        label: 'Lượt xem tin',
        data: views.map(v => Math.round(v / 3)),
        backgroundColor: isDark ? 'rgba(63, 185, 120, 0.25)' : 'rgba(45, 134, 83, 0.2)',
        borderRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 12, weight: '500' },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { family: 'Inter' } },
        grid: { display: false }
      },
      y: {
        ticks: { color: textColor, font: { family: 'Inter' } },
        grid: { color: gridColor },
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ height: "260px", width: "100%" }}>
      <Bar data={data} options={options} />
    </div>
  );
}
