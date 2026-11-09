'use strict';

const MegaStore = (() => {
  const PREFIX = 'mega.usinagem.v1.';
  const DB_NAME = 'mega-usinagem-local-v1';
  const STORE = 'imports';
  const TAP_STORE = 'taps';
  const memory = new Map();
  let databasePromise;
  let tapDatabasePromise;

  function readSetting(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function writeSetting(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch (_) { throw Error('O navegador não permitiu salvar esta configuração.'); }
  }
  function openDatabase(name, store) {
    if (!('indexedDB' in globalThis)) return Promise.resolve(null);
    return new Promise(resolve => {
      try {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(store, { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  }
  const database = () => databasePromise ??= openDatabase(DB_NAME, STORE);
  const tapDatabase = () => tapDatabasePromise ??= openDatabase("mega-usinagem-taps-v1", TAP_STORE);

  async function transaction(mode, action, store = STORE) {
    const db = await (store === TAP_STORE ? tapDatabase() : database());
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let result;
      const request = action(tx.objectStore(store));
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || Error('Falha no armazenamento local.'));
      tx.onabort = () => reject(tx.error || Error('Armazenamento local interrompido.'));
    });
  }
  async function saveImport(record) {
    const db = await database();
    if (db) await transaction('readwrite', store => store.put(record));
    else {
      try { localStorage.setItem(PREFIX + 'import.' + record.id, JSON.stringify(record)); }
      catch (error) { throw Error('O navegador não permitiu salvar esta importação. Baixe uma cópia JSON.'); }
    }
    memory.set(record.id, record);
  }
  async function listImports() {
    const db = await database();
    let records = db ? await transaction('readonly', store => store.getAll()) : [];
    if (!db) {
      records = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(PREFIX + 'import.')) {
            try { records.push(JSON.parse(localStorage.getItem(key))); } catch (_) { /* ignore */ }
          }
        }
      } catch (_) { /* armazenamento indisponível */ }
    }
    for (const record of memory.values()) if (!records.some(item => item.id === record.id)) records.push(record);
    return records.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }
  async function getImport(id) {
    const db = await database();
    if (db) return await transaction('readonly', store => store.get(id)) || memory.get(id) || null;
    try { return JSON.parse(localStorage.getItem(PREFIX + 'import.' + id)) || memory.get(id) || null; }
    catch (_) { return memory.get(id) || null; }
  }
  async function deleteImport(id) {
    const db = await database();
    if (db) await transaction('readwrite', store => store.delete(id));
    else localStorage.removeItem(PREFIX + 'import.' + id);
    memory.delete(id);
  }
  function tapNameKey(name) {
    return name.trim().normalize('NFC').toLowerCase();
  }

  function tapNameConflict() {
    return Object.assign(Error('Já existe um TAP com esse nome.'), { code: 'TAP_NAME_EXISTS' });
  }

  async function saveTap(record, replace = false) {
    const name = tapNameKey(record.fileName);
    const next = { ...record, id: 'name:' + name };
    const db = await tapDatabase();
    const matches = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX + 'tap.')) continue;
        const saved = readSetting(key.slice(PREFIX.length), null);
        if (saved?.fileName && tapNameKey(saved.fileName) === name) matches.push(key);
      }
    } catch (error) {
      if (!db) throw error;
    }
    if (matches.length && !replace) throw tapNameConflict();
    if (!db) {
      const key = PREFIX + 'tap.' + next.id;
      writeSetting('tap.' + next.id, next);
      for (const old of matches) if (old !== key) localStorage.removeItem(old);
      return next;
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TAP_STORE, 'readwrite');
      const store = tx.objectStore(TAP_STORE);
      const request = store.getAll();
      let conflict = false;
      request.onsuccess = () => {
        const matches = request.result.filter(tap => tapNameKey(tap.fileName) === name);
        if (matches.length && !replace) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put(next);
        for (const old of matches) if (old.id !== next.id) store.delete(old.id);
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = () => reject(conflict ? tapNameConflict() : tx.error || Error('Falha ao salvar o TAP.'));
    });
    for (const old of matches) localStorage.removeItem(old);
    return next;
  }

  async function deleteTap(id) {
    if (await tapDatabase()) await transaction('readwrite', store => store.delete(id), TAP_STORE);
    localStorage.removeItem(PREFIX + 'tap.' + id);
  }

  async function listTaps() {
    const records = await transaction('readonly', store => store.getAll(), TAP_STORE) || [];
    const saved = new Map(records.map(record => [record.id, record]));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX + 'tap.')) continue;
        const record = readSetting(key.slice(PREFIX.length), null);
        if (record?.id && !saved.has(record.id)) saved.set(record.id, record);
      }
    } catch (_) { /* IndexedDB entries remain available. */ }
    return [...saved.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  return { readSetting, writeSetting, saveImport, listImports, getImport, deleteImport, saveTap, listTaps, deleteTap };
})();

if (typeof module !== 'undefined') module.exports = MegaStore;
