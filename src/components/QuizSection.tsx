import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Award } from 'lucide-react';
import { QuizQuestion } from '../types';

interface QuizSectionProps {
  quiz: QuizQuestion[];
}

export const QuizSection: React.FC<QuizSectionProps> = ({ quiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: oIdx,
    }));
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const score = Object.entries(selectedAnswers).reduce((acc, [qIdx, oIdx]) => {
    return oIdx === quiz[Number(qIdx)]?.correctIndex ? acc + 1 : acc;
  }, 0);

  const allAnswered = Object.keys(selectedAnswers).length === quiz.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Dialogue Comprehension Check (閱讀理解測驗)
          </h3>
          <p className="text-sm text-slate-500">
            Check your understanding of genres, habits, and reading experiences.
          </p>
        </div>

        {submitted && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl">
            <Award className="w-5 h-5 text-indigo-600" />
            <div className="text-sm">
              <span className="font-bold text-indigo-900">Score: {score} / {quiz.length}</span>
              <span className="text-xs text-indigo-600 ml-1">
                ({Math.round((score / quiz.length) * 100)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {quiz.map((item, qIdx) => {
          const selectedOption = selectedAnswers[qIdx];
          const isCorrect = selectedOption === item.correctIndex;

          return (
            <div
              key={qIdx}
              className={`p-6 rounded-3xl bg-white border transition-all ${
                submitted
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-red-300 bg-red-50/20'
                  : 'border-slate-200/80 shadow-sm'
              }`}
            >
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {qIdx + 1}
                </span>
                <span>{item.question}</span>
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                {item.options.map((option, oIdx) => {
                  let optionStyle = 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700';

                  if (selectedOption === oIdx) {
                    optionStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-1 ring-indigo-600/30';
                  }

                  if (submitted) {
                    if (oIdx === item.correctIndex) {
                      optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500/30';
                    } else if (selectedOption === oIdx) {
                      optionStyle = 'border-red-400 bg-red-50 text-red-950';
                    } else {
                      optionStyle = 'border-slate-200 bg-slate-50/30 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={submitted}
                      onClick={() => handleSelectOption(qIdx, oIdx)}
                      className={`p-3.5 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {submitted && oIdx === item.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      )}
                      {submitted && selectedOption === oIdx && oIdx !== item.correctIndex && (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <span className="font-semibold text-slate-800">Explanation (解析): </span>
                  {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {submitted ? (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again (重新測驗)</span>
          </button>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30"
          >
            <span>Check Answers (送出答案)</span>
          </button>
        )}
      </div>
    </div>
  );
};
