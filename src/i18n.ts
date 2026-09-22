import { LANG_KEY } from '@/utils/storageKeys';

export type Lang = 'vi' | 'en';

export const LANGS: Lang[] = ['vi', 'en'];

const en = {
  tagline: 'Type the falling word to shoot it down — your own vocabulary, your own pace.',
  note: 'Switch your keyboard off Vietnamese input before playing. You can raise or lower the speed while playing.',
  player: 'Player',
  totalScore: 'Total score',
  wordsShot: 'Words shot',
  yourName: 'Your name',
  continue: 'Continue',
  wordSets: 'Word sets',
  noSets: 'No sets yet — import a word list to start playing.',
  play: '▶ Play',
  rename: 'Rename',
  delete: 'Delete',
  newName: 'New name',
  deleteConfirm: 'Delete "{0}"?',
  words: '{0} words',
  best: '★ {0}',
  importTitle: 'Import word list',
  importSub: '.csv or .xlsx — word, meaning',
  importHint:
    'Choose a .csv or .xlsx file with two columns: word, then meaning. No header row needed — every row is read as one word.',
  reading: 'Reading file...',
  readError: 'Could not read this file. Make sure it is a valid .csv or .xlsx file.',
  noRows: 'No word/meaning rows found in this file.',
  wordsFound: '{0} words found in {1}',
  saveSet: 'Save set',
  back: '← Back',
  settings: 'Settings',
  background: 'Background',
  voice: 'Voice',
  deviceVoice: 'Device default',
  language: 'Language',
  quit: 'Quit',
  slower: 'Slower',
  faster: 'Faster',
  pause: 'Pause',
  resume: 'Resume',
  paused: 'Paused',
  resumeBtn: '▶ Resume',
  emptySet: 'This set has no words. Import a word list first.',
  gameOver: 'Game over',
  score: 'Score: {0}',
  bestFor: 'Best for "{0}": {1}',
  roundWords: 'Words shot this round',
  playerTotal: '{0} — total score',
  totalWordsShot: 'Total words shot',
  playAgain: 'Play again',
  anotherSet: 'Choose another set',
  menu: 'Menu',
  speedHint: 'Points scale with speed (×{0})',
};

type Key = keyof typeof en;

const vi: Record<Key, string> = {
  tagline: 'Gõ đúng từ đang rơi để bắn hạ nó — bộ từ của bạn, tốc độ của bạn.',
  note: 'Nhớ tắt bộ gõ tiếng Việt trước khi chơi. Bạn có thể tăng/giảm tốc độ ngay trong lúc chơi.',
  player: 'Người chơi',
  totalScore: 'Tổng điểm',
  wordsShot: 'Từ đã bắn',
  yourName: 'Tên của bạn',
  continue: 'Chơi tiếp',
  wordSets: 'Bộ từ',
  noSets: 'Chưa có bộ từ nào — nhập danh sách từ để bắt đầu chơi.',
  play: '▶ Chơi',
  rename: 'Đổi tên',
  delete: 'Xoá',
  newName: 'Tên mới',
  deleteConfirm: 'Xoá "{0}"?',
  words: '{0} từ',
  best: '★ {0}',
  importTitle: 'Nhập danh sách từ',
  importSub: '.csv hoặc .xlsx — từ, nghĩa',
  importHint:
    'Chọn tệp .csv hoặc .xlsx có 2 cột: từ, rồi nghĩa. Không cần dòng tiêu đề — mỗi dòng được đọc là một từ.',
  reading: 'Đang đọc tệp...',
  readError: 'Không đọc được tệp này. Hãy kiểm tra lại tệp .csv hoặc .xlsx.',
  noRows: 'Không tìm thấy dòng từ/nghĩa nào trong tệp này.',
  wordsFound: 'Tìm thấy {0} từ trong {1}',
  saveSet: 'Lưu bộ từ',
  back: '← Quay lại',
  settings: 'Cài đặt',
  background: 'Hình nền',
  voice: 'Giọng đọc',
  deviceVoice: 'Mặc định của máy',
  language: 'Ngôn ngữ',
  quit: 'Thoát',
  slower: 'Chậm lại',
  faster: 'Nhanh lên',
  pause: 'Tạm dừng',
  resume: 'Tiếp tục',
  paused: 'Đã tạm dừng',
  resumeBtn: '▶ Tiếp tục',
  emptySet: 'Bộ từ này chưa có từ nào. Hãy nhập danh sách từ trước.',
  gameOver: 'Kết thúc',
  score: 'Điểm: {0}',
  bestFor: 'Kỷ lục của "{0}": {1}',
  roundWords: 'Số từ bắn được ván này',
  playerTotal: '{0} — tổng điểm',
  totalWordsShot: 'Tổng số từ đã bắn',
  playAgain: 'Chơi lại',
  anotherSet: 'Chọn bộ từ khác',
  menu: 'Trang chủ',
  speedHint: 'Điểm tăng giảm theo tốc độ (×{0})',
};

const strings: Record<Lang, Record<Key, string>> = { en, vi };

export function getLang(): Lang {
  if (typeof localStorage === 'undefined') return 'vi';
  const raw = localStorage.getItem(LANG_KEY);
  return raw === 'en' || raw === 'vi' ? raw : 'vi';
}

export function setLang(lang: Lang): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

export function t(key: Key, ...params: (string | number)[]): string {
  const template = strings[getLang()][key];
  return params.reduce<string>((text, value, i) => text.split(`{${i}}`).join(String(value)), template);
}
