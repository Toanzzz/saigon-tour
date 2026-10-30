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
]
