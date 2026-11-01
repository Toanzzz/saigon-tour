import {
  isRevealed,
  type Locale,
  type NeighborId,
  type NpcId,
  type Quest,
  RESIDENT_TEXT,
  stepText,
  type WorldState,
} from '@saigon/shared'

type Line = Record<Locale, string>
const OUTCOMES: Record<
  'offered' | 'completed' | 'incomplete' | 'failed',
  Line
> = {
  failed: {
    en: 'All right. That errand is closed; I hoped you could help.',
    vi: 'Ừ, việc đó kết thúc rồi. Mình đã mong bạn giúp được.',
  },
  offered: {
    en: 'Thank you! Your errand is in the journal. Follow its steps, then come back to me.',
    vi: 'Cảm ơn nha! Việc đã ghi vào nhật ký rồi. Làm theo từng bước rồi quay lại gặp mình nhé.',
  },
  completed: {
    en: 'Thank you! You finished the errand. Your thank-you is in your bag.',
    vi: 'Cảm ơn nhiều! Bạn làm xong việc rồi. Quà cảm ơn đã nằm trong túi của bạn.',
  },
  incomplete: {
    en: 'There is still something to do. Check the steps in your journal, then come back.',
    vi: 'Vẫn còn chút việc nữa. Xem các bước trong nhật ký rồi quay lại nhé.',
  },
}
const IDLE: Record<NeighborId, Line> = {
  hoa: {
    en: 'Hello, con. The market is a three-bowl kind of busy today. Ask me for an errand if you want to help.',
    vi: 'Chào con. Chợ hôm nay bận cỡ ba tô lận. Muốn giúp cô thì hỏi cô việc nhé.',
  },
  tam: {
    en: 'Where to? I know a shortcut. It is only two songs long, I promise. Bus 5, xích lô 3, walking free.',
    vi: 'Đi đâu đây? Anh biết đường tắt. Chỉ dài hai bài hát thôi, anh hứa. Xe buýt 5, xích lô 3, đi bộ miễn phí.',
  },
  linh: {
    en: 'Hello! I have an opening for a Deputy Herb Logistics Officer. No experience required, badge pending.',
    vi: 'Chào bạn! Chị đang cần một Phó phòng Hậu cần Rau thơm. Không cần kinh nghiệm, huy hiệu sẽ có sau.',
  },
  ba: {
    en: 'Sit a moment. This reminds me of a fish I once lost, which taught me patience. Or was the fish patient?',
    vi: 'Ngồi chút đi cháu. Chuyện này làm ông nhớ con cá ông từng vuột mất, dạy ông kiên nhẫn. Hay con cá mới kiên nhẫn ta?',
  },
  mai: {
    en: 'Pull up a stool. Today the cà phê has notes of caramel, warm asphalt, and quiet ambition.',
    vi: 'Kéo ghế ngồi đi. Hôm nay ly cà phê có hương caramel, nhựa đường ấm, và chút hoài bão lặng lẽ.',
  },
  alex: {
    en: 'Hold on, do not move, there is a pigeon lining up a perfect photobomb. There. Authentic.',
    vi: 'Khoan, đừng nhúc nhích, có con bồ câu đang canh một cú phá ảnh hoàn hảo. Đó. Chân thật ghê.',
  },
  vy: {
    en: "The evening streets need color. This lantern is called Phở Moon; it survived last year's drizzle.",
    vi: 'Phố tối cần thêm màu sắc. Chiếc đèn này tên Trăng Phở; nó sống sót qua cơn mưa phùn năm ngoái.',
  },
  son: {
    en: 'I am mid-postcard. "Dear River, you looked tired today. Rest up." It never writes back, but still.',
    vi: 'Mình đang viết dở tấm bưu thiếp. "Gửi Dòng Sông, hôm nay trông mệt quá. Nghỉ ngơi nhé." Nó chẳng hồi âm, mà kệ.',
  },
  thao: {
    en: 'Shh, walk softly, I am turning your footsteps into a little ballad. The chorus is almost there.',
    vi: 'Suỵt, đi nhẹ thôi, mình đang biến bước chân bạn thành một khúc ballad nhỏ. Điệp khúc sắp xong rồi.',
  },
}

/** The next incomplete step of the player's most relevant active quest. */
function pendingStep(quests: Quest[] | undefined, npcId: NpcId, now: number) {
  if (!quests?.length) return null
  // Prefer a quest this NPC gave, else any active quest with work left.
  const ordered = [
    ...quests.filter((quest) => quest.giverNpcId === npcId),
    ...quests.filter((quest) => quest.giverNpcId !== npcId),
  ].filter((quest) => quest.status === 'active' || quest.status === 'ready')
  for (const quest of ordered) {
    const index = quest.progress.findIndex((done) => !done)
    const step = index >= 0 ? quest.steps[index] : undefined
    if (!step) continue
    // Never name the answer to a riddle that the city has not revealed yet.
    if (index === 0 && quest.riddle && !isRevealed(quest, now)) continue
    return step
  }
  return null
}

/** Concrete "still to do" line naming the next step and its place. */
function incompleteLine(
  quests: Quest[] | undefined,
  npcId: NpcId,
  locale: Locale,
  now: number
): string {
  const step = pendingStep(quests, npcId, now)
  if (!step) return OUTCOMES.incomplete[locale]
  return locale === 'vi'
    ? `Vẫn còn chút việc: ${stepText(step, 'vi')}, rồi quay lại nhé.`
    : `There is still something to do: ${stepText(step, 'en')}, then come back.`
}

/** Deterministic lines describe only validated outcomes. */
export function fallbackLine(
  npcId: NpcId,
  _world: WorldState,
  outcome: 'offered' | 'completed' | 'incomplete' | 'failed' | null,
  locale: Locale = 'en',
  level = 0,
  quests?: Quest[],
  now: number = Date.now()
): string {
  if (!outcome && level <= -3)
    return locale === 'vi'
      ? 'Chào bạn. Hôm nay tôi chưa muốn nhờ việc gì.'
      : 'Hello. I am not ready to ask any favors today.'
  if (outcome === 'incomplete')
    return incompleteLine(quests, npcId, locale, now)
  if (outcome) return OUTCOMES[outcome][locale]
  const neighbor = IDLE[npcId as NeighborId]
  if (neighbor) return neighbor[locale]
  // Residents have no IDLE voice here; use their own idle line, not the
  // generic "still something to do" outcome.
  const resident = RESIDENT_TEXT[npcId as Exclude<NpcId, NeighborId>]
  const idle = resident?.[locale]?.idleLine
  return idle || OUTCOMES.incomplete[locale]
}
