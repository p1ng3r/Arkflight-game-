import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/foundry/arkflight.js", import.meta.url), "utf8");

test("GM Event opener broadcasts the Event Board to player clients", () => {
  assert.match(source, /const OPEN_EVENT_BOARD = "open-event-board"/);
  assert.match(source, /function broadcastEventBoardOpen/);
  assert.match(source, /game\.socket\?\.emit\?\.\(SOCKET, \{ type: OPEN_EVENT_BOARD/);
  assert.match(source, /game\.socket\?\.on\?\.\(SOCKET, handleEventBoardSocket\)/);
  assert.match(source, /if \(payload\?\.type !== OPEN_EVENT_BOARD \|\| game\.user\?\.isGM\) return/);
  assert.match(source, /setTimeout\(\(\) => renderBoard\(\), 50\)/);
});

test("launching or reopening an active Event broadcasts the player opener", () => {
  assert.match(source, /await controller\.openEvent\(eventId\)[\s\S]*?broadcastEventBoardOpen\(eventId\)/);
  assert.match(source, /if \(game\.user\.isGM\) broadcastEventBoardOpen\(controller\.state\.eventId\)/);
});
