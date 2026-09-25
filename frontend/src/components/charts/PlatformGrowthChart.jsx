import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PlatformGrowthChart({ growthData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const labels = growthData?.labels || ["Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9"];

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Người dùng nền tảng',
        data: growthData?.users || [11200, 12800, 14100, 15900, 17100, 18240],
        borderColor: '#7c3aed',
        backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#7c3aed'
      },
      {
        fill: true,
        label: 'Tin tuyển dụng',
        data: growthData?.jobs ? growthData.jobs.map(j => j * 10) : [6400, 7800, 8900, 10200, 11500, 12840],
        borderColor: '#2d8653',
        backgroundColor: isDark ? 'rgba(45, 134, 83, 0.2)' : 'rgba(45, 134, 83, 0.1)',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#2d8653'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 12 },
          usePointStyle: true
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { display: false }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      }
    }
  };

  return (
    <div style={{ height: "260px", width: "100%" }}>
      <Line data={data} options={options} />
    </div>
  );
}
