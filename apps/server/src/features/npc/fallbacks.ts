import type { Locale, NpcId, WorldState } from '@saigon/shared'

type Line = Record<Locale, string>
const OUTCOMES: Record<'offered' | 'completed' | 'incomplete', Line> = {
  offered: {
    en: 'Cảm ơn! Your errand is in the journal. Follow its steps, then come back to me.',
    vi: 'Cảm ơn nha! Việc đã ghi vào nhật ký rồi. Làm theo từng bước rồi quay lại gặp mình nhé.',
  },
  completed: {
    en: 'Cảm ơn! You finished the errand. Your thank-you is in your bag.',
    vi: 'Cảm ơn nhiều! Bạn làm xong việc rồi. Quà cảm ơn đã nằm trong túi của bạn.',
  },
  incomplete: {
    en: 'There is still something to do. Check the steps in your journal, then come back.',
    vi: 'Vẫn còn chút việc nữa. Xem các bước trong nhật ký rồi quay lại nhé.',
  },
}
const IDLE: Record<NpcId, Line> = {
  hoa: {
    en: 'Chào con! The market is busy. Ask me for an errand if you would like to help.',
    vi: 'Chào con! Chợ đang đông lắm. Muốn giúp cô thì hỏi cô việc nhé.',
  },
  tam: {
    en: 'Where do you want to go? The bus is 5 coins, xích lô 3, and walking is always free.',
    vi: 'Bạn muốn đi đâu? Xe buýt 5 xu, xích lô 3 xu, còn đi bộ thì luôn miễn phí.',
  },
  linh: {
    en: 'Chào bạn! There is always a neighbor who could use a little help.',
    vi: 'Chào bạn! Lúc nào cũng có một người hàng xóm cần giúp một tay.',
  },
  ba: {
    en: 'Sit a moment, cháu. The river has seen this city grow. The city can wait a few minutes.',
    vi: 'Ngồi xuống chút đi cháu. Dòng sông này đã thấy thành phố lớn lên. Thành phố đợi được vài phút mà.',
  },
  mai: {
    en: 'Chào bạn! Pull up a stool for cà phê sữa and bánh mì.',
    vi: 'Chào bạn! Kéo ghế ngồi uống ly cà phê sữa, ăn ổ bánh mì nha.',
  },
  alex: {
    en: 'The Opera House columns are lovely in this light. Have you seen the view from the river?',
    vi: 'Hàng cột Nhà hát đẹp quá dưới ánh nắng này. Bạn đã ngắm cảnh từ bờ sông chưa?',
  },
  vy: {
    en: 'The evening streets need a little color. Ask me how you can help.',
    vi: 'Phố tối cần thêm chút màu sắc. Hỏi mình xem bạn giúp được gì nhé.',
  },
  son: {
    en: 'I collect small city stories. There is always another view to find.',
    vi: 'Mình sưu tầm những câu chuyện nhỏ của thành phố. Lúc nào cũng còn một góc nhìn mới.',
  },
  thao: {
    en: 'I am practicing a melody that wants to travel. Come walk a little with the music.',
    vi: 'Mình đang tập một giai điệu muốn bay xa. Đi dạo cùng tiếng nhạc một chút nhé.',
  },
}

/** Deterministic lines describe only validated outcomes. */
export function fallbackLine(
  npcId: NpcId,
  _world: WorldState,
  outcome: 'offered' | 'completed' | 'incomplete' | null,
  locale: Locale = 'en'
): string {
  return (outcome ? OUTCOMES[outcome] : IDLE[npcId])[locale]
}
