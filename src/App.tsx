import { useEffect, useMemo, useState } from 'react'
import challengeQuestions from './data/challenge-questions.json'
import Dice from './components/Dice'

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
  shieldCharges: number
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

type EventDialogState = {
  type: 'chance' | 'challenge'
  playerName: string
  tileIndex: number
  chanceText?: string
  challenge?: ChallengeQuestion
}

type ChanceCardId =
  | 'home-upgrade'
  | 'pawn-upgrade'
  | 'competition-win'
  | 'protection-policy'
  | 'fdi-capital'

type SnackbarState = {
  message: string
  tone: 'success' | 'error'
} | null

const EVENT_POSITIONS_BY_SECTOR = [2, 5, 8, 11]
const SECTOR_SIZE = 13
const BOARD_SIZE = 15
const CHALLENGE_TIME_LIMIT = 15
const CHANCE_CARDS: Array<{ id: ChanceCardId; title: string }> = [
  { id: 'home-upgrade', title: 'Chiến lược phát triển' },
  { id: 'pawn-upgrade', title: 'Chuyển giao công nghệ' },
  { id: 'competition-win', title: 'Cạnh tranh thắng lợi' },
  { id: 'protection-policy', title: 'Chính sách Bảo hộ' },
  { id: 'fdi-capital', title: 'Dòng vốn FDI' },
]

const PLAYER_PRESETS = [
  { id: 'P1', name: 'Người chơi Đỏ', color: '#ef4444', startIndex: 0 },
  { id: 'P2', name: 'Người chơi Xanh dương', color: '#3b82f6', startIndex: 13 },
  { id: 'P4', name: 'Người chơi Xanh lá', color: '#22c55e', startIndex: 26 },
  { id: 'P3', name: 'Người chơi Vàng', color: '#eab308', startIndex: 39 },
] as const

const pawnIconByLevel: Record<PawnLevel, string> = {
  1: '/h1.png',
  2: '/h2.png',
  3: '/h3.png',
  4: '/h4.png',
}

function createInitialState(): GameState {
  const players: Player[] = PLAYER_PRESETS.map((preset, playerIndex) => {
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
      name: preset.name || `Người chơi ${playerIndex + 1}`,
      color: preset.color,
      startIndex: preset.startIndex,
      skipTurn: false,
      extraRolls: 0,
      homeBase: {
        level: 1,
        finishedPawnIds: [],
        shieldCharges: 0,
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
  if (row >= 9 && col <= 5) return 'bg-yellow-950/60'
  if (row >= 9 && col >= 9) return 'bg-green-950/60'
  return 'bg-slate-900'
}

function getGoalLaneClass(row: number, col: number): string {
  if (col === 7 && row >= 1 && row <= 6) return 'bg-blue-900/50'
  if (row === 7 && col >= 8 && col <= 13) return 'bg-yellow-900/50'
  if (col === 7 && row >= 8 && row <= 13) return 'bg-green-900/50'
  if (row === 7 && col >= 1 && col <= 6) return 'bg-red-900/50'
  return ''
}

function getTrackCellClass(type: TileType): string {
  if (type === 'chance') return 'tile-chance text-cyan-100'
  if (type === 'challenge') return 'tile-challenge text-fuchsia-100'
  return 'bg-slate-900 text-slate-500'
}

function App() {
  const challengeData = challengeQuestions as ChallengeData
  const [gameState, setGameState] = useState<GameState>(() => createInitialState())
  const [selectedPawnByPlayer, setSelectedPawnByPlayer] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLAYER_PRESETS.map((preset) => [preset.id, `${preset.id}-H1`])),
  )
  const [rollingDice, setRollingDice] = useState(false)
  const [pendingDice, setPendingDice] = useState<number | null>(null)
  const [isAnimatingMove, setIsAnimatingMove] = useState(false)
  const [animatedPawnPositions, setAnimatedPawnPositions] = useState<Record<string, number>>({})
  const [highlightedEventTile, setHighlightedEventTile] = useState<number | null>(null)
  const [eventDialog, setEventDialog] = useState<EventDialogState | null>(null)
  const [challengeChoice, setChallengeChoice] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [challengeSubmitted, setChallengeSubmitted] = useState(false)
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(CHALLENGE_TIME_LIMIT)
  const [snackbar, setSnackbar] = useState<SnackbarState>(null)

  const activePlayer = gameState.players[gameState.currentPlayerIndex]

  const trackPath = useMemo(() => buildTrackPath(), [])

  const trackMap = useMemo(() => {
    const map = new Map<string, { index: number; type: TileType }>()
    trackPath.forEach((coord, index) => {
      map.set(`${coord.row}-${coord.col}`, { index, type: getTileTypeByTrackIndex(index) })
    })
    return map
  }, [trackPath])

  const pawnIdToIcon = useMemo(() => {
    const map = new Map<string, string>()
    gameState.players.forEach((player) => {
      player.pawns.forEach((pawn) => {
        map.set(pawn.id, pawnIconByLevel[pawn.level])
      })
    })
    return map
  }, [gameState.players])

  const pawnIdToOwnerColor = useMemo(() => {
    const map = new Map<string, string>()
    gameState.players.forEach((player) => {
      player.pawns.forEach((pawn) => {
        map.set(pawn.id, player.color)
      })
    })
    return map
  }, [gameState.players])

  const ownerIdToColor = useMemo(
    () => new Map(gameState.players.map((player) => [player.id, player.color] as const)),
    [gameState.players],
  )
  const ownerIdToHomeLevel = useMemo(
    () => new Map(gameState.players.map((player) => [player.id, player.homeBase.level] as const)),
    [gameState.players],
  )

  const selectedPawnId = selectedPawnByPlayer[activePlayer.id] ?? activePlayer.pawns[0]?.id ?? ''
  const canClickPawnNow = pendingDice !== null && !rollingDice && !eventDialog && !isAnimatingMove

  useEffect(() => {
    if (!snackbar) return
    const timeout = window.setTimeout(() => setSnackbar(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [snackbar])

  useEffect(() => {
    const isChallengeOpen = eventDialog?.type === 'challenge' && !!eventDialog.challenge
    if (!isChallengeOpen || challengeSubmitted) return
    setChallengeTimeLeft(CHALLENGE_TIME_LIMIT)

    const timer = window.setInterval(() => {
      setChallengeTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setChallengeSubmitted(true)
          setSnackbar({
            message: 'Chia buon! Het thoi gian tra loi.',
            tone: 'error',
          })
          setEventDialog(null)
          setChallengeChoice(null)
          setGameState((state) => moveToNextTurn(state))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [eventDialog, challengeSubmitted])

  const moveToNextTurn = (state: GameState): GameState => {
    const nextCurrentPlayer = (state.currentPlayerIndex + 1) % state.players.length
    const shouldIncreaseTurn = nextCurrentPlayer === 0
    return {
      ...state,
      currentPlayerIndex: nextCurrentPlayer,
      turn: shouldIncreaseTurn ? state.turn + 1 : state.turn,
    }
  }

  const getDestinationIndex = (player: Player, pawn: Pawn, dice: number): number => {
    if (pawn.position === null) return player.startIndex
    return (pawn.position + dice) % trackPath.length
  }

  const hasOwnPawnOnDestination = (player: Player, pawn: Pawn, dice: number): boolean => {
    const destinationIndex = getDestinationIndex(player, pawn, dice)
    return player.pawns.some((item) => item.id !== pawn.id && item.position === destinationIndex)
  }

  const canPawnActWithDice = (pawn: Pawn, dice: number | null) => {
    if (!dice) return false
    if (pawn.position === null) {
      if (dice !== 1 && dice !== 6) return false
      return !hasOwnPawnOnDestination(activePlayer, pawn, dice)
    }
    return !hasOwnPawnOnDestination(activePlayer, pawn, dice)
  }

  const rollDice = () => {
    if (rollingDice || !!eventDialog || pendingDice !== null || isAnimatingMove) return
    setRollingDice(true)
    window.setTimeout(() => {
      const nextDice = Math.floor(Math.random() * 6) + 1
      setGameState((prev) => {
        const currentPlayer = prev.players[prev.currentPlayerIndex]
        const hasPawnOnBoard = currentPlayer.pawns.some((pawn) => pawn.position !== null)
        const canDeploy = nextDice === 1 || nextDice === 6
        const nextState = { ...prev, diceValue: nextDice }

        if (!canDeploy && !hasPawnOnBoard) {
          setPendingDice(null)
          return moveToNextTurn(nextState)
        }

        setPendingDice(nextDice)
        return nextState
      })
      setRollingDice(false)
    }, 480)
  }

  const applyPawnMove = (pawnId: string) => {
    if (pendingDice === null || rollingDice || !!eventDialog || isAnimatingMove) return

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    const pawnToMove = currentPlayer.pawns.find((pawn) => pawn.id === pawnId)
    if (!pawnToMove) return

    const isDeployMove = pawnToMove.position === null
    const canDeploy = pendingDice === 1 || pendingDice === 6
    if (isDeployMove && !canDeploy) return
    if (hasOwnPawnOnDestination(currentPlayer, pawnToMove, pendingDice)) {
      setSnackbar({
        message: 'O dich da co quan cua ban.',
        tone: 'error',
      })
      return
    }

    const rolledValue = pendingDice
    const startIndex = pawnToMove.position ?? currentPlayer.startIndex
    const travelPath = isDeployMove
      ? [currentPlayer.startIndex]
      : Array.from({ length: rolledValue }, (_, step) => (startIndex + step + 1) % trackPath.length)
    const destinationIndex = travelPath[travelPath.length - 1]

    setIsAnimatingMove(true)
    let frame = 0

    const playStep = () => {
      const nextIndex = travelPath[frame]
      setAnimatedPawnPositions((prev) => ({ ...prev, [pawnId]: nextIndex }))
      frame += 1

      if (frame < travelPath.length) {
        window.setTimeout(playStep, 170)
        return
      }

      window.setTimeout(() => {
        setAnimatedPawnPositions((prev) => {
          const next = { ...prev }
          delete next[pawnId]
          return next
        })

        setGameState((prev) => {
          const playerIndex = prev.currentPlayerIndex
          const active = prev.players[playerIndex]
          const pawnIndex = active.pawns.findIndex((pawn) => pawn.id === pawnId)
          if (pawnIndex < 0) return prev

          const nextPlayers = [...prev.players]
          const nextActive = { ...active }
          const nextPawns = [...nextActive.pawns]
          const originIndex = nextPawns[pawnIndex].position
          nextPawns[pawnIndex] = { ...nextPawns[pawnIndex], position: destinationIndex, isActive: true }
          nextActive.pawns = nextPawns
          nextPlayers[playerIndex] = nextActive

          // One-cell rule + protection: capture enemy on destination unless shield blocks.
          let moveBlockedByProtection = false
          nextPlayers.forEach((player, idx) => {
            if (idx === playerIndex) return
            const updatedEnemyPawns = player.pawns.map((pawn) => {
              if (pawn.position !== destinationIndex) return pawn
              if (pawn.shieldTurns > 0) {
                moveBlockedByProtection = true
                return { ...pawn, shieldTurns: pawn.shieldTurns - 1 }
              }
              return { ...pawn, position: null, inGoalLaneIndex: null, isActive: false }
            })
            nextPlayers[idx] = { ...player, pawns: updatedEnemyPawns }
          })

          if (moveBlockedByProtection) {
            nextPawns[pawnIndex] = { ...nextPawns[pawnIndex], position: originIndex, isActive: originIndex !== null }
            nextActive.pawns = nextPawns
            nextPlayers[playerIndex] = nextActive
            setSnackbar({
              message: 'Quan doi thu duoc bao ho, nuoc di bi chan.',
              tone: 'error',
            })
          }

          const tileType = getTileTypeByTrackIndex(destinationIndex)
          if (!moveBlockedByProtection && (tileType === 'chance' || tileType === 'challenge')) {
            setHighlightedEventTile(destinationIndex)
            window.setTimeout(() => setHighlightedEventTile(null), 1800)

            if (tileType === 'chance') {
              const chanceCard = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)]
              let chanceText = `${chanceCard.title}: `

              if (chanceCard.id === 'home-upgrade') {
                const currentLevel = nextActive.homeBase.level
                const upgradedLevel = Math.min(4, currentLevel + 1) as PawnLevel
                nextActive.homeBase = { ...nextActive.homeBase, level: upgradedLevel }
                nextPlayers[playerIndex] = { ...nextActive }
                chanceText +=
                  upgradedLevel > currentLevel
                    ? `Nha chinh tang len Lv.${upgradedLevel}.`
                    : `Nha chinh da dat cap toi da Lv.${currentLevel}.`
              } else if (chanceCard.id === 'pawn-upgrade') {
                const movedPawn = nextActive.pawns[pawnIndex]
                const upgradedLevel = Math.min(4, movedPawn.level + 1) as PawnLevel
                nextActive.pawns[pawnIndex] = { ...movedPawn, level: upgradedLevel }
                nextPlayers[playerIndex] = { ...nextActive, pawns: [...nextActive.pawns] }
                chanceText +=
                  upgradedLevel > movedPawn.level
                    ? `${movedPawn.id} tang len Lv.${upgradedLevel}.`
                    : `${movedPawn.id} da o cap toi da Lv.${movedPawn.level}.`
              } else if (chanceCard.id === 'competition-win') {
                let affectedText = 'Khong co muc tieu de ha cap.'
                for (let idx = 0; idx < nextPlayers.length; idx += 1) {
                  if (idx === playerIndex) continue
                  const enemy = nextPlayers[idx]
                  let enemyChanged = false

                  const strongestPawnIndex = enemy.pawns.findIndex((pawn) => pawn.level > 1)
                  if (strongestPawnIndex >= 0) {
                    const targetPawn = enemy.pawns[strongestPawnIndex]
                    if (targetPawn.shieldTurns > 0) {
                      const updatedPawns = [...enemy.pawns]
                      updatedPawns[strongestPawnIndex] = { ...targetPawn, shieldTurns: targetPawn.shieldTurns - 1 }
                      nextPlayers[idx] = { ...enemy, pawns: updatedPawns }
                      affectedText = `${enemy.name} da chan ha cap bang the bao ho.`
                    } else {
                      const updatedPawns = [...enemy.pawns]
                      updatedPawns[strongestPawnIndex] = {
                        ...targetPawn,
                        level: Math.max(1, targetPawn.level - 1) as PawnLevel,
                      }
                      nextPlayers[idx] = { ...enemy, pawns: updatedPawns }
                      affectedText = `${enemy.name} bi ha cap ${targetPawn.id} xuong Lv.${updatedPawns[strongestPawnIndex].level}.`
                    }
                    enemyChanged = true
                  } else if (enemy.homeBase.level > 1) {
                    if (enemy.homeBase.shieldCharges > 0) {
                      nextPlayers[idx] = {
                        ...enemy,
                        homeBase: { ...enemy.homeBase, shieldCharges: enemy.homeBase.shieldCharges - 1 },
                      }
                      affectedText = `${enemy.name} da chan ha cap nha chinh bang the bao ho.`
                    } else {
                      nextPlayers[idx] = {
                        ...enemy,
                        homeBase: { ...enemy.homeBase, level: Math.max(1, enemy.homeBase.level - 1) as PawnLevel },
                      }
                      affectedText = `${enemy.name} bi ha cap Nha chinh xuong Lv.${nextPlayers[idx].homeBase.level}.`
                    }
                    enemyChanged = true
                  }

                  if (enemyChanged) break
                }
                chanceText += affectedText
              } else if (chanceCard.id === 'protection-policy') {
                const movedPawn = nextActive.pawns[pawnIndex]
                if (movedPawn.position !== null) {
                  nextActive.pawns[pawnIndex] = { ...movedPawn, shieldTurns: movedPawn.shieldTurns + 1 }
                  nextPlayers[playerIndex] = { ...nextActive, pawns: [...nextActive.pawns] }
                  chanceText += `${movedPawn.id} nhan 1 the bao ho (1 lan).`
                } else {
                  nextActive.homeBase = { ...nextActive.homeBase, shieldCharges: nextActive.homeBase.shieldCharges + 1 }
                  nextPlayers[playerIndex] = { ...nextActive }
                  chanceText += 'Nha chinh nhan 1 the bao ho (1 lan).'
                }
              } else if (chanceCard.id === 'fdi-capital') {
                const spawnPawnIndex = nextActive.pawns.findIndex((pawn) => pawn.position === null)
                if (spawnPawnIndex < 0) {
                  chanceText += 'Khong con quan trong nha de ra them.'
                } else {
                  const ownOccupyStart = nextActive.pawns.some(
                    (pawn, idx) => idx !== spawnPawnIndex && pawn.position === nextActive.startIndex,
                  )
                  if (ownOccupyStart) {
                    chanceText += 'Diem xuat phat dang co quan cua ban, chua the ra them.'
                  } else {
                    const spawnedPawns = [...nextActive.pawns]
                    spawnedPawns[spawnPawnIndex] = {
                      ...spawnedPawns[spawnPawnIndex],
                      position: nextActive.startIndex,
                      isActive: true,
                    }
                    nextActive.pawns = spawnedPawns
                    nextPlayers[playerIndex] = { ...nextActive, pawns: spawnedPawns }

                    nextPlayers.forEach((enemy, idx) => {
                      if (idx === playerIndex) return
                      const adjustedEnemyPawns = enemy.pawns.map((pawn) => {
                        if (pawn.position !== nextActive.startIndex) return pawn
                        if (pawn.shieldTurns > 0) {
                          return { ...pawn, shieldTurns: pawn.shieldTurns - 1 }
                        }
                        return { ...pawn, position: null, inGoalLaneIndex: null, isActive: false }
                      })
                      nextPlayers[idx] = { ...enemy, pawns: adjustedEnemyPawns }
                    })
                    chanceText += `${spawnedPawns[spawnPawnIndex].id} da duoc ra quan ngay.`
                  }
                }
              }

              setChallengeChoice(null)
              setChallengeSubmitted(false)
              setEventDialog({
                type: 'chance',
                playerName: nextActive.name,
                tileIndex: destinationIndex,
                chanceText,
              })
            } else {
              const questions = challengeData.questions
              const challenge = questions.length > 0 ? questions[Math.floor(Math.random() * questions.length)] : undefined
              setChallengeChoice(null)
              setChallengeSubmitted(false)
              setChallengeTimeLeft(CHALLENGE_TIME_LIMIT)
              setEventDialog({
                type: 'challenge',
                playerName: nextActive.name,
                tileIndex: destinationIndex,
                challenge,
              })
            }
          }

          const movedState = { ...prev, players: nextPlayers }
          if (tileType === 'challenge') {
            return movedState
          }
          return rolledValue === 1 || rolledValue === 6 ? movedState : moveToNextTurn(movedState)
        })

        setPendingDice(null)
        setIsAnimatingMove(false)
      }, 130)
    }

    playStep()
  }

  const handlePawnClick = (player: Player, pawn: Pawn) => {
    if (player.id !== activePlayer.id || !!eventDialog || rollingDice || isAnimatingMove) return

    setSelectedPawnByPlayer((prev) => ({ ...prev, [player.id]: pawn.id }))

    if (pendingDice !== null) {
      if (canPawnActWithDice(pawn, pendingDice)) {
        applyPawnMove(pawn.id)
      }
    }
  }

  const resetGame = () => {
    setGameState(createInitialState())
    setSelectedPawnByPlayer(Object.fromEntries(PLAYER_PRESETS.map((preset) => [preset.id, `${preset.id}-H1`])))
    setRollingDice(false)
    setPendingDice(null)
    setIsAnimatingMove(false)
    setAnimatedPawnPositions({})
    setHighlightedEventTile(null)
    setEventDialog(null)
    setChallengeChoice(null)
    setChallengeSubmitted(false)
    setChallengeTimeLeft(CHALLENGE_TIME_LIMIT)
    setSnackbar(null)
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl bg-slate-800 p-5 shadow-lg ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Ludo logo" className="h-10 w-10 rounded-lg object-cover" />
            <h1 className="text-2xl font-bold">Cờ Cá Ngựa 4.0</h1>
          </div>
          <p className="mt-1 text-sm text-slate-300">Đang chạy chế độ chơi nhanh: bỏ qua phòng và slot.</p>

          <div className="mt-5 space-y-3 rounded-xl bg-slate-700/60 p-4">
            <p className="text-sm">
              Lượt hiện tại: <span className="font-semibold">{activePlayer.name}</span>
            </p>
            <p className="text-sm">Turn: {gameState.turn}</p>
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/80 p-2">
              <Dice value={gameState.diceValue} rolling={rollingDice} />
              <div>
                <p className="text-xs text-slate-300">Xúc xắc</p>
                <p className="text-lg font-bold">{gameState.diceValue}</p>
              </div>
            </div>
            {pendingDice !== null && (
              <p className="rounded-lg border border-indigo-400/50 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                Đã ra <span className="font-semibold">{pendingDice}</span>. Chọn quân để đi (ra quân cần 1 hoặc 6).
              </p>
            )}
            <button
              onClick={rollDice}
              disabled={rollingDice || !!eventDialog || pendingDice !== null || isAnimatingMove}
              className="mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-700"
            >
              {rollingDice ? 'Dang tung...' : 'Tung xuc xac'}
            </button>
            <button
              onClick={resetGame}
              className="mt-2 w-full rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-500"
            >
              Khởi tạo lại ván
            </button>
          </div>

          <section className="mt-5 space-y-3">
            {gameState.players.map((player) => (
              <div key={player.id} className="rounded-xl bg-slate-700/50 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: player.color }}>
                    {player.name}
                  </p>
                  <span className="text-xs">Home Lv.{player.homeBase.level}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {player.pawns.map((pawn) => (
                    <button
                      key={pawn.id}
                      type="button"
                      onClick={() => handlePawnClick(player, pawn)}
                      disabled={player.id !== activePlayer.id || !!eventDialog || rollingDice || isAnimatingMove}
                      className={`rounded-md px-2 py-1 text-xs ${
                        player.id === activePlayer.id && pawn.id === selectedPawnId
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                          : 'bg-slate-800'
                      } transition hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-lg disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-slate-800`}
                    >
                      <img
                        src={pawnIconByLevel[pawn.level]}
                        alt={`Level ${pawn.level}`}
                        className={`mr-1 inline h-4 w-4 align-text-bottom transition ${
                          player.id === activePlayer.id ? 'scale-110' : 'brightness-50 saturate-50'
                        }`}
                        style={{
                          borderRadius: '4px',
                          boxShadow:
                            player.id === activePlayer.id
                              ? `0 0 0 1px ${player.color}, 0 0 14px ${player.color}`
                              : `0 0 0 1px ${player.color}, 0 0 8px ${player.color}`,
                        }}
                      />
                      {pawn.id}
                    </button>
                  ))}
                </div>
                {player.id === activePlayer.id && pendingDice !== null && (
                  <p className="mt-2 text-[11px] text-slate-300">Bấm trực tiếp vào quân cờ để xuất quân/di chuyển.</p>
                )}
              </div>
            ))}
          </section>

        </aside>

        <section className="rounded-2xl bg-slate-800 p-4 shadow-lg ring-1 ring-white/10">
          <div
            className="grid aspect-square w-full gap-px overflow-hidden rounded-xl border border-slate-700 bg-slate-700"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
              const row = Math.floor(i / BOARD_SIZE)
              const col = i % BOARD_SIZE
              const trackInfo = trackMap.get(`${row}-${col}`)
              const goalClass = getGoalLaneClass(row, col)
              const baseClass = getBaseCellClass(row, col)
              const isInRedBase = row <= 5 && col <= 5
              const isInBlueBase = row <= 5 && col >= 9
              const isInYellowBase = row >= 9 && col <= 5
              const isInGreenBase = row >= 9 && col >= 9
              const isActivePlayerBase =
                (activePlayer.id === 'P1' && isInRedBase) ||
                (activePlayer.id === 'P2' && isInBlueBase) ||
                (activePlayer.id === 'P3' && isInYellowBase) ||
                (activePlayer.id === 'P4' && isInGreenBase)

              let className =
                'relative flex items-center justify-center border border-slate-800 text-[10px] font-medium'

              if (trackInfo) {
                className += ` ${getTrackCellClass(trackInfo.type)}`
                const startOwner = gameState.players.find((player) => player.startIndex === trackInfo.index)
                if (startOwner) {
                  className += ' ring-1 ring-white/25'
                }
                if (trackInfo.index === highlightedEventTile && trackInfo.type === 'chance') {
                  className += ' tile-event-chance'
                }
                if (trackInfo.index === highlightedEventTile && trackInfo.type === 'challenge') {
                  className += ' tile-event-challenge'
                }
              } else if (goalClass) {
                className += ` ${goalClass}`
              } else {
                className += ` ${baseClass}`
                if (isActivePlayerBase) {
                  className += ' ring-1 ring-white/30 brightness-150 shadow-[inset_0_0_20px_rgba(255,255,255,0.22)]'
                }
              }

              const homePawn =
                (row === 2 || row === 3) && (col === 2 || col === 3)
                  ? gameState.players.find((player) => player.id === 'P1')?.pawns[(row - 2) * 2 + (col - 2)]
                  : (row === 2 || row === 3) && (col === 11 || col === 12)
                    ? gameState.players.find((player) => player.id === 'P2')?.pawns[(row - 2) * 2 + (col - 11)]
                    : (row === 11 || row === 12) && (col === 2 || col === 3)
                      ? gameState.players.find((player) => player.id === 'P3')?.pawns[(row - 11) * 2 + (col - 2)]
                      : (row === 11 || row === 12) && (col === 11 || col === 12)
                        ? gameState.players.find((player) => player.id === 'P4')?.pawns[(row - 11) * 2 + (col - 11)]
                        : undefined
              const pawnsOnCell =
                trackInfo
                  ? gameState.players.flatMap((player) =>
                      player.pawns
                        .filter((pawn) => (animatedPawnPositions[pawn.id] ?? pawn.position) === trackInfo.index)
                        .map((pawn) => pawn.id),
                    )
                  : []
              const topPawnId = pawnsOnCell[pawnsOnCell.length - 1]

              const startOwner = trackInfo
                ? gameState.players.find((player) => player.startIndex === trackInfo.index)
                : undefined
              const startCellTextClass =
                startOwner?.color.toLowerCase() === '#eab308' ? 'text-slate-900' : 'text-white'

              return (
                <div
                  key={`${row}-${col}`}
                  className={className}
                  style={
                    startOwner
                      ? {
                          backgroundColor: `${startOwner.color}CC`,
                        }
                      : undefined
                  }
                >
                  {isActivePlayerBase && (
                    <span className="pointer-events-none absolute inset-0 bg-white/8" />
                  )}
                  {trackInfo ? (
                    <>
                      <span className={`absolute left-1 top-0.5 ${startOwner ? startCellTextClass : ''}`}>
                        {trackInfo.index + 1}
                      </span>
                      {(trackInfo.type === 'chance' || trackInfo.type === 'challenge') && (
                        <span
                          className={`absolute right-1 top-0.5 rounded px-0.5 text-[9px] font-bold ${
                            trackInfo.type === 'chance'
                              ? 'bg-cyan-500/30 text-cyan-100'
                              : 'bg-fuchsia-500/30 text-fuchsia-100'
                          } ${startOwner ? startCellTextClass : ''}`}
                        >
                          {trackInfo.type === 'chance' ? 'CH' : 'TH'}
                        </span>
                      )}
                      {gameState.players.some((player) => player.startIndex === trackInfo.index) && (
                        <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${startOwner ? startCellTextClass : ''}`}>
                          S
                        </span>
                      )}
                      {topPawnId && (
                        <button
                          type="button"
                          onClick={() => {
                            const owner = gameState.players.find((player) =>
                              player.pawns.some((pawn) => pawn.id === topPawnId),
                            )
                            const pawn = owner?.pawns.find((item) => item.id === topPawnId)
                            if (!owner || !pawn) return
                            if (!canClickPawnNow || owner.id !== activePlayer.id) return
                            handlePawnClick(owner, pawn)
                          }}
                          className="absolute inset-0 h-full w-full"
                          disabled={!canClickPawnNow || pawnIdToOwnerColor.get(topPawnId) !== activePlayer.color}
                        >
                          <img
                            src={pawnIdToIcon.get(topPawnId)}
                            alt={topPawnId}
                            className={`h-full w-full object-cover transition hover:scale-[1.02] ${
                          pawnIdToOwnerColor.get(topPawnId) === activePlayer.color
                            ? 'scale-[1.03]'
                            : 'brightness-[0.38] saturate-[0.55]'
                            }`}
                            style={{
                              boxShadow:
                                pawnIdToOwnerColor.get(topPawnId) === activePlayer.color
                                  ? `inset 0 0 0 2px ${pawnIdToOwnerColor.get(topPawnId) ?? '#ffffff'}, 0 0 18px ${
                                      pawnIdToOwnerColor.get(topPawnId) ?? '#ffffff'
                                    }`
                                  : `inset 0 0 0 2px ${pawnIdToOwnerColor.get(topPawnId) ?? '#ffffff'}, 0 0 10px ${
                                      pawnIdToOwnerColor.get(topPawnId) ?? '#ffffff'
                                    }`,
                            }}
                          />
                        </button>
                      )}
                      {pawnsOnCell.length > 1 && (
                        <span className="absolute bottom-0.5 left-1 rounded bg-slate-950/75 px-1 text-[9px] font-semibold text-white">
                          x{pawnsOnCell.length}
                        </span>
                      )}
                    </>
                  ) : homePawn && homePawn.position === null && animatedPawnPositions[homePawn.id] === undefined ? (
                    <button
                      type="button"
                      onClick={() => {
                        const owner = gameState.players.find((player) => player.id === homePawn.ownerId)
                        if (!owner) return
                        if (!canClickPawnNow || owner.id !== activePlayer.id) return
                        handlePawnClick(owner, homePawn)
                      }}
                      className="h-full w-full"
                      disabled={!canClickPawnNow || homePawn.ownerId !== activePlayer.id}
                    >
                      <img
                        src={pawnIconByLevel[ownerIdToHomeLevel.get(homePawn.ownerId) ?? homePawn.level]}
                        alt={homePawn.id}
                        className={`h-full w-full object-cover transition hover:scale-[1.02] ${
                          homePawn.ownerId === activePlayer.id ? 'scale-[1.03]' : 'brightness-[0.38] saturate-[0.55]'
                        }`}
                        style={{
                          boxShadow:
                            homePawn.ownerId === activePlayer.id
                              ? `inset 0 0 0 2px ${ownerIdToColor.get(homePawn.ownerId) ?? '#ffffff'}, 0 0 20px ${
                                  ownerIdToColor.get(homePawn.ownerId) ?? '#ffffff'
                                }`
                              : `inset 0 0 0 2px ${ownerIdToColor.get(homePawn.ownerId) ?? '#ffffff'}, 0 0 12px ${
                                  ownerIdToColor.get(homePawn.ownerId) ?? '#ffffff'
                                }`,
                        }}
                      />
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="rounded bg-slate-700 px-2 py-1">Ô thường</span>
            <span className="tile-chance rounded px-2 py-1 text-cyan-100">Chance</span>
            <span className="tile-challenge rounded px-2 py-1 text-fuchsia-100">Challenge</span>
          </div>
        </section>
      </div>

      {eventDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Su kien o dac biet</p>
                <h2
                  className={`mt-1 text-2xl font-bold ${
                    eventDialog.type === 'chance' ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {eventDialog.type === 'chance' ? 'CO HOI' : 'THACH THUC'}
                </h2>
              </div>
              <span
                className={`event-dialog-badge rounded-full px-3 py-1 text-sm font-semibold ${
                  eventDialog.type === 'chance'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                O {eventDialog.tileIndex + 1}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-200">
              <span className="font-semibold">{eventDialog.playerName}</span> vua di vao o{' '}
              <span className={eventDialog.type === 'chance' ? 'text-emerald-300' : 'text-amber-300'}>
                {eventDialog.type === 'chance' ? 'Co hoi' : 'Thach thuc'}
              </span>
              .
            </p>

            {eventDialog.type === 'chance' ? (
              <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                {eventDialog.chanceText}
              </p>
            ) : eventDialog.challenge ? (
              <div className="mt-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {(() => {
                  const challenge = eventDialog.challenge
                  return (
                    <>
                <p className="rounded-lg bg-slate-900/50 px-3 py-2 text-xs text-amber-100">
                  Thoi gian con lai: <span className="font-bold">{challengeTimeLeft}s</span>
                </p>
                <p className="font-semibold">
                  Cau {challenge.id}: {challenge.question}
                </p>
                {(['A', 'B', 'C', 'D'] as const).map((choice) => {
                  const isPicked = challengeChoice === choice
                  const isCorrectAnswer = challenge.answer === choice
                  const showCorrect = challengeSubmitted && isCorrectAnswer
                  const showWrongPicked = challengeSubmitted && isPicked && !isCorrectAnswer
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        if (challengeSubmitted) return
                        setChallengeChoice(choice)
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        showCorrect
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                          : showWrongPicked
                            ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                            : isPicked
                              ? 'border-amber-300 bg-amber-500/20'
                              : 'border-white/15 bg-slate-900/40 hover:bg-slate-900/70'
                      }`}
                    >
                      <span className="font-semibold">{choice}.</span> {challenge.options[choice]}
                    </button>
                  )
                })}
                {!challengeSubmitted ? (
                  <button
                    type="button"
                    onClick={() => {
                      setChallengeSubmitted(true)
                      const isCorrect = challengeChoice === challenge.answer
                      setSnackbar({
                        message: isCorrect
                          ? 'Chuc mung! Ban duoc tung xuc xac tiep.'
                          : `Chia buon! Sai dap an, dap an dung la ${challenge.answer}.`,
                        tone: isCorrect ? 'success' : 'error',
                      })
                      setEventDialog(null)
                      setChallengeChoice(null)
                      if (!isCorrect) {
                        setGameState((state) => moveToNextTurn(state))
                      }
                    }}
                    disabled={!challengeChoice}
                    className="mt-1 w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    Xac nhan dap an
                  </button>
                ) : (
                  <p className="rounded-lg bg-slate-800/80 px-3 py-2 text-sm">Dang xu ly ket qua...</p>
                )}
                    </>
                  )
                })()}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Chua co noi dung thach thuc.
              </p>
            )}

            {eventDialog.type === 'chance' && (
              <button
                onClick={() => {
                  setEventDialog(null)
                  setChallengeChoice(null)
                  setChallengeSubmitted(false)
                }}
                className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Dong
              </button>
            )}
          </div>
        </div>
      )}

      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2">
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-xl ${
              snackbar.tone === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {snackbar.message}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
