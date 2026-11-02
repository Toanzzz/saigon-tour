export const buildingRows = [
  ...[-40, -31, -22, -13, -4].map((x, i) => ({
    x,
    z: -34,
    scale: 6.4,
    yaw: 0,
    type: ['a', 'c', 'e', 'f', 'g'][i],
  })),
  // Behind the HẺM ẨM THỰC plaza (z 25–31), clear of Lê Lợi (z ≤ 15.5).
  ...[-42, -35, -25, -13, -4].map((x, i) => ({
    x,
    z: 20,
    scale: 6.2,
    yaw: Math.PI,
    type: ['c', 'g', 'j', 'e', 'a'][i],
  })),
  // East frontage on the park/Lê Lợi corridor; the wide 'j' sits north of
  // Lê Lợi, the rest south of it, all clear of Lê Thánh Tôn (z -19..-13).
  ...[-31, -22, -10, 0, 24].map((z, i) => ({
    x: 44,
    z,
    scale: 6.5,
    yaw: -Math.PI / 2,
    type: ['e', 'f', 'g', 'c', 'j'][i],
  })),
  ...[-18, -7, 4].map((z, i) => ({
    x: -42,
    z,
    scale: 5.7,
    yaw: Math.PI / 2,
    type: ['g', 'j', 'c'][i],
  })),
  // Facing Nguyễn Huệ. West-side slots at z −8 (42 Nguyễn Huệ) and z 29
  // (Bitexco) are now landmark icons; see ICON_FOOTPRINTS in district.ts.
  ...[1, 20].map((z, i) => ({
    x: 57,
    z,
    scale: 6,
    yaw: Math.PI / 2,
    type: ['g', 'c'][i],
  })),
  ...[-8, 1, 20, 29].map((z, i) => ({
    x: 81,
    z,
    scale: 6,
    yaw: -Math.PI / 2,
    type: ['e', 'c', 'g', 'a'][i],
  })),
  // East side of Đồng Khởi, then the north corridor to the cathedral.
  ...[-56, -46, -22, -6, 2, 21, 30].map((z, i) => ({
    x: 97,
    z,
    scale: 6,
    yaw: -Math.PI / 2,
    type: ['a', 'g', 'c', 'f', 'e', 'g', 'a', 'c'][i],
  })),
  ...[-56, -46, -36].map((z, i) => ({
    x: 79,
    z,
    scale: 6,
    yaw: Math.PI / 2,
    type: ['c', 'f', 'a'][i],
  })),
  ...[-77, -67].map((z, i) => ({
    x: 75,
    z,
    scale: 6,
    yaw: Math.PI / 2,
    type: ['g', 'e'][i],
  })),
]
