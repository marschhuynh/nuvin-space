import type { Key } from './types.js';

export type ParseResult = {
  input: string;
  key: Key;
};

let kittyProtocolEnabled = false;

export function setKittyProtocolEnabled(enabled: boolean): void {
  kittyProtocolEnabled = enabled;
}

export function isKittyProtocolEnabled(): boolean {
  return kittyProtocolEnabled;
}

const createEmptyKey = (): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
});

const keyName: Record<string, string> = {
  OP: 'f1',
  OQ: 'f2',
  OR: 'f3',
  OS: 'f4',
  '[11~': 'f1',
  '[12~': 'f2',
  '[13~': 'f3',
  '[14~': 'f4',
  '[[A': 'f1',
  '[[B': 'f2',
  '[[C': 'f3',
  '[[D': 'f4',
  '[[E': 'f5',
  '[15~': 'f5',
  '[17~': 'f6',
  '[18~': 'f7',
  '[19~': 'f8',
  '[20~': 'f9',
  '[21~': 'f10',
  '[23~': 'f11',
  '[24~': 'f12',
  '[A': 'up',
  '[B': 'down',
  '[C': 'right',
  '[D': 'left',
  '[E': 'clear',
  '[F': 'end',
  '[H': 'home',
  OA: 'up',
  OB: 'down',
  OC: 'right',
  OD: 'left',
  OE: 'clear',
  OF: 'end',
  OH: 'home',
  '[1~': 'home',
  '[2~': 'insert',
  '[3~': 'delete',
  '[4~': 'end',
  '[5~': 'pageup',
  '[6~': 'pagedown',
  '[[5~': 'pageup',
  '[[6~': 'pagedown',
  '[7~': 'home',
  '[8~': 'end',
  '[a': 'up',
  '[b': 'down',
  '[c': 'right',
  '[d': 'left',
  '[e': 'clear',
  '[2$': 'insert',
  '[3$': 'delete',
  '[5$': 'pageup',
  '[6$': 'pagedown',
  '[7$': 'home',
  '[8$': 'end',
  Oa: 'up',
  Ob: 'down',
  Oc: 'right',
  Od: 'left',
  Oe: 'clear',
  '[2^': 'insert',
  '[3^': 'delete',
  '[5^': 'pageup',
  '[6^': 'pagedown',
  '[7^': 'home',
  '[8^': 'end',
  '[Z': 'tab',
};

export const nonAlphanumericKeys = [...Object.values(keyName), 'backspace', 'return'];

const isShiftKey = (code: string) => {
  return ['[a', '[b', '[c', '[d', '[e', '[2$', '[3$', '[5$', '[6$', '[7$', '[8$', '[Z'].includes(code);
};

const isCtrlKey = (code: string) => {
  return ['Oa', 'Ob', 'Oc', 'Od', 'Oe', '[2^', '[3^', '[5^', '[6^', '[7^', '[8^'].includes(code);
};

const metaKeyCodeRe = /^(?:\x1b)([a-zA-Z0-9])$/;
const fnKeyRe = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

const KITTY_CSI_U_RE = /^\x1b\[(\d+)(?:;(\d+))?u$/;

const KITTY_KEYCODE_MAP: Record<number, keyof Key> = {
  9: 'tab',
  13: 'return',
  27: 'escape',
  127: 'backspace',
};

function parseKittyProtocol(data: string): ParseResult | null {
  const match = KITTY_CSI_U_RE.exec(data);
  if (!match) return null;

  const keycode = parseInt(match[1]!, 10);
  const modifierValue = match[2] ? parseInt(match[2], 10) - 1 : 0;

  const key = createEmptyKey();

  key.shift = !!(modifierValue & 1);
  key.meta = !!(modifierValue & 2);
  key.ctrl = !!(modifierValue & 4);

  const keyProp = KITTY_KEYCODE_MAP[keycode];
  if (keyProp) {
    key[keyProp] = true;
  }

  // Shift+Enter -> newline character (for multiline input)
  if (keycode === 13 && key.shift) {
    return { input: '\n', key: createEmptyKey() };
  }

  let input = '';
  if (keycode >= 32 && keycode <= 126) {
    input = String.fromCharCode(keycode);
  }

  return { input, key };
}

export const parseKeypress = (data: string): ParseResult => {
  if (kittyProtocolEnabled) {
    const kittyResult = parseKittyProtocol(data);
    if (kittyResult) return kittyResult;
  }

  let parts: RegExpExecArray | null;
  const s = data;

  const key = createEmptyKey();

  if (s === '\r') {
    key.return = true;
    return { input: '', key };
  } else if (s === '\n') {
    return { input: '\n', key };
  } else if (s === '\t') {
    key.tab = true;
    return { input: '', key };
  } else if (s === '\b' || s === '\x1b\b') {
    key.backspace = true;
    key.meta = s.charAt(0) === '\x1b';
    return { input: '', key };
  } else if (s === '\x7f' || s === '\x1b\x7f') {
    key.delete = true;
    key.meta = s.charAt(0) === '\x1b';
    return { input: '', key };
  } else if (s === '\x1b' || s === '\x1b\x1b') {
    key.escape = true;
    key.meta = s.length === 2;
    return { input: '', key };
  } else if (s === ' ' || s === '\x1b ') {
    key.meta = s.length === 2;
    return { input: ' ', key };
  } else if (s.length === 1 && s <= '\x1a') {
    key.ctrl = true;
    const name = String.fromCharCode(s.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
    return { input: name, key };
  } else if (s.length === 1 && s >= '0' && s <= '9') {
    return { input: s, key };
  } else if (s.length === 1 && s >= 'a' && s <= 'z') {
    return { input: s, key };
  } else if (s.length === 1 && s >= 'A' && s <= 'Z') {
    key.shift = true;
    return { input: s.toLowerCase(), key };
  } else if ((parts = metaKeyCodeRe.exec(s))) {
    key.meta = true;
    key.shift = /^[A-Z]$/.test(parts[1]);
    return { input: parts[1]!.toLowerCase(), key };
  } else if (s.startsWith('\x1b[200~') || s.startsWith('[200~')) {
    return { input: data, key };
  } else if ((parts = fnKeyRe.exec(s))) {
    const segs = [...s];

    if (segs[0] === '\u001b' && segs[1] === '\u001b') {
      key.meta = true;
    }

    const code = [parts[1], parts[2], parts[4], parts[6]].filter(Boolean).join('');
    const modifier = ((parts[3] || parts[5] || 1) as unknown as number) - 1;

    key.ctrl = !!(modifier & 4);
    key.meta = key.meta || !!(modifier & 10);
    key.shift = !!(modifier & 1);

    const name = keyName[code] || '';
    key.shift = isShiftKey(code) || key.shift;
    key.ctrl = isCtrlKey(code) || key.ctrl;

    if (name === 'up') key.upArrow = true;
    else if (name === 'down') key.downArrow = true;
    else if (name === 'left') key.leftArrow = true;
    else if (name === 'right') key.rightArrow = true;
    else if (name === 'pageup') key.pageUp = true;
    else if (name === 'pagedown') key.pageDown = true;
    else if (name === 'return') key.return = true;
    else if (name === 'escape') key.escape = true;
    else if (name === 'tab') key.tab = true;
    else if (name === 'backspace') key.backspace = true;
    else if (name === 'delete') key.delete = true;

    const input = key.ctrl ? name : '';
    return { input, key };
  }

  return { input: data, key: createEmptyKey() };
};
