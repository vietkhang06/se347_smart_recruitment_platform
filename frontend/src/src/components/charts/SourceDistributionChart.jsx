import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SourceDistributionChart({ sourcesData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const textColor = isDark ? '#94a3b8' : '#64748b';

  const data = {
    labels: sourcesData?.labels || ["MatchaJob", "LinkedIn", "Nội bộ giới thiệu", "Facebook", "Khác"],
    datasets: [
      {
        data: sourcesData?.data || [48, 26, 14, 8, 4],
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
