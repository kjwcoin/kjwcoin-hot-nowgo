import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const MENU = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
const summary = (menuId = MENU, myLevel = 3) => ({menuId, median: 4, count: 4, provisional: false, myLevel});

function load(path, deps, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code, {exports, require(name) { assert.ok(name in deps, name); return deps[name]; }, Error, AbortController, Number, ...globals});
  return exports;
}
const spice = load('lib/hot-spice.ts', {});

function clock() {
  let now = 0, next = 0;
  const jobs = new Map();
  return {
    setTimeout(callback, delay) { const id = ++next; jobs.set(id, {callback, at: now + delay}); return id; },
    clearTimeout(id) { jobs.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, job] of [...jobs]) if (job.at <= now) { jobs.delete(id); job.callback(); }
    },
    get size() { return jobs.size; },
  };
}

// Execute the component's actual handlers and promise settlements with deterministic
// hooks and clocks. This is a request-state unit harness, not a browser/DB E2E test.
function mount(menuId = MENU) {
  const timers = clock(), slots = [], effects = [], calls = [];
  let cursor = 0, dirty = false, mounted = true, tree, lateStateWrites = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = {value: typeof initial === 'function' ? initial() : initial};
        slot.set = value => {
          if (!mounted) { lateStateWrites++; return; }
          slot.value = typeof value === 'function' ? value(slot.value) : value;
          dirty = true;
        };
        slots[index] = slot;
      }
      return [slots[index].value, slots[index].set];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= {current: initial}; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = {callback, deps};
      return slots[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) {
        slots[index]?.cleanup?.();
        const slot = {deps}; slots[index] = slot;
        effects.push(() => { slot.cleanup = effect(); });
      }
    },
  };
  const jsx = (type, props, key) => ({type, props, key});
  const module = load('components/hot-spice-rating.tsx', {
    react: hooks, 'react/jsx-runtime': {jsx, jsxs: jsx, Fragment: Symbol('fragment')},
    '@/lib/client': {ApiError, api(path, options = {}) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      calls.push({path, options, resolve, reject});
      // Intentionally ignore AbortSignal, like a stalled session preflight.
      return promise;
    }},
    '@/lib/hot-spice': spice,
  }, {setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout});
  const child = module.default({menuId});
  function render() {
    if (!mounted) return;
    cursor = 0; dirty = false; tree = child.type(child.props);
    for (const run of effects.splice(0)) run();
  }
  function nodes(node = tree) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  function text(node = tree) {
    if (Array.isArray(node)) return node.map(text).join('');
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    return typeof node === 'object' ? text(node.props?.children) : String(node);
  }
  const button = label => {
    const result = nodes().find(node => node.type === 'button' && (node.props['aria-label'] === label || text(node) === label));
    assert.ok(result, `button ${label}`); return result;
  };
  render();
  return {
    calls, timers, module, key: child.key, button, text,
    get busy() { return tree.props['aria-busy']; },
    get fieldDisabled() { return nodes().find(node => node.type === 'fieldset').props.disabled; },
    get hasLogin() { return nodes().some(node => node.type === 'a' && node.props.href.startsWith('/account/join?')); },
    get lateStateWrites() { return lateStateWrites; },
    async flush() { for (let i = 0; i < 20; i++) { await Promise.resolve(); if (dirty && mounted) render(); } },
    unmount() { mounted = false; for (const slot of slots) slot.cleanup?.(); },
  };
}

async function ready(menuId = MENU) {
  const h = mount(menuId);
  await h.flush();
  h.calls[0].resolve(summary(menuId));
  await h.flush();
  assert.equal(h.busy, false);
  h.button('매운맛 7단계').props.onClick();
  await h.flush();
  return h;
}

test('initial 401 exposes login recovery and releases the refresh control', async () => {
  const h = mount(); await h.flush();
  h.calls[0].reject(new ApiError('expired', 401)); await h.flush();
  assert.equal(h.busy, false); assert.equal(h.hasLogin, true);
  assert.equal(h.button('평가 현황 새로고침').props.disabled, false);
  h.button('평가 현황 새로고침').props.onClick(); await h.flush();
  h.calls[1].resolve(summary()); await h.flush();
  assert.equal(h.hasLogin, false); assert.equal(h.fieldDisabled, false);
});

test('12-second deadline covers a hung session preflight and ignores its late result', async () => {
  const h = mount(); await h.flush();
  assert.equal(h.module.SPICE_REQUEST_TIMEOUT_MS, 12000);
  h.timers.advance(11999); await h.flush(); assert.equal(h.busy, true);
  h.timers.advance(1); await h.flush();
  assert.equal(h.busy, false); assert.equal(h.calls[0].options.signal.aborted, true);
  assert.equal(h.button('평가 현황 새로고침').props.disabled, false);
  assert.match(h.text(), /12초 안에 평가 현황을 확인하지 못했어요/);
  h.calls[0].resolve(summary()); await h.flush();
  assert.equal(h.fieldDisabled, true); assert.equal(h.timers.size, 0);
});

test('rapid repeated clicks start one write and confirmed save survives aggregate failure', async () => {
  const h = await ready();
  const save = h.button('내 평가 저장 / 수정');
  save.props.onClick(); save.props.onClick(); await h.flush();
  assert.equal(h.calls.filter(call => call.options.method === 'POST').length, 1);
  h.calls[1].resolve({saved: true, menuId: MENU, level: 7}); await h.flush();
  assert.equal(h.calls.length, 3);
  h.calls[2].reject(new ApiError('aggregate unavailable', 503)); await h.flush();
  assert.equal(h.busy, false);
  assert.match(h.text(), /내 평가는 저장했습니다\. 집계를 확인하지 못했으니/);
  assert.equal(h.button('평가 현황 새로고침').props.disabled, false);
  assert.equal(h.timers.size, 0);
});

test('write deadline clears saving and requires readback before a new write', async () => {
  const h = await ready();
  h.button('내 평가 저장 / 수정').props.onClick(); await h.flush();
  h.timers.advance(12000); await h.flush();
  assert.equal(h.busy, false); assert.equal(h.fieldDisabled, true);
  assert.equal(h.calls[1].options.signal.aborted, true);
  assert.match(h.text(), /저장되었을 수 있으니 다시 저장하기 전에/);
  assert.equal(h.button('평가 현황 새로고침').props.disabled, false);
  h.calls[1].resolve({saved: true, menuId: MENU, level: 7}); await h.flush();
  assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 0);
});

test('a confirmed write with a timed-out aggregate stays explicitly saved', async () => {
  const h = await ready();
  h.button('내 평가 저장 / 수정').props.onClick(); await h.flush();
  h.calls[1].resolve({saved: true, menuId: MENU, level: 7}); await h.flush();
  h.timers.advance(12000); await h.flush();
  assert.equal(h.busy, false);
  assert.match(h.text(), /내 평가는 저장했습니다\. 집계를 확인하지 못했으니/);
  assert.doesNotMatch(h.text(), /저장되었을 수 있으니/);
});

test('menu keys isolate state and unmounted writes cannot update either menu', async () => {
  const old = await ready();
  old.button('내 평가 저장 / 수정').props.onClick(); await old.flush();
  old.unmount();
  const next = await ready(OTHER);
  assert.equal(old.key, MENU); assert.equal(next.key, OTHER);
  assert.equal(old.calls[1].options.signal.aborted, true);
  old.calls[1].resolve({saved: true, menuId: MENU, level: 7}); await old.flush();
  assert.equal(old.lateStateWrites, 0); assert.equal(next.busy, false);
  assert.equal(next.calls.length, 1); assert.equal(old.timers.size, 0);
});

test('a mismatched saved receipt never triggers a success announcement', async () => {
  const h = await ready();
  h.button('내 평가 저장 / 수정').props.onClick(); await h.flush();
  h.calls[1].resolve({saved: true, menuId: OTHER, level: 7}); await h.flush();
  assert.equal(h.busy, false); assert.equal(h.fieldDisabled, true);
  assert.match(h.text(), /평가 저장 결과를 확인하지 못했어요/);
  assert.equal(h.calls.length, 2);
});
