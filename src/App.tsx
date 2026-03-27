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
  travelSteps: number
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

type MoveTarget = {
  pawnId: string
  steps: number
  destinationIndex: number | null
  destinationGoalLaneIndex: number | null
}

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
      travelSteps: 0,
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

function getGoalLaneCoord(playerId: string, laneIndex: number): { row: number; col: number } | null {
  if (laneIndex < 0 || laneIndex > 5) return null
  if (playerId === 'P1') return { row: 7, col: 1 + laneIndex }
  if (playerId === 'P2') return { row: 1 + laneIndex, col: 7 }
  if (playerId === 'P3') return { row: 7, col: 13 - laneIndex }
  if (playerId === 'P4') return { row: 13 - laneIndex, col: 7 }
  return null
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
  const [pendingMoveTargets, setPendingMoveTargets] = useState<MoveTarget[]>([])
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
  const movablePawnIds = useMemo(() => {
    if (pendingDice === null || !!eventDialog || rollingDice || isAnimatingMove) return new Set<string>()
    const active = gameState.players[gameState.currentPlayerIndex]
    return new Set(
      active.pawns
        .filter((pawn) => canPawnActWithDice(pawn, pendingDice))
        .map((pawn) => pawn.id),
    )
  }, [pendingDice, eventDialog, rollingDice, isAnimatingMove, gameState.players, gameState.currentPlayerIndex])

  const selectedPawnId = selectedPawnByPlayer[activePlayer.id] ?? activePlayer.pawns[0]?.id ?? ''
  const canClickPawnNow = pendingDice !== null && !rollingDice && !eventDialog && !isAnimatingMove
  const shouldUseMovableHighlight = pendingDice !== null && !rollingDice && !eventDialog && !isAnimatingMove

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
            message: 'Chia buồn! Hết thời gian trả lời.',
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

  function getStepOptionsForPawn(pawn: Pawn, dice: number): number[] {
    if (pawn.position === null) return [dice]
    return Array.from(new Set([dice, dice * pawn.level])).sort((a, b) => a - b)
  }

  function getPawnAtTrackIndex(index: number, excludePawnId?: string): { owner: Player; pawn: Pawn } | null {
    for (const player of gameState.players) {
      for (const pawn of player.pawns) {
        if (pawn.id === excludePawnId) continue
        if (pawn.position === index) return { owner: player, pawn }
      }
    }
    return null
  }

  function evaluateMoveOption(player: Player, pawn: Pawn, steps: number) {
    if (steps <= 0) return { valid: false as const, reason: 'Số bước không hợp lệ.' }
    const deployMove = pawn.position === null
    if (deployMove && pendingDice !== 1 && pendingDice !== 6) {
      return { valid: false as const, reason: 'Cần xúc xắc 1 hoặc 6 để xuất quân.' }
    }

    const baseTravel = deployMove ? 0 : pawn.travelSteps
    const targetTravel = baseTravel + steps
    if (targetTravel > trackPath.length + 6) {
      return { valid: false as const, reason: 'Vượt quá đích đến trong lane.' }
    }

    for (let inc = 1; inc <= steps; inc += 1) {
      const currentTravel = baseTravel + inc
      const isDestinationStep = inc === steps
      const onTrack = currentTravel <= trackPath.length
      if (onTrack) {
        const trackIndex = (player.startIndex + currentTravel) % trackPath.length
        const occupant = getPawnAtTrackIndex(trackIndex, pawn.id)
        if (!occupant) continue
        if (!isDestinationStep) {
          return { valid: false as const, reason: 'Bị chặn bởi quân phía trước.' }
        }
        if (occupant.owner.id === player.id) {
          return { valid: false as const, reason: 'Ô đích đã có quân cùng đội.' }
        }
        if (occupant.pawn.shieldTurns > 0) {
          return { valid: false as const, reason: 'Quân đối thủ đang được bảo hộ.' }
        }
        if (pawn.level < occupant.pawn.level) {
          return { valid: false as const, reason: 'Không đủ cấp để cạnh tranh đào thải.' }
        }
      } else {
        const laneIndex = currentTravel - trackPath.length - 1
        const occupant = gameState.players
          .flatMap((item) => item.pawns)
          .find((item) => item.id !== pawn.id && item.ownerId === player.id && item.inGoalLaneIndex === laneIndex)
        if (occupant) {
          return { valid: false as const, reason: 'Lane đích đã có quân của bạn.' }
        }
      }
    }

    const destinationOnTrack = targetTravel <= trackPath.length
    if (destinationOnTrack) {
      const destinationIndex = (player.startIndex + targetTravel) % trackPath.length
      return {
        valid: true as const,
        steps,
        destinationIndex,
        destinationGoalLaneIndex: null as number | null,
        targetTravel,
      }
    }

    return {
      valid: true as const,
      steps,
      destinationIndex: null as number | null,
      destinationGoalLaneIndex: targetTravel - trackPath.length - 1,
      targetTravel,
    }
  }

  function canPawnActWithDice(pawn: Pawn, dice: number | null) {
    if (!dice) return false
    return getStepOptionsForPawn(pawn, dice).some((steps) => evaluateMoveOption(activePlayer, pawn, steps).valid)
  }

  const rollDice = () => {
    if (rollingDice || !!eventDialog || pendingDice !== null || isAnimatingMove) return
    setRollingDice(true)
    setPendingMoveTargets([])
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

  const applyPawnMove = (pawnId: string, selectedSteps: number) => {
    if (pendingDice === null || rollingDice || !!eventDialog || isAnimatingMove) return

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    const pawnToMove = currentPlayer.pawns.find((pawn) => pawn.id === pawnId)
    if (!pawnToMove) return

    const isDeployMove = pawnToMove.position === null
    const canDeploy = pendingDice === 1 || pendingDice === 6
    if (isDeployMove && !canDeploy) return
    if (!getStepOptionsForPawn(pawnToMove, pendingDice).includes(selectedSteps)) {
      setSnackbar({
        message: 'Số bước di chuyển không hợp lệ.',
        tone: 'error',
      })
      return
    }
    const evaluatedMove = evaluateMoveOption(currentPlayer, pawnToMove, selectedSteps)
    if (!evaluatedMove.valid) {
      setSnackbar({
        message: evaluatedMove.reason ?? 'Nước đi không hợp lệ.',
        tone: 'error',
      })
      return
    }

    const rolledValue = pendingDice
    const baseTravel = isDeployMove ? 0 : pawnToMove.travelSteps
    const travelPath = Array.from({ length: selectedSteps }, (_, step) => {
      const stepTravel = baseTravel + step + 1
      return stepTravel <= trackPath.length ? (currentPlayer.startIndex + stepTravel) % trackPath.length : null
    })
    const destinationIndex = evaluatedMove.destinationIndex
    const destinationGoalLaneIndex = evaluatedMove.destinationGoalLaneIndex

    setIsAnimatingMove(true)
    let frame = 0

    const playStep = () => {
      const nextIndex = travelPath[frame]
      if (nextIndex !== null) {
        setAnimatedPawnPositions((prev) => ({ ...prev, [pawnId]: nextIndex }))
      }
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
          const originTravelSteps = nextPawns[pawnIndex].travelSteps
          const originGoalLaneIndex = nextPawns[pawnIndex].inGoalLaneIndex
          nextPawns[pawnIndex] = {
            ...nextPawns[pawnIndex],
            level: isDeployMove ? nextActive.homeBase.level : nextPawns[pawnIndex].level,
            position: destinationIndex,
            travelSteps: evaluatedMove.targetTravel,
            inGoalLaneIndex: destinationGoalLaneIndex,
            isActive: true,
          }
          nextActive.pawns = nextPawns
          nextPlayers[playerIndex] = nextActive

          // One-cell rule + elimination condition:
          // only capture when moved pawn level >= defender level and exact landing.
          let moveBlocked = false
          const defenderInfo = nextPlayers
            .flatMap((player, idx) =>
              idx === playerIndex
                ? []
                : player.pawns
                    .filter((pawn) => destinationIndex !== null && pawn.position === destinationIndex)
                    .map((pawn) => ({ player, idx, pawn })),
            )
            .at(0)

          if (defenderInfo) {
            if (defenderInfo.pawn.shieldTurns > 0) {
              const updatedDefenderPawns = defenderInfo.player.pawns.map((pawn) =>
                pawn.id === defenderInfo.pawn.id ? { ...pawn, shieldTurns: pawn.shieldTurns - 1 } : pawn,
              )
              nextPlayers[defenderInfo.idx] = { ...defenderInfo.player, pawns: updatedDefenderPawns }
              moveBlocked = true
              setSnackbar({
                message: 'Quân đối thủ được bảo hộ, không thể đào thải.',
                tone: 'error',
              })
            } else if (nextPawns[pawnIndex].level >= defenderInfo.pawn.level) {
              const updatedDefenderPawns = defenderInfo.player.pawns.map((pawn) =>
                pawn.id === defenderInfo.pawn.id
                  ? { ...pawn, position: null, inGoalLaneIndex: null, isActive: false }
                  : pawn,
              )
              nextPlayers[defenderInfo.idx] = { ...defenderInfo.player, pawns: updatedDefenderPawns }
              setSnackbar({
                message: 'Cạnh tranh đào thải thành công!',
                tone: 'success',
              })
            } else {
              moveBlocked = true
              setSnackbar({
                message: 'Không đủ cấp để đào thải quân đối thủ.',
                tone: 'error',
              })
            }
          }

          if (moveBlocked) {
            nextPawns[pawnIndex] = {
              ...nextPawns[pawnIndex],
              position: originIndex,
              travelSteps: originTravelSteps,
              inGoalLaneIndex: originGoalLaneIndex,
              isActive: originIndex !== null || originGoalLaneIndex !== null,
            }
            nextActive.pawns = nextPawns
            nextPlayers[playerIndex] = nextActive
          }

          const tileType = destinationIndex !== null ? getTileTypeByTrackIndex(destinationIndex) : 'normal'
          if (!moveBlocked && destinationIndex !== null && (tileType === 'chance' || tileType === 'challenge')) {
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
                    ? `Nhà chính tăng lên Lv.${upgradedLevel}.`
                    : `Nhà chính đã đạt cấp tối đa Lv.${currentLevel}.`
              } else if (chanceCard.id === 'pawn-upgrade') {
                const movedPawn = nextActive.pawns[pawnIndex]
                const upgradedLevel = Math.min(4, movedPawn.level + 1) as PawnLevel
                nextActive.pawns[pawnIndex] = { ...movedPawn, level: upgradedLevel }
                nextPlayers[playerIndex] = { ...nextActive, pawns: [...nextActive.pawns] }
                chanceText +=
                  upgradedLevel > movedPawn.level
                    ? `${movedPawn.id} tăng lên Lv.${upgradedLevel}.`
                    : `${movedPawn.id} đã ở cấp tối đa Lv.${movedPawn.level}.`
              } else if (chanceCard.id === 'competition-win') {
                let affectedText = 'Không có mục tiêu để hạ cấp.'
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
                      affectedText = `${enemy.name} đã chặn hạ cấp bằng thẻ bảo hộ.`
                    } else {
                      const updatedPawns = [...enemy.pawns]
                      updatedPawns[strongestPawnIndex] = {
                        ...targetPawn,
                        level: Math.max(1, targetPawn.level - 1) as PawnLevel,
                      }
                      nextPlayers[idx] = { ...enemy, pawns: updatedPawns }
                      affectedText = `${enemy.name} bị hạ cấp ${targetPawn.id} xuống Lv.${updatedPawns[strongestPawnIndex].level}.`
                    }
                    enemyChanged = true
                  } else if (enemy.homeBase.level > 1) {
                    if (enemy.homeBase.shieldCharges > 0) {
                      nextPlayers[idx] = {
                        ...enemy,
                        homeBase: { ...enemy.homeBase, shieldCharges: enemy.homeBase.shieldCharges - 1 },
                      }
                      affectedText = `${enemy.name} đã chặn hạ cấp nhà chính bằng thẻ bảo hộ.`
                    } else {
                      nextPlayers[idx] = {
                        ...enemy,
                        homeBase: { ...enemy.homeBase, level: Math.max(1, enemy.homeBase.level - 1) as PawnLevel },
                      }
                      affectedText = `${enemy.name} bị hạ cấp Nhà chính xuống Lv.${nextPlayers[idx].homeBase.level}.`
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
                  chanceText += `${movedPawn.id} nhận 1 thẻ bảo hộ (1 lần).`
                } else {
                  nextActive.homeBase = { ...nextActive.homeBase, shieldCharges: nextActive.homeBase.shieldCharges + 1 }
                  nextPlayers[playerIndex] = { ...nextActive }
                  chanceText += 'Nhà chính nhận 1 thẻ bảo hộ (1 lần).'
                }
              } else if (chanceCard.id === 'fdi-capital') {
                const spawnPawnIndex = nextActive.pawns.findIndex((pawn) => pawn.position === null)
                if (spawnPawnIndex < 0) {
                  chanceText += 'Không còn quân trong nhà để ra thêm.'
                } else {
                  const ownOccupyStart = nextActive.pawns.some(
                    (pawn, idx) => idx !== spawnPawnIndex && pawn.position === nextActive.startIndex,
                  )
                  if (ownOccupyStart) {
                    chanceText += 'Điểm xuất phát đang có quân của bạn, chưa thể ra thêm.'
                  } else {
                    const spawnedPawns = [...nextActive.pawns]
                    spawnedPawns[spawnPawnIndex] = {
                      ...spawnedPawns[spawnPawnIndex],
                      level: nextActive.homeBase.level,
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
                    chanceText += `${spawnedPawns[spawnPawnIndex].id} đã được ra quân ngay.`
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
        setPendingMoveTargets([])
        setIsAnimatingMove(false)
      }, 130)
    }

    playStep()
  }

  const handlePawnClick = (player: Player, pawn: Pawn) => {
    if (player.id !== activePlayer.id || !!eventDialog || rollingDice || isAnimatingMove) return

    setSelectedPawnByPlayer((prev) => ({ ...prev, [player.id]: pawn.id }))

    if (pendingDice !== null) {
      setPendingMoveTargets([])
      const validTargets = getStepOptionsForPawn(pawn, pendingDice)
        .map((steps) => {
          const evaluated = evaluateMoveOption(player, pawn, steps)
          if (!evaluated.valid) return null
          return {
            pawnId: pawn.id,
            steps,
            destinationIndex: evaluated.destinationIndex,
            destinationGoalLaneIndex: evaluated.destinationGoalLaneIndex,
          }
        })
        .filter((item): item is MoveTarget => item !== null)

      if (validTargets.length > 0) {
        setPendingMoveTargets(validTargets)
      } else {
        setPendingMoveTargets([])
        setSnackbar({
          message: 'Quân này không có ô đích hợp lệ.',
          tone: 'error',
        })
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl bg-slate-800 p-5 shadow-lg ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Ludo logo" className="h-10 w-10 rounded-lg object-cover" />
            <h1 className="text-2xl font-bold">Cờ Cá Ngựa 4.0</h1>
          </div>
          <p className="mt-1 text-sm text-slate-300">Đang chạy chế độ chơi nhanh: bỏ qua phòng và vị trí chờ.</p>

          <div className="mt-5 space-y-3 rounded-xl bg-slate-700/60 p-4">
            <p className="text-sm">
              Lượt hiện tại: <span className="font-semibold">{activePlayer.name}</span>
            </p>
            <p className="text-sm">Vòng: {gameState.turn}</p>
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/80 p-2">
              <Dice value={gameState.diceValue} rolling={rollingDice} />
              <div>
                <p className="text-xs text-slate-300">Xúc xắc</p>
                <p className="text-lg font-bold">{gameState.diceValue}</p>
              </div>
            </div>
            {pendingDice !== null && (
              <p className="rounded-lg border border-indigo-400/50 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                Đã ra <span className="font-semibold">{pendingDice}</span>. Chọn quân, sau đó chọn ô đích sáng trên bàn cờ
                (ra quân cần 1 hoặc 6; quân cấp cao có thể đi theo bội số cấp).
              </p>
            )}
            <button
              onClick={rollDice}
              disabled={rollingDice || !!eventDialog || pendingDice !== null || isAnimatingMove}
              className="mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-700"
            >
              {rollingDice ? 'Đang tung...' : 'Tung xúc xắc'}
            </button>
          </div>

          <section className="mt-5 space-y-3">
            {gameState.players.map((player) => (
              <div key={player.id} className="rounded-xl bg-slate-700/50 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: player.color }}>
                    {player.name}
                  </p>
                  <span className="text-xs">Nhà chính Lv.{player.homeBase.level}</span>
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
                          shouldUseMovableHighlight
                            ? movablePawnIds.has(pawn.id)
                              ? 'scale-110'
                              : 'brightness-50 saturate-50'
                            : player.id === activePlayer.id
                              ? 'scale-110'
                              : 'brightness-50 saturate-50'
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
                  <p className="mt-2 text-[11px] text-slate-300">
                    Bấm trực tiếp vào quân cờ để hiển thị các ô đích hợp lệ, sau đó bấm ô đích để di chuyển.
                  </p>
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
              const goalLaneCell = gameState.players
                .map((player) => ({
                  player,
                  laneIndex: (() => {
                    for (let idx = 0; idx < 6; idx += 1) {
                      const coord = getGoalLaneCoord(player.id, idx)
                      if (coord && coord.row === row && coord.col === col) return idx
                    }
                    return null
                  })(),
                }))
                .find((item) => item.laneIndex !== null)
              const moveTarget = trackInfo
                ? pendingMoveTargets.find((target) => target.destinationIndex === trackInfo.index)
                : goalLaneCell
                  ? pendingMoveTargets.find(
                      (target) =>
                        target.destinationGoalLaneIndex === goalLaneCell.laneIndex &&
                        target.pawnId.startsWith(`${goalLaneCell.player.id}-`),
                    )
                  : undefined
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
                if (moveTarget) {
                  className += ' tile-move-target'
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
                  : goalLaneCell
                    ? goalLaneCell.player.pawns
                        .filter((pawn) => pawn.inGoalLaneIndex === goalLaneCell.laneIndex)
                        .map((pawn) => pawn.id)
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
                  {trackInfo || goalLaneCell ? (
                    <>
                      {trackInfo && (
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
                            <span
                              className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${
                                startOwner ? startCellTextClass : ''
                              }`}
                            >
                              S
                            </span>
                          )}
                        </>
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
                              shouldUseMovableHighlight
                                ? movablePawnIds.has(topPawnId)
                                  ? 'scale-[1.03]'
                                  : 'brightness-[0.38] saturate-[0.55]'
                                : pawnIdToOwnerColor.get(topPawnId) === activePlayer.color
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
                      {moveTarget && (
                        <button
                          type="button"
                          onClick={() => applyPawnMove(moveTarget.pawnId, moveTarget.steps)}
                          className="absolute inset-0 z-20 cursor-pointer"
                          aria-label={`Di chuyển ${moveTarget.steps} bước`}
                        />
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
                          shouldUseMovableHighlight
                            ? movablePawnIds.has(homePawn.id)
                              ? 'scale-[1.03]'
                              : 'brightness-[0.38] saturate-[0.55]'
                            : homePawn.ownerId === activePlayer.id
                              ? 'scale-[1.03]'
                              : 'brightness-[0.38] saturate-[0.55]'
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
            <span className="tile-chance rounded px-2 py-1 text-cyan-100">Cơ hội</span>
            <span className="tile-challenge rounded px-2 py-1 text-fuchsia-100">Thách thức</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-200">
            <span className="text-slate-400">Level quân cờ:</span>
            {([1, 2, 3, 4] as const).map((level) => (
              <span key={level} className="flex items-center gap-1 rounded bg-slate-700/70 px-2 py-1">
                <img src={pawnIconByLevel[level]} alt={`Level ${level}`} className="h-4 w-4 rounded-sm object-cover" />
                Lv.{level}
              </span>
            ))}
          </div>
        </section>
      </div>

      {eventDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Sự kiện ô đặc biệt</p>
                <h2
                  className={`mt-1 text-2xl font-bold ${
                    eventDialog.type === 'chance' ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {eventDialog.type === 'chance' ? 'CƠ HỘI' : 'THÁCH THỨC'}
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
              <span className="font-semibold">{eventDialog.playerName}</span> vừa đi vào ô{' '}
              <span className={eventDialog.type === 'chance' ? 'text-emerald-300' : 'text-amber-300'}>
                {eventDialog.type === 'chance' ? 'Cơ hội' : 'Thách thức'}
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
                  Thời gian còn lại: <span className="font-bold">{challengeTimeLeft}s</span>
                </p>
                <p className="font-semibold">
                  Câu {challenge.id}: {challenge.question}
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
                          ? 'Chúc mừng! Bạn được tung xúc xắc tiếp.'
                          : `Chia buồn! Sai đáp án, đáp án đúng là ${challenge.answer}.`,
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
                    Xác nhận đáp án
                  </button>
                ) : (
                  <p className="rounded-lg bg-slate-800/80 px-3 py-2 text-sm">Đang xử lý kết quả...</p>
                )}
                    </>
                  )
                })()}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Chưa có nội dung thách thức.
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
                Đóng
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
