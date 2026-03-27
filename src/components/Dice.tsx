import './Dice.css'

type DiceProps = {
  value: number
  rolling: boolean
  size?: number
}

const pipMap: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

const faceClassByValue: Record<number, string> = {
  1: 'show-1',
  2: 'show-2',
  3: 'show-3',
  4: 'show-4',
  5: 'show-5',
  6: 'show-6',
}

function DiceFace({ value }: { value: number }) {
  const pips = pipMap[value]
  return (
    <div className="dice3d-face-grid">
      {Array.from({ length: 9 }, (_, index) => index + 1).map((cell) => (
        <span key={cell} className={`dice3d-dot ${pips.includes(cell) ? 'active' : ''}`} />
      ))}
    </div>
  )
}

export default function Dice({ value, rolling, size = 74 }: DiceProps) {
  const safeValue = Math.min(6, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4 | 5 | 6

  return (
    <div className="dice-scene" style={{ ['--dice-size' as string]: `${size}px` }} aria-label={`Dice value ${safeValue}`}>
      <div className={`dice-cube ${faceClassByValue[safeValue]} ${rolling ? 'rolling' : ''}`}>
        <div className="dice3d-face front">
          <DiceFace value={1} />
        </div>
        <div className="dice3d-face back">
          <DiceFace value={6} />
        </div>
        <div className="dice3d-face right">
          <DiceFace value={2} />
        </div>
        <div className="dice3d-face left">
          <DiceFace value={5} />
        </div>
        <div className="dice3d-face top">
          <DiceFace value={3} />
        </div>
        <div className="dice3d-face bottom">
          <DiceFace value={4} />
        </div>
      </div>
    </div>
  )
}
