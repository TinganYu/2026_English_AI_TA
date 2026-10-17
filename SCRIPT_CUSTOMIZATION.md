# 劇本內容維護指南

這份文件說明如何更換對話劇本、Vocabulary、Quiz，以及 STT 的文字正規化規則。

## 快速對照

| 想修改的內容 | 主要檔案 |
| --- | --- |
| 劇本標題、簡介與角色 | [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) |
| 英文台詞與中文翻譯 | [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) 的 `lines` |
| Vocabulary | [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) 的 `vocabulary` |
| Quiz | [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) 的 `quiz` |
| STT 縮寫、數字與替代字 | [`src/components/RoleplayPractice.tsx`](./src/components/RoleplayPractice.tsx) 的 `normalizeToken` |
| 資料格式定義 | [`src/types.ts`](./src/types.ts) |
| Gemini 劇本產生器 | [`src/components/DialogueGeneratorModal.tsx`](./src/components/DialogueGeneratorModal.tsx) |
| Gemini API 後端路由 | [`server.ts`](./server.ts) |

## 更換固定劇本

固定載入的劇本是 [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) 裡的 `defaultScript`：

```ts
export const defaultScript: DialogueScript = {
  id: 'books-reading-habits-a2',
  title: 'Paper Pages or Digital Screens?',
  subtitle: 'A2 English Dialogue on Book Genres & Reading Habits',
  summary: '...',
  level: 'CEFR A2',
  characters: { ... },
  lines: [ ... ],
  vocabulary: [ ... ],
  quiz: [ ... ],
};
```

### 劇本基本資料

可以修改：

- `id`：劇本的識別名稱，建議使用小寫英文和連字號。
- `title`：劇本標題。
- `subtitle`：副標題。
- `summary`：劇本簡介。
- `level`：程度，例如 `CEFR A2`。

### 角色

目前角色選擇器使用 `Alex` 和 `Emma`。角色內容位於 `characters`：

```ts
characters: {
  Alex: {
    name: 'Alex',
    role: 'Physical Book Lover',
    voice: 'Puck',
    avatarColor: 'bg-amber-600',
    habitSummary: 'Loves mystery and paper books.',
  },
  Emma: {
    name: 'Emma',
    role: 'Digital Reader Fan',
    voice: 'Kore',
    avatarColor: 'bg-emerald-600',
    habitSummary: 'Loves science fiction and e-readers.',
  },
},
```

如果只更換角色的介紹、聲音、顏色或習慣，可以直接修改這裡。

如果要把 `Alex`、`Emma` 改成完全不同的角色名稱，還需要同步修改 [`src/components/RoleplayPractice.tsx`](./src/components/RoleplayPractice.tsx) 裡的角色型別、角色選擇器，以及 `selectedRole` 相關判斷。目前這些地方預設角色名稱就是 `Alex` 和 `Emma`。

可用的 `voice` 必須符合目前語音服務或瀏覽器語音設定支援的名稱。若不確定，先沿用現有的 `Puck` 和 `Kore`。

## 更換對話台詞

在 `lines` 陣列中，每一個物件代表一個回合：

```ts
{
  id: 'line-1',
  speaker: 'Alex',
  voice: 'Puck',
  avatar: '👨‍💼',
  text: 'I enjoy reading mystery novels.',
  chineseText: '我喜歡閱讀推理小說。',
  audioNotes: 'Speak slowly and clearly.',
  highlightWords: ['mystery novels'],
}
```

欄位用途：

| 欄位 | 用途 |
| --- | --- |
| `id` | 每句台詞的唯一識別值。 |
| `speaker` | 說話者，目前應使用 `Alex` 或 `Emma`。 |
| `voice` | 播放這句台詞時使用的聲音。 |
| `avatar` | 畫面上的角色 emoji。 |
| `text` | 英文台詞，也是 STT 比對的目標文字。 |
| `chineseText` | 中文翻譯。 |
| `audioNotes` | 語氣、速度或發音提示。 |
| `highlightWords` | 想在畫面上特別標示的單字或片語。 |

### `text` 和 STT 的關係

STT 會把學生辨識出的文字和 `text` 逐字比較。因此新台詞的英文拼字、縮寫和數字寫法會影響練習分數與單字標色。

目前已經正規化的例子：

```text
fifty = 50
twenty = 20
I'm = I am
can't = cannot
```

目前的流程是「五秒後可以進入下一句」，所以 STT 沒有結果時不會阻擋進度；STT 分數只作為練習回饋。

## 更換 Vocabulary

在 `vocabulary` 陣列中加入或修改項目：

```ts
{
  word: 'Genre',
  phonetic: '/ˈʒɑːn.rə/',
  partOfSpeech: 'noun (名詞)',
  definition: 'A particular type of writing, music, or art.',
  chineseMeaning: '類型、體裁',
  exampleSentence: 'What book genre do you enjoy?',
}
```

需要提供：

- `word`：單字或片語。
- `phonetic`：音標。
- `partOfSpeech`：詞性。
- `definition`：英文解釋。
- `chineseMeaning`：中文意思。
- `exampleSentence`：英文例句。

資料格式定義在 [`src/types.ts`](./src/types.ts) 的 `VocabularyItem`。

## 更換 Quiz

在 `quiz` 陣列中加入問題：

```ts
{
  question: 'Which genre does Emma enjoy?',
  options: [
    'Mystery',
    'Science fiction',
    'Biography',
    'Poetry',
  ],
  correctIndex: 1,
  explanation: 'Emma enjoys science fiction.',
}
```

`correctIndex` 從 `0` 開始：

- `0`：第一個選項
- `1`：第二個選項
- `2`：第三個選項
- `3`：第四個選項

資料格式定義在 [`src/types.ts`](./src/types.ts) 的 `QuizQuestion`。

## 修改 STT 替代字

STT 的單字正規化在 [`src/components/RoleplayPractice.tsx`](./src/components/RoleplayPractice.tsx) 的 `normalizeToken` 函式：

```ts
const numberWord = {
  twenty: '20',
  fifty: '50',
  eighty: '80',
};
```

這類規則適合處理單字和單字之間的等價關係，例如：

```text
fifty = 50
eighty = 80
```

縮寫規則則位於同一個函式：

```ts
const contraction = {
  "I'm": 'I am',
  "you're": 'you are',
  "can't": 'cannot',
};
```

實際程式會先轉成小寫，所以 key 應使用小寫形式，例如 `fifty`、`can't`。

### 新增規則時的注意事項

- `normalizeToken` 目前是逐字處理，不適合直接處理多字片語替代。
- 連字號和標點會先被移除，例如 `e-reader` 會接近 `ereader`。
- 不要把意思不同、但只是發音相近的單字全部視為相同，否則分數會過度寬鬆。
- 若只是換劇本，通常不需要修改這個函式；只有新劇本有明確的 STT 誤辨識情況時才需要增加規則。

## Dialogue Generator 是否需要 Gemini？

需要。[`src/components/DialogueGeneratorModal.tsx`](./src/components/DialogueGeneratorModal.tsx) 不會在瀏覽器中直接產生劇本，而是呼叫：

```ts
fetch('/api/generate-dialogue', {
  method: 'POST',
  ...
});
```

這個 API 路由由 [`server.ts`](./server.ts) 提供，並使用 Gemini API 產生：

- 劇本標題與簡介
- 對話台詞
- Vocabulary
- Quiz

伺服器會讀取環境變數：

```text
GEMINI_API_KEY
```

因此，如果沒有設定有效的 Gemini API key，按下 **Generate Dialogue** 通常會收到：

```text
GEMINI_API_KEY is not configured on the server.
```

或其他 Gemini API 錯誤。

### 本機使用 Gemini 劇本產生器

1. 複製 `.env.example` 成為 `.env.local` 或專案使用的環境檔。
2. 填入自己的 Gemini API key：

   ```text
   GEMINI_API_KEY="你的_GEMINI_API_KEY"
   ```

3. 使用 `npm run dev` 啟動包含 API 路由的本機伺服器。
4. 在瀏覽器開啟終端機顯示的網址。

不要把 API key 寫進前端程式，也不要提交到 Git。

### 沒有 Gemini 時仍可使用什麼？

即使沒有 Gemini API，固定劇本仍可正常使用，因為它直接從 [`src/data/defaultScript.ts`](./src/data/defaultScript.ts) 載入：

- 對話
- Vocabulary
- Quiz
- 已準備好的參考音檔
- 錄音與瀏覽器 STT 練習

沒有 Gemini 時，可以手動修改 `defaultScript.ts`，或先在其他地方準備符合 `DialogueScript` 格式的資料，再貼入檔案。只有「在介面中即時產生新劇本」這個功能需要 Gemini API。

另外，產生器目前把新劇本放在前端的 React state 中；重新整理頁面後，產生的劇本不會自動保存。若要永久保存，請把產生出的資料複製回 `defaultScript.ts`。

## 更換劇本後的檢查清單

- `lines` 的每個 `speaker` 都是 `Alex` 或 `Emma`。
- 每句 `text` 都有對應的 `chineseText`。
- `id` 沒有重複。
- `vocabulary` 每個項目都有完整欄位。
- `quiz` 的 `correctIndex` 沒有超出 `options` 範圍。
- 新台詞中的數字、縮寫或片語是否需要 STT 正規化。
- 執行 `npm run lint` 檢查 TypeScript。
- 執行 `npm run build` 確認正式建置成功。
