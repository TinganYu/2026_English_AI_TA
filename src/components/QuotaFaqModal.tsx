import React from 'react';
import { X, HelpCircle, CheckCircle2, ShieldCheck, Zap, Database, Share2, Mic } from 'lucide-react';

interface QuotaFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuotaFaqModal: React.FC<QuotaFaqModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">AI 用量、分享與麥克風完整說明</h3>
              <p className="text-xs text-slate-500">解答您的 4 個核心疑問，幫您省下每分預算</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          {/* Q1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              使用這個會不會很耗費 AI 用量？
            </h4>
            <div className="text-xs sm:text-sm text-slate-600 space-y-1.5 pl-8">
              <p>
                <strong>答案：不會！消耗量極小。</strong>
              </p>
              <p>
                本劇本為 A2 初級英語，每句僅約 10~15 個單字。產生整段 8 句對話的語音，音訊輸出 Token 總計僅約 1,000~1,500 Tokens，在 Gemini API 費用標準中只相當於不到 <strong>0.001 美元</strong>，且完全在免費額度（Free Tier）充裕範圍內。
              </p>
            </div>
          </div>

          {/* Q4 */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
            <h4 className="font-bold text-emerald-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              每次點 Play Line 讀單句都會消耗用量嗎？（已優化！）
            </h4>
            <div className="text-xs sm:text-sm text-emerald-900 space-y-1.5 pl-8">
              <p>
                <strong>現在已經不會重複消耗！</strong>
              </p>
              <p>
                我們已為您加入了 <strong>IndexedDB 本機永久快取機制</strong>：
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  任何一句台詞只要點擊播放過一次，WAV 音訊就會被<strong>永久存入瀏覽器快取</strong>。
                </li>
                <li>
                  第二次、第一百次重複點擊播放時，會直接從本地讀取音訊，<strong>消耗 0 AI 用量、0 Token，且無延遲秒播！</strong>
                </li>
                <li>
                  您也可以在上方點擊<strong>「一鍵預載全篇」</strong>，系統一次性快取完全部 8 句，之後學生無論反覆聽多少次都不會再花費任何用量。
                </li>
                <li>
                  若想完全 100% 避免使用任何 API，還可以隨時切換為<strong>「免用量瀏覽器語音」</strong>！
                </li>
              </ul>
            </div>
          </div>

          {/* Q2 */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
            <h4 className="font-bold text-indigo-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              我可以寫好後分享給其他人嗎？他們也會耗費用量嗎？
            </h4>
            <div className="text-xs sm:text-sm text-indigo-900 space-y-1.5 pl-8">
              <p>
                <strong>可以分享！關於用量的運作方式如下：</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  透過右上角或 AI Studio 的 <strong>Shared App URL</strong> 分享給學生或同事時，後端會使用您專案綁定的 API Key。
                </li>
                <li>
                  如果學生點擊已快取的句子，或開啟<strong>「免用量瀏覽器語音」</strong>，就不會消耗您的 API 額度。
                </li>
                <li>
                  如果全班 30 位學生每人點聽一次全新的未快取句子，總消耗也僅約幾美分或佔免費額度極小部分，完全不必擔心爆量。
                </li>
              </ul>
            </div>
          </div>

          {/* Q3 */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <h4 className="font-bold text-amber-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              麥克風權限與無法使用問題（已修復與提供備案）
            </h4>
            <div className="text-xs sm:text-sm text-amber-900 space-y-1.5 pl-8">
              <p>
                <strong>原因與解決方案：</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  <strong>iFrame 權限問題已修復</strong>：我們已在 <code>metadata.json</code> 的 <code>requestFramePermissions</code> 中加入 <code>"microphone"</code>，使內嵌預覽視窗具備麥克風收音授權。
                </li>
                <li>
                  <strong>最穩定的開啟方式</strong>：如果特定瀏覽器（如 Chrome/Safari）仍擋預覽窗，請點擊上方<strong>「在新分頁中開啟（Shared App URL）」</strong>，獨立分頁下麥克風 100% 穩定支援。
                </li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-md"
        >
          我了解了，返回練習 (Close)
        </button>
      </div>
    </div>
  );
};
