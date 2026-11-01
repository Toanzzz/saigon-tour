import type { NeighborId } from './entities'
import type { Locale } from './locale'

export const NEIGHBOR_TEXT: Record<
  NeighborId,
  Record<Locale, { role: string; knowledge: string[] }>
> = {
  hoa: {
    en: {
      role: 'Market food vendor',
      knowledge: [
        'Fresh herbs make a good bowl of pho.',
        'Linh is waiting in the park.',
      ],
    },
    vi: {
      role: 'Người bán món ăn ở chợ',
      knowledge: [
        'Rau thơm tươi làm tô phở ngon hơn.',
        'Chị Linh đang đợi ở công viên.',
      ],
    },
  },
  tam: {
    en: {
      role: 'Neighborhood driver',
      knowledge: [
        'The park bus costs 5 coins.',
        'The city is easy to explore on foot.',
      ],
    },
    vi: {
      role: 'Tài xế trong khu phố',
      knowledge: [
        'Xe buýt ra công viên giá 5 xu.',
        'Đi bộ khám phá thành phố rất dễ.',
      ],
    },
  },
  linh: {
    en: {
      role: 'Student and neighborhood volunteer',
      knowledge: [
        'Ms. Hoa sends fresh herbs for the community lunch.',
        'The cathedral is nearby.',
      ],
    },
    vi: {
      role: 'Sinh viên và tình nguyện viên khu phố',
      knowledge: [
        'Cô Hoa gửi rau thơm cho bữa trưa chung.',
        'Nhà thờ ở gần đây.',
      ],
    },
  },
  ba: {
    en: {
      role: 'Cyclo driver and storyteller',
      knowledge: [
        'The river is a lovely place to slow down.',
        'Ben Thanh is the heart of the neighborhood.',
      ],
    },
    vi: {
      role: 'Người đạp xích lô và kể chuyện',
      knowledge: [
        'Bờ sông là nơi dễ chịu để chậm lại.',
        'Bến Thành là trái tim của khu phố.',
      ],
    },
  },
  mai: {
    en: {
      role: 'Sidewalk café owner',
      knowledge: [
        'An iced milk coffee and a little shade make a lovely market break.',
        'Follow Le Loi to Nguyen Hue, or find the food alley beside the market.',
        'The Central Post Office is a lovely place to send a postcard.',
      ],
    },
    vi: {
      role: 'Chủ quán cà phê vỉa hè',
      knowledge: [
        'Một ly cà phê sữa và chút bóng mát là giờ nghỉ dễ chịu ở chợ.',
        'Đi theo Lê Lợi tới Nguyễn Huệ, hoặc ghé hẻm ẩm thực cạnh chợ.',
        'Bưu điện Trung tâm là nơi đẹp để gửi bưu thiếp.',
      ],
    },
  },
  alex: {
    en: {
      role: 'Visiting photographer',
      knowledge: [
        'The Opera House columns catch beautiful afternoon light.',
        'The cathedral and Central Post Office share a compact square.',
        'The riverfront viewpoint looks back toward the city skyline.',
      ],
    },
    vi: {
      role: 'Nhiếp ảnh gia đến thăm',
      knowledge: [
        'Hàng cột Nhà hát bắt nắng chiều rất đẹp.',
        'Nhà thờ và Bưu điện Trung tâm nằm quanh một quảng trường nhỏ.',
        'Điểm ngắm bên sông nhìn về đường chân trời thành phố.',
      ],
    },
  },
  vy: {
    en: {
      role: 'Lantern maker near City Hall',
      knowledge: [
        'The lanterns make Nguyen Hue glow after sunset.',
        'The food alley has a quiet corner where a missing lantern might turn up.',
        'The City Hall gardens are brightest when families gather for an evening walk.',
      ],
    },
    vi: {
      role: 'Người làm lồng đèn gần Tòa Thị Chính',
      knowledge: [
        'Lồng đèn làm phố Nguyễn Huệ sáng lên sau hoàng hôn.',
        'Hẻm ẩm thực có một góc yên tĩnh, có thể chiếc lồng đèn thất lạc ở đó.',
        'Vườn Tòa Thị Chính rực rỡ nhất khi các gia đình dạo tối.',
      ],
    },
  },
  son: {
    en: {
      role: 'Postcard collector',
      knowledge: [
        'The Central Post Office square is a perfect place to start a city story.',
        'A river view gives every postcard a little more sky.',
        'Old postcards connect the market, the landmarks, and the people between them.',
      ],
    },
    vi: {
      role: 'Người sưu tầm bưu thiếp',
      knowledge: [
        'Quảng trường Bưu điện Trung tâm là nơi hợp để bắt đầu một câu chuyện thành phố.',
        'Cảnh sông cho mỗi tấm bưu thiếp thêm chút bầu trời.',
        'Bưu thiếp cũ nối chợ, các công trình và những con người ở giữa.',
      ],
    },
  },
  thao: {
    en: {
      role: 'Opera House music student',
      knowledge: [
        'The Opera House steps are a lovely place to hear the city breathe.',
        'The cathedral square carries a clear echo between its facades.',
        'A short walk can turn a melody into a memory.',
      ],
    },
    vi: {
      role: 'Sinh viên âm nhạc ở Nhà hát',
      knowledge: [
        'Bậc thềm Nhà hát là nơi đẹp để nghe thành phố thở.',
        'Quảng trường nhà thờ vang tiếng vọng rõ giữa các mặt tiền.',
        'Một chuyến đi bộ ngắn có thể biến giai điệu thành kỷ niệm.',
      ],
    },
  },
}
