/**
 * Preset LEGO builds that can be loaded onto the baseplate
 */

export const PRESETS = [
  {
    id: 'train-10014',
    name: 'Passenger Train (Set 10014)',
    setNumber: 'Indie Workshop Set 10014',
    icon: '🚂',
    badge: 'Complete Model',
    description: 'Fully assembled authentic 9V passenger train with coaches, wheels, and chimney.',
    isGlb: true,
    isStageBuild: false
  },
  {
    id: 'train-stage-build',
    name: 'Passenger Train (5-Stage Build)',
    setNumber: 'Interactive Build',
    icon: '🛠️',
    badge: 'Step-by-Step',
    description: 'Snap the passenger train together piece-by-piece in 5 sequential stages with ghost preview!',
    isGlb: true,
    isStageBuild: true
  },
  {
    id: 'lego-castle',
    name: 'Knight\'s Watchtower',
    setNumber: 'Set 6074',
    icon: '🏰',
    badge: 'Brick Build',
    description: 'Sturdy fortress guard tower with crenelations and red roof slopes.',
    isGlb: false,
    bricks: [
      // Base layer Y = 0.6
      { type: 'brick-2x4', color: 'black', x: 0, y: 0.6, z: -1, rotY: 0 },
      { type: 'brick-2x4', color: 'black', x: 0, y: 0.6, z: 1, rotY: 0 },
      // Layer 2 Y = 1.8
      { type: 'brick-2x2', color: 'blue', x: -1, y: 1.8, z: 0, rotY: 0 },
      { type: 'brick-2x2', color: 'blue', x: 1, y: 1.8, z: 0, rotY: 0 },
      // Layer 3 Y = 3.0
      { type: 'brick-2x4', color: 'yellow', x: 0, y: 3.0, z: 0, rotY: Math.PI / 2 },
      // Layer 4 Y = 4.2 (Roof slopes)
      { type: 'slope-roof', color: 'red', x: 0, y: 4.2, z: -1, rotY: 0 },
      { type: 'slope-roof', color: 'red', x: 0, y: 4.2, z: 1, rotY: Math.PI }
    ]
  },
  {
    id: 'race-kart',
    name: 'Super Racer Buggy',
    setNumber: 'Set 6503',
    icon: '🏎️',
    badge: 'Brick Build',
    description: 'High-speed speedway buggy with dual wheel axles and aerodynamic spoiler.',
    isGlb: false,
    bricks: [
      // Wheel Axles
      { type: 'wheel-axle', color: 'black', x: 0, y: 0.6, z: -2, rotY: 0 },
      { type: 'wheel-axle', color: 'black', x: 0, y: 0.6, z: 2, rotY: 0 },
      // Chassis
      { type: 'brick-2x4', color: 'red', x: 0, y: 1.8, z: 0, rotY: 0 },
      { type: 'brick-2x2', color: 'yellow', x: 0, y: 3.0, z: -1, rotY: 0 },
      { type: 'slope-roof', color: 'white', x: 0, y: 3.0, z: 1, rotY: Math.PI }
    ]
  },
  {
    id: 'empty-canvas',
    name: 'Empty Baseplate',
    setNumber: 'Creative Mode',
    icon: '🟩',
    badge: 'Blank 18x18',
    description: 'Clean bright green 18x18 studded canvas ready for your imagination!',
    isGlb: false,
    bricks: []
  }
];
