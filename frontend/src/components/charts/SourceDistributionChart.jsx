import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SourceDistributionChart({ sourcesData, isLoading = false, error = null, onRetry }) {
  const isDark = useTheme()?.theme === 'dark';

  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5" style={{ minHeight: "240px" }}>
        <Spinner animation="border" variant="success" size="sm" className="mb-2" />
        <span className="small">Đang tải phân bố nguồn ứng viên...</span>
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

  const rawData = Array.isArray(sourcesData?.data) ? sourcesData.data : [];
  const hasData = rawData.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-muted py-5 border border-dashed rounded bg-surface-2" style={{ minHeight: "240px" }}>
        <i className="bi bi-pie-chart fs-2 mb-2 text-secondary opacity-50" />
        <span className="small fw-medium">Chưa có dữ liệu nguồn kênh ứng viên</span>
        <span className="small text-muted" style={{ fontSize: "12px" }}>Thống kê nguồn sẽ hiển thị khi ứng viên nộp qua các kênh</span>
      </div>
    );
  }

  const data = {
    labels: sourcesData?.labels || ["MatchaJob", "LinkedIn", "Nội bộ giới thiệu", "Facebook", "Khác"],
    datasets: [
      {
        data: rawData,
        backgroundColor: [
          '#2d8653',
          '#0d9488',
          '#7c3aed',
          '#d97706',
          '#94a3b8'
        ],
        borderWidth: 2,
        borderColor: isDark ? '#151b23' : '#ffffff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 12 },
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}%`
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div style={{ height: "240px", width: "100%" }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
