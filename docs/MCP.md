# MCP Integration Guide (Frontend)

Tai lieu nay danh cho MCP client/agent thao tac Frontend (React + Vite) cua game-ludo.

## 1) Chay Frontend

```bash
cd frontend
npm install
npm run dev
```

Mac dinh Vite chay tai `http://localhost:5173`.

## 2) Bien moi truong FE

Frontend nen goi backend qua env de de doi local/prod:

```env
VITE_API_BASE_URL=http://localhost:4000
```

Khi deploy:

```env
VITE_API_BASE_URL=https://<your-backend-domain>
```

## 3) Data va man hinh hien tai

- App chinh: `src/App.tsx`
- Challenge JSON local: `src/data/challenge-questions.json`
- FE dang co cac page state:
  - `room` (chon phong)
  - `lobby` (slot/ready)
  - `game` (ban co + dice)

## 4) Backend API FE can goi

Tat ca endpoint co prefix `/api`:

- `GET /api/status`
- `GET /api/db-status`
- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/slots/:slotId/join`
- `POST /api/rooms/:roomId/slots/:slotId/leave`
- `POST /api/rooms/:roomId/slots/:slotId/ready`
- `POST /api/rooms/:roomId/start`
- `POST /api/rooms/:roomId/roll-dice`
- `GET /api/challenges?limit=20`
- `GET /api/challenges/random`

## 5) MCP tasks de tu dong hoa FE

Neu MCP agent thao tac code FE, flow khuyen nghi:

1. Tao `src/services/api.ts`:
   - `baseUrl = import.meta.env.VITE_API_BASE_URL`
   - helper `getJson/postJson`
2. Tao `src/services/roomApi.ts`:
   - map tung endpoint room/challenge.
3. Refactor `App.tsx`:
   - load rooms tu API thay vi hardcode.
   - create room/join/ready/start/roll goi API that.
4. Xu ly state:
   - loading, error, retry, empty states.
5. Optional:
   - socket realtime cho room updates.

## 6) Response/error format can xu ly

Backend loi theo format:

```json
{ "message": "ROOM_NOT_FOUND" }
```

FE nen map message -> thong bao than thien:
- `ROOM_NOT_FOUND` -> "Khong tim thay phong"
- `SLOT_OCCUPIED` -> "Slot da co nguoi"
- `ALL_PLAYERS_MUST_READY` -> "Tat ca nguoi choi phai san sang"

## 7) Checklist verify cho MCP

- `npm run build` pass.
- Tao phong moi duoc tu UI.
- Join/Leave/Ready cap nhat dung.
- Start game chi cho phep khi >= 2 nguoi va da ready.
- Roll dice tra ve gia tri 1..6.
- Challenge random tra ve du lieu hop le.

## 8) Muc tieu tiep theo (goi y)

- Tach component:
  - `RoomPage.tsx`
  - `LobbyPage.tsx`
  - `GamePage.tsx`
- Them global state (Zustand/Redux) neu room logic mo rong.
- Them E2E test (Playwright) cho flow tao phong -> vao game.
