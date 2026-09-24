import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { candidateService } from '../../services/candidateService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Download,
  Eye,
} from 'lucide-react';

export const MyCV = () => {
  const { toast, triggerToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() =>
    candidateService.analyzeCV()
  );

  const handleScan = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = candidateService.analyzeCV();
      setAnalysisResult(result);
      setAnalyzing(false);
      triggerToast('Đã hoàn tất phân tích CV với MatchAI!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          MatchAI Scan & Tối ưu CV
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            AI Powered
          </span>
        </h1>
        <p className="text-xs text-slate-500">
          Hệ thống AI quét định dạng CV, đối soát từ khóa ATS và đưa ra gợi ý nâng cao tỷ lệ qua vòng hồ sơ.
        </p>
      </div>

      {/* Upload & Trigger Scan Box */}
      <Card className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Tải lên bản CV của bạn (PDF / DOCX)
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          MatchAI sẽ tự động trích xuất cấu trúc kinh nghiệm, kỹ năng và phân tích mức độ chuẩn hóa theo tiêu chuẩn thị trường.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="outline" size="sm" icon={FileText}>
            Chọn file từ máy
          </Button>
          <Button
            size="sm"
            onClick={handleScan}
            loading={analyzing}
            icon={Sparkles}
          >
            Quét và chấm điểm CV
          </Button>
        </div>
      </Card>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Score banner */}
          <Card className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-600/25">
                  {analysisResult.score}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Điểm chuẩn hóa ATS xuất sắc
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    CV của bạn có tỷ lệ vượt qua vòng lọc tự động đạt 94%.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={() => triggerToast('Đang tải xuống CV...', 'neutral')}
                >
                  Tải CV mẫu
                </Button>
              </div>
            </div>
          </Card>

          {/* Strengths & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Điểm mạnh được AI ghi nhận
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {analysisResult.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Khuyến nghị cải thiện
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {analysisResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Keyword density table */}
          <Card className="p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Mật độ từ khóa chuẩn ATS
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Từ khóa chuyên môn</th>
                    <th className="pb-2">Số lần xuất hiện</th>
                    <th className="pb-2">Mức độ liên quan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analysisResult.keywordDensity.map((item) => (
                    <tr key={item.keyword}>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {item.keyword}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        {item.count} lần
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {item.relevance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
