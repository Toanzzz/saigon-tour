export const buildingRows = [
  ...[-40, -31, -22, -13, -4].map((x, i) => ({
    x,
    z: -34,
    scale: 6.4,
    yaw: 0,
    type: ['a', 'c', 'e', 'f', 'g'][i],
  })),
  ...[-40, -30, -20, -10, 0].map((x, i) => ({
    x,
    z: 24,
    scale: 6.2,
    yaw: Math.PI,
    type: ['c', 'g', 'j', 'e', 'a'][i],
  })),
  ...[-30, -19, -8, 3, 24, 34].map((z, i) => ({
    x: 42,
    z,
    scale: 6.5,
    yaw: -Math.PI / 2,
    type: ['e', 'f', 'g', 'j', 'c', 'a'][i],
  })),
  ...[-18, -7, 4].map((z, i) => ({
    x: -42,
    z,
    scale: 5.7,
    yaw: Math.PI / 2,
    type: ['g', 'j', 'c'][i],
  })),
  // Facing Nguyễn Huệ from both sides.
  ...[-8, 1, 20, 29].flatMap((z, i) => [
    { x: 57, z, scale: 6, yaw: Math.PI / 2, type: ['a', 'g', 'c', 'f'][i] },
    { x: 81, z, scale: 6, yaw: -Math.PI / 2, type: ['e', 'c', 'g', 'a'][i] },
  ]),
  // East side of Đồng Khởi, then the north corridor to the cathedral.
  ...[-56, -46, -36, -26, -6, 2, 21, 30].map((z, i) => ({
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
  ...[-77, -67].flatMap((z, i) => [
    { x: 75, z, scale: 6, yaw: Math.PI / 2, type: ['g', 'e'][i] },
    { x: 100, z, scale: 6, yaw: -Math.PI / 2, type: ['f', 'a'][i] },
  ]),
]
