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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function RecruitmentFunnelChart({ funnelData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const labels = funnelData?.labels || ["Ứng tuyển", "Sàng lọc", "Bài test", "Phỏng vấn", "Nhận Offer"];
  const counts = funnelData?.counts || [148, 86, 42, 18, 5];

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
