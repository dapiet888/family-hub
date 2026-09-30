# Family Hub

Kitchen board for one household: today, week, and month, plus shopping and chores.

- Google Calendar shows alongside events saved on this screen.
- Events can remind you before they start and tag someone.
- Shopping keeps a household catalogue. Usual items stay on the surface; the rest appear as you type. New items you add are remembered. **Last list** reloads the shop you just cleared.

```bash
npm install
npm run dev
```

Open the app on port 8080. Lists and local events stay in the browser until a later sync.

## Skyler bridge

Pete's private assistant squad (Skyler HQ) keeps the family calendar and
lists current through a bridge that has no public API:

- `src/lib/bridge/sync.ts` runs every five minutes (`triggers.crons`). It
  reads pending rows from the D1 database `skyler-bridge` (binding `BRIDGE`,
  table `drops`, payload in the same JSON shape as "Drop a check"), adds the
  new events and open list items to the household board, marks each drop
  `applied` or `failed` with a plain note, and writes a copy of the board to
  the `snapshot` table (Google feed links stripped).
- Drops can only add. They never delete, edit, or change people, feeds, theme
  or the house name. Duplicates (same title and start, or the same open item)
  are skipped, so a drop applied twice is harmless.
- The squad reads and writes D1 with Pete's own Cloudflare account. The
  household board is addressed by the Worker secret `FAMILY_CODE` (the code
  shown in Settings, Family sync); until it is set the bridge only logs.
- `bridge_log` keeps the last 200 lines of what the bridge did.

