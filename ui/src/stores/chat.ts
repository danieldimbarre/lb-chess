import { reactive } from 'vue';
import type { ChatMessage, GameSnapshot } from '../types';

/**
 * The conversation with the current opponent. Memory only: the server relays messages
 * without keeping them, so closing the app or playing someone else clears it for good.
 */
export const chat = reactive({
  gameId: '',
  /** Who the conversation is with: it carries over to the next game against the same player. */
  opponent: '',
  messages: [] as ChatMessage[],
  unread: 0,
  /** Chat sheet visible: incoming messages don't count as unread. */
  visible: false,
});

let uid = 0;
export const nextUid = () => ++uid;

export function resetChat(gameId = '', opponent = '') {
  chat.gameId = gameId;
  chat.opponent = opponent;
  chat.messages = [];
  chat.unread = 0;
  chat.visible = false;
}

/**
 * Points the chat at a (new) game. Same opponent with the chat still open: keep the
 * conversation and mark where the new game starts. Anything else starts empty.
 */
export function chatForGame(g: GameSnapshot | null) {
  if (!g) return resetChat();
  if (g.id === chat.gameId) return;
  const opponent = g.myColor === 'w' ? g.black.username : g.white.username;
  if (g.chat?.status === 'open' && opponent === chat.opponent && chat.messages.length) {
    chat.gameId = g.id;
    chat.visible = false;
    chat.messages.push({ uid: nextUid(), from: g.myColor, text: '', at: Date.now(), system: 'newGame' });
    return;
  }
  resetChat(g.id, opponent);
}
