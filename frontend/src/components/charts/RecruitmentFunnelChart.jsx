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

export default function RecruitmentFunnelChart({ funnelData, isLoading = false, error = null, onRetry }) {
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
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5" style={{ minHeight: "240px" }}>
        <Spinner animation="border" variant="success" size="sm" className="mb-2" />
        <span className="small">Đang tải số liệu phễu tuyển dụng...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5 text-center" style={{ minHeight: "240px" }}>
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

  const labels = funnelData?.labels || ["Ứng tuyển", "Sàng lọc", "Bài test", "Phỏng vấn", "Nhận Offer"];
  const counts = Array.isArray(funnelData?.counts) ? funnelData.counts : [0, 0, 0, 0, 0];
  const hasData = counts.some((c) => c > 0);

  if (!hasData) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5 border border-dashed rounded bg-surface-2" style={{ minHeight: "240px" }}>
        <i className="bi bi-funnel fs-2 mb-2 text-secondary opacity-50" />
        <span className="small fw-medium">Chưa có ứng viên trong phễu tuyển dụng</span>
        <span className="small text-muted" style={{ fontSize: "12px" }}>Số liệu sẽ tự động xuất hiện khi có ứng viên nộp hồ sơ</span>
      </div>
    );
  }

  const data = {
    labels: labels,
    datasets: [
      {
        axis: 'y',
        label: 'Ứng viên tại các vòng',
        data: counts,
        fill: false,
        backgroundColor: [
          'rgba(45, 134, 83, 0.9)',
          'rgba(45, 134, 83, 0.75)',
          'rgba(45, 134, 83, 0.6)',
          'rgba(45, 134, 83, 0.45)',
          'rgba(45, 134, 83, 0.3)'
        ],
        borderRadius: 6
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw} ứng viên`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        ticks: { color: textColor, font: { weight: '500' } },
        grid: { display: false }
      }
    }
  };

  return (
    <div style={{ height: "240px", width: "100%" }}>
      <Bar data={data} options={options} />
    </div>
  );
}
