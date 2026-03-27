import { useMemo, useState } from 'react'
import challengeQuestions from './data/challenge-questions.json'

type PawnLevel = 1 | 2 | 3 | 4
type TileType = 'normal' | 'chance' | 'challenge'

type Pawn = {
  id: string
  ownerId: string
  level: PawnLevel
  position: number | null
  inGoalLaneIndex: number | null
  shieldTurns: number
  isActive: boolean
}

type HomeBase = {
  level: PawnLevel
  finishedPawnIds: string[]
}

type Player = {
  id: string
  name: string
  color: string
  startIndex: number
  skipTurn: boolean
  extraRolls: number
  homeBase: HomeBase
  pawns: Pawn[]
}

type GameState = {
  players: Player[]
  currentPlayerIndex: number
  diceValue: number
  turn: number
}

type LobbySlot = {
  slotId: number
  joined: boolean
  ready: boolean
  playerName: string
}

type Room = {
  id: string
  name: string
  players: number
  status: 'waiting' | 'playing'
}

type ChallengeQuestion = {
  id: number
  question: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
  answer: 'A' | 'B' | 'C' | 'D'
}

type ChallengeData = {
  title: string
  totalQuestions: number
  questions: ChallengeQuestion[]
}

const EVENT_POSITIONS_BY_SECTOR = [2, 5, 8, 11]
const SECTOR_SIZE = 13
const BOARD_SIZE = 15

const PLAYER_PRESETS = [
  { id: 'P1', name: 'Người chơi Đỏ', color: '#ef4444', startIndex: 0 },
  { id: 'P2', name: 'Người chơi Xanh dương', color: '#3b82f6', startIndex: 13 },
  { id: 'P3', name: 'Người chơi Vàng', color: '#eab308', startIndex: 26 },
  { id: 'P4', name: 'Người chơi Xanh lá', color: '#22c55e', startIndex: 39 },
] as const

const pawnIconByLevel: Record<PawnLevel, string> = {
  1: '🐴',
  2: '🚂',
  3: '⚡',
  4: '🤖',
}

const dicePips: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
}

function createInitialLobbySlots(): LobbySlot[] {
  return PLAYER_PRESETS.map((_, index) => ({
    slotId: index,
    joined: index < 2,
    ready: false,
    playerName: `Người chơi ${index + 1}`,
  }))
}

function createInitialState(slots: LobbySlot[]): GameState {
  const joinedSlots = slots.filter((slot) => slot.joined)

  const players: Player[] = joinedSlots.map((slot, playerIndex) => {
    const preset = PLAYER_PRESETS[slot.slotId]
    const pawns: Pawn[] = Array.from({ length: 4 }, (_, index) => ({
      id: `${preset.id}-H${index + 1}`,
      ownerId: preset.id,
      level: 1,
      position: null,
      inGoalLaneIndex: null,
      shieldTurns: 0,
      isActive: false,
    }))

    return {
      id: preset.id,
      name: slot.playerName || `Người chơi ${playerIndex + 1}`,
      color: preset.color,
      startIndex: preset.startIndex,
      skipTurn: false,
      extraRolls: 0,
      homeBase: {
        level: 1,
        finishedPawnIds: [],
      },
      pawns,
    }
  })

  return {
    players,
    currentPlayerIndex: 0,
    diceValue: 1,
    turn: 1,
  }
}

function getTileTypeByTrackIndex(trackIndex: number): TileType {
  const localPosition = trackIndex % SECTOR_SIZE

  if (EVENT_POSITIONS_BY_SECTOR.includes(localPosition)) {
    return localPosition % 2 === 0 ? 'chance' : 'challenge'
  }

  return 'normal'
}

function buildTrackPath(): Array<{ row: number; col: number }> {
  return [
    { row: 6, col: 1 },
    { row: 6, col: 2 },
    { row: 6, col: 3 },
    { row: 6, col: 4 },
    { row: 6, col: 5 },
    { row: 5, col: 6 },
    { row: 4, col: 6 },
    { row: 3, col: 6 },
    { row: 2, col: 6 },
    { row: 1, col: 6 },
    { row: 0, col: 6 },
    { row: 0, col: 7 },
    { row: 0, col: 8 },
    { row: 1, col: 8 },
    { row: 2, col: 8 },
    { row: 3, col: 8 },
    { row: 4, col: 8 },
    { row: 5, col: 8 },
    { row: 6, col: 9 },
    { row: 6, col: 10 },
    { row: 6, col: 11 },
    { row: 6, col: 12 },
    { row: 6, col: 13 },
    { row: 6, col: 14 },
    { row: 7, col: 14 },
    { row: 8, col: 14 },
    { row: 8, col: 13 },
    { row: 8, col: 12 },
    { row: 8, col: 11 },
    { row: 8, col: 10 },
    { row: 8, col: 9 },
    { row: 9, col: 8 },
    { row: 10, col: 8 },
    { row: 11, col: 8 },
    { row: 12, col: 8 },
    { row: 13, col: 8 },
    { row: 14, col: 8 },
    { row: 14, col: 7 },
    { row: 14, col: 6 },
    { row: 13, col: 6 },
    { row: 12, col: 6 },
    { row: 11, col: 6 },
    { row: 10, col: 6 },
    { row: 9, col: 6 },
    { row: 8, col: 5 },
    { row: 8, col: 4 },
    { row: 8, col: 3 },
    { row: 8, col: 2 },
    { row: 8, col: 1 },
    { row: 8, col: 0 },
    { row: 7, col: 0 },
    { row: 6, col: 0 },
  ]
}

function getBaseCellClass(row: number, col: number): string {
  if (row <= 5 && col <= 5) return 'bg-red-950/60'
  if (row <= 5 && col >= 9) return 'bg-blue-950/60'
  if (row >= 9 && col <= 5) return 'bg-violet-950/60'
  if (row >= 9 && col >= 9) return 'bg-yellow-950/60'
  return 'bg-slate-900'
}

function getGoalLaneClass(row: number, col: number): string {
  if (col === 7 && row >= 1 && row <= 6) return 'bg-blue-900/50'
  if (row === 7 && col >= 8 && col <= 13) return 'bg-yellow-900/50'
  if (col === 7 && row >= 8 && row <= 13) return 'bg-violet-900/50'
  if (row === 7 && col >= 1 && col <= 6) return 'bg-red-900/50'
  return ''
}

function getTrackCellClass(type: TileType): string {
  if (type === 'chance') return 'bg-green-900/70 text-green-300'
  if (type === 'challenge') return 'bg-amber-900/70 text-amber-300'
  return 'bg-slate-900 text-slate-500'
}

function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className={`dice-face ${rolling ? 'rolling' : ''}`} aria-label={`Dice value ${value}`}>
      {dicePips[value].map(([row, col], idx) => (
        <span
          key={`${row}-${col}-${idx}`}
          className="dice-pip"
          style={{
            top: `${20 + row * 30}%`,
            left: `${20 + col * 30}%`,
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const challengeData = challengeQuestions as ChallengeData
  const [page, setPage] = useState<'room' | 'lobby' | 'game'>('room')
  const [rooms, setRooms] = useState<Room[]>([
    { id: 'R-1001', name: 'Phòng Nhanh 1', players: 1, status: 'waiting' },
    { id: 'R-1002', name: 'Phòng Chiến Thuật', players: 3, status: 'waiting' },
    { id: 'R-1003', name: 'Phòng Đang Chơi', players: 4, status: 'playing' },
  ])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [lobbySlots, setLobbySlots] = useState<LobbySlot[]>(() => createInitialLobbySlots())
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [rollingDice, setRollingDice] = useState(false)

  const activePlayer = gameState?.players[gameState.currentPlayerIndex]

  const trackPath = useMemo(() => buildTrackPath(), [])
  const featuredChallenge = useMemo(() => {
    const questions = challengeData.questions
    if (questions.length === 0) return null
    const index = Math.floor(Math.random() * questions.length)
    return questions[index]
  }, [challengeData.questions])

  const trackMap = useMemo(() => {
    const map = new Map<string, { index: number; type: TileType }>()
    trackPath.forEach((coord, index) => {
      map.set(`${coord.row}-${coord.col}`, { index, type: getTileTypeByTrackIndex(index) })
    })
    return map
  }, [trackPath])

  const rollDice = () => {
    if (rollingDice) return
    setRollingDice(true)
    window.setTimeout(() => {
      const nextDice = Math.floor(Math.random() * 6) + 1
      setGameState((prev) => (prev ? { ...prev, diceValue: nextDice } : prev))
      setRollingDice(false)
    }, 480)
  }

  const updateSlot = (slotId: number, patch: Partial<LobbySlot>) => {
    setLobbySlots((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId) return slot
        return { ...slot, ...patch }
      }),
    )
  }

  const joinSlot = (slotId: number) => {
    updateSlot(slotId, {
      joined: true,
      ready: false,
    })
  }

  const leaveSlot = (slotId: number) => {
    updateSlot(slotId, {
      joined: false,
      ready: false,
    })
  }

  const toggleReady = (slotId: number) => {
    setLobbySlots((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId || !slot.joined) return slot
        return { ...slot, ready: !slot.ready }
      }),
    )
  }

  const joinedCount = lobbySlots.filter((slot) => slot.joined).length
  const canStartGame =
    joinedCount >= 2 &&
    lobbySlots.filter((slot) => slot.joined).every((slot) => slot.ready && slot.playerName.trim().length > 0)

  const startGame = () => {
    if (!canStartGame) return
    setGameState(createInitialState(lobbySlots))
    setRooms((prev) =>
      prev.map((room) => (room.id === selectedRoomId ? { ...room, players: joinedCount, status: 'playing' } : room)),
    )
    setPage('game')
  }

  const backToLobby = () => {
    setGameState(null)
    setPage('lobby')
  }

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null

  const goToLobbyWithRoom = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId)
    if (!room || room.status !== 'waiting') return
    setSelectedRoomId(roomId)
    setLobbySlots(createInitialLobbySlots())
    setPage('lobby')
  }

  const createRoom = () => {
    const trimmedName = newRoomName.trim()
    const roomCode = `R-${Math.floor(1000 + Math.random() * 9000)}`
    const room: Room = {
      id: roomCode,
      name: trimmedName || `Phòng ${roomCode}`,
      players: 0,
      status: 'waiting',
    }
    setRooms((prev) => [room, ...prev])
    setNewRoomName('')
    goToLobbyWithRoom(room.id)
  }

  const backToRoomPage = () => {
    setGameState(null)
    setPage('room')
  }

  if (page === 'room') {
    return (
      <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
        <section className="mx-auto w-full max-w-5xl rounded-2xl bg-slate-800 p-6 shadow-lg ring-1 ring-white/10">
          <h1 className="text-3xl font-bold">Cờ Cá Ngựa 4.0 - Chọn phòng</h1>
          <p className="mt-2 text-sm text-slate-300">Chọn phòng chơi hoặc tạo phòng mới trước khi vào chọn slot.</p>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold">Tạo phòng mới</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Nhập tên phòng..."
                className="min-w-[240px] flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring"
              />
              <button
                onClick={createRoom}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
              >
                Tạo phòng
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4"
              >
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-xs text-slate-400">
                    Mã phòng: {room.id} | Người chơi: {room.players}/4
                  </p>
                </div>
                <button
                  onClick={() => goToLobbyWithRoom(room.id)}
                  disabled={room.status !== 'waiting'}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {room.status === 'waiting' ? 'Vào phòng' : 'Đang chơi'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    )
  }

  if (page === 'lobby' && !gameState) {
    return (
      <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
        <section className="mx-auto w-full max-w-5xl rounded-2xl bg-slate-800 p-6 shadow-lg ring-1 ring-white/10">
          <h1 className="text-3xl font-bold">Cờ Cá Ngựa 4.0 - Phòng chờ nhiều người chơi</h1>
          <p className="mt-2 text-sm text-slate-300">
            Quản lý người chơi vào 4 slot. Cần tối thiểu 2 người chơi và tất cả đã sẵn sàng để vào game.
          </p>
          <p className="mt-1 text-sm text-indigo-300">
            Phòng hiện tại: {selectedRoom?.name ?? 'Chưa chọn phòng'} ({selectedRoom?.id ?? '-'})
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {lobbySlots.map((slot) => {
              const preset = PLAYER_PRESETS[slot.slotId]
              return (
                <div
                  key={slot.slotId}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: preset.color }}>
                      Slot {slot.slotId + 1} - {preset.id}
                    </p>
                    <span
                      className={`rounded-md px-2 py-1 text-xs ${slot.joined ? 'bg-emerald-700/70' : 'bg-slate-700'}`}
                    >
                      {slot.joined ? 'Đã vào' : 'Trống'}
                    </span>
                  </div>

                  <input
                    value={slot.playerName}
                    onChange={(e) => updateSlot(slot.slotId, { playerName: e.target.value })}
                    disabled={!slot.joined}
                    className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm outline-none ring-indigo-400 focus:ring"
                    placeholder="Nhập tên người chơi..."
                  />

                  <div className="mt-3 flex gap-2">
                    {!slot.joined ? (
                      <button
                        onClick={() => joinSlot(slot.slotId)}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500"
                      >
                        Vào slot
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleReady(slot.slotId)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            slot.ready ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                          }`}
                        >
                          {slot.ready ? 'Đã sẵn sàng' : 'Sẵn sàng'}
                        </button>
                        <button
                          onClick={() => leaveSlot(slot.slotId)}
                          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold hover:bg-rose-600"
                        >
                          Rời slot
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-slate-700 px-3 py-2 text-sm">
              Đã vào: {joinedCount}/4
            </span>
            <button
              onClick={startGame}
              disabled={!canStartGame}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              Bắt đầu game
            </button>
            <button
              onClick={backToRoomPage}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500"
            >
              Quay lại chọn phòng
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl bg-slate-800 p-5 shadow-lg ring-1 ring-white/10">
          <h1 className="text-2xl font-bold">Cờ Cá Ngựa 4.0</h1>
          <p className="mt-1 text-sm text-slate-300">Phòng chơi nhiều người được tạo từ trang chọn slot.</p>

          <div className="mt-5 space-y-3 rounded-xl bg-slate-700/60 p-4">
            <p className="text-sm">
              Lượt hiện tại: <span className="font-semibold">{activePlayer?.name}</span>
            </p>
            <p className="text-sm">Turn: {gameState?.turn}</p>
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/80 p-2">
              <Dice value={gameState?.diceValue ?? 1} rolling={rollingDice} />
              <div>
                <p className="text-xs text-slate-300">Xúc xắc</p>
                <p className="text-lg font-bold">{gameState?.diceValue}</p>
              </div>
            </div>
            <button
              onClick={rollDice}
              disabled={rollingDice}
              className="mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-700"
            >
              {rollingDice ? 'Đang tung...' : 'Tung xúc xắc'}
            </button>
            <button
              onClick={backToLobby}
              className="mt-2 w-full rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-500"
            >
              Quay lại Lobby
            </button>
          </div>

          <section className="mt-5 space-y-3">
            {gameState?.players.map((player) => (
              <div key={player.id} className="rounded-xl bg-slate-700/50 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: player.color }}>
                    {player.name}
                  </p>
                  <span className="text-xs">Home Lv.{player.homeBase.level}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {player.pawns.map((pawn) => (
                    <span key={pawn.id} className="rounded-md bg-slate-800 px-2 py-1 text-xs">
                      {pawnIconByLevel[pawn.level]} {pawn.id}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-xl bg-slate-700/50 p-3 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-300">Challenge Bank</p>
            <p className="mt-1 text-sm font-semibold">
              {challengeData.title} ({challengeData.totalQuestions} câu)
            </p>
            {featuredChallenge ? (
              <div className="mt-2 space-y-1 text-xs text-slate-200">
                <p>
                  <span className="font-semibold">Câu {featuredChallenge.id}:</span> {featuredChallenge.question}
                </p>
                <p>
                  A. {featuredChallenge.options.A} | B. {featuredChallenge.options.B}
                </p>
                <p>
                  C. {featuredChallenge.options.C} | D. {featuredChallenge.options.D}
                </p>
                <p className="text-emerald-300">Đáp án: {featuredChallenge.answer}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-amber-300">Chưa có câu hỏi challenge.</p>
            )}
          </section>
        </aside>

        <section className="rounded-2xl bg-slate-800 p-4 shadow-lg ring-1 ring-white/10">
          <div
            className="grid aspect-square w-full gap-px overflow-hidden rounded-xl border border-slate-700 bg-slate-700"
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
              const row = Math.floor(i / BOARD_SIZE)
              const col = i % BOARD_SIZE
              const trackInfo = trackMap.get(`${row}-${col}`)
              const goalClass = getGoalLaneClass(row, col)
              const baseClass = getBaseCellClass(row, col)

              let className =
                'relative flex items-center justify-center border border-slate-800 text-[10px] font-medium'

              if (trackInfo) {
                className += ` ${getTrackCellClass(trackInfo.type)}`
              } else if (goalClass) {
                className += ` ${goalClass}`
              } else {
                className += ` ${baseClass}`
              }

              const isHomeDot =
                (row === 2 || row === 3) && (col === 2 || col === 3) ? 'bg-red-500' :
                (row === 2 || row === 3) && (col === 11 || col === 12) ? 'bg-blue-500' :
                (row === 11 || row === 12) && (col === 2 || col === 3) ? 'bg-violet-500' :
                (row === 11 || row === 12) && (col === 11 || col === 12) ? 'bg-yellow-400' :
                ''

              return (
                <div key={`${row}-${col}`} className={className}>
                  {trackInfo ? (
                    <>
                      <span>{trackInfo.index + 1}</span>
                      {(trackInfo.type === 'chance' || trackInfo.type === 'challenge') && (
                        <span className="absolute right-1 top-0.5 text-[10px]">
                          {trackInfo.type === 'chance' ? '*' : '⚡'}
                        </span>
                      )}
                    </>
                  ) : isHomeDot ? (
                    <span className={`h-7 w-7 rounded-full ${isHomeDot} text-[11px] font-bold text-slate-950`}>
                      1
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="rounded bg-slate-700 px-2 py-1">Ô thường</span>
            <span className="rounded bg-green-600 px-2 py-1">Chance</span>
            <span className="rounded bg-orange-500 px-2 py-1">Challenge</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
