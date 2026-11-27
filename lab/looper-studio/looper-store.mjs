const DATABASE = "guitar-explorer-looper-studio";
const TAKES = "takes";
const CHUNKS = "chunks";

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(db, names, mode, action) {
  const tx = mode === "readwrite"
    ? db.transaction(names, mode, { durability: "strict" })
    : db.transaction(names, mode);
  const completion = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error ?? new Error("The recording transaction was interrupted."));
  });
  completion.catch(() => {});
  try {
    const result = await action(tx);
    await completion;
    return result;
  } catch (error) {
    try { tx.abort(); } catch {}
    await completion.catch(() => {});
    throw error;
  }
}

function chunkRange(id) {
  return IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
}

export function settleTake(take, report = null) {
  const window = report?.window ?? take.window;
  const complete = report?.reason === "complete" &&
    take.frames === take.regionFrames &&
    report.frames === take.frames &&
    report.firstFrame === window?.startFrame &&
    report.overflowFrames === 0 &&
    report.gapFrames === 0;
  return {
    ...take,
    status: complete ? "complete" : "partial",
    reason: !report ? "interrupted" : report.reason === "complete" && !complete ? "incomplete" : report.reason,
    window,
    firstFrame: report?.firstFrame ?? take.firstFrame,
    capturedFrames: report?.frames ?? null,
    overflowFrames: report?.overflowFrames ?? null,
    gapFrames: report?.gapFrames ?? null,
    peakBuffers: report?.peakBuffers ?? null,
    seam: report?.seam ?? null,
  };
}

export function joinTakeChunks(take, chunks) {
  const result = new Float32Array(take.frames * take.channels);
  let next = 0;
  for (const chunk of chunks) {
    if (chunk.offset !== next || chunk.frames < 1 || next + chunk.frames > take.frames ||
        chunk.samples.length !== chunk.frames * take.channels) {
      throw new Error("The saved audio has a missing or inconsistent checkpoint.");
    }
    result.set(chunk.samples, next * take.channels);
    next += chunk.frames;
  }
  if (next !== take.frames) throw new Error("Some saved audio checkpoints are missing.");
  return result;
}

export function sameGrid(take, grid) {
  return take.bpm === grid.bpm && take.bars === grid.bars &&
    take.sampleRate === grid.sampleRate && take.regionFrames === grid.regionFrames;
}

export async function openLooperStore() {
  const opening = indexedDB.open(DATABASE, 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore(TAKES, { keyPath: "id" });
    opening.result.createObjectStore(CHUNKS, { keyPath: ["takeId", "offset"] });
  };
  const db = await requestResult(opening);
  db.onversionchange = () => db.close();

  return {
    close: () => db.close(),
    list: () => transact(db, TAKES, "readonly", (tx) => requestResult(tx.objectStore(TAKES).getAll())),
    reserve: (grid, channels, slot) => transact(db, TAKES, "readwrite", async (tx) => {
      if (channels !== 1 && channels !== 2) throw new Error("Choose a mono or stereo input.");
      if (slot !== "base" && slot !== "overdub") throw new Error("Unknown recording slot.");
      const takes = tx.objectStore(TAKES);
      const existing = await requestResult(takes.getAll());
      if (existing.some((take) => take.status === "pending")) {
        throw new Error("A recording is in progress or needs recovery.");
      }
      if (existing.some((take) => take.slot === slot)) throw new Error("Remove the existing take in this slot first.");
      const base = existing.find((take) => take.slot === "base");
      if (slot === "overdub" && (base?.status !== "complete" || !sameGrid(base, grid))) {
        throw new Error("The second take needs the same tempo, loop length and sample rate as the base.");
      }
      const { bpm, meter, bars, beats, sampleRate, regionFrames } = grid;
      const take = {
        id: crypto.randomUUID(), slot, bpm, meter, bars, beats, sampleRate, regionFrames, channels,
        status: "pending", frames: 0, window: null, firstFrame: null, createdAt: new Date().toISOString(),
      };
      takes.add(take);
      return take;
    }),
    checkpoint: (id, offset, samples, window, firstFrame) =>
      transact(db, [TAKES, CHUNKS], "readwrite", async (tx) => {
        const takes = tx.objectStore(TAKES);
        const take = await requestResult(takes.get(id));
        if (take?.status !== "pending" || offset !== take.frames) {
          throw new Error("The pending take changed before the next checkpoint.");
        }
        const frames = samples.length / take.channels;
        if (!Number.isInteger(frames) || frames <= 0 || offset + frames > take.regionFrames) {
          throw new Error("The audio checkpoint exceeds the planned frame range.");
        }
        tx.objectStore(CHUNKS).add({ takeId: id, offset, frames, samples });
        const next = { ...take, frames: offset + frames, window, firstFrame };
        takes.put(next);
        return next.frames;
      }),
    finish: (id, report) => transact(db, TAKES, "readwrite", async (tx) => {
      const takes = tx.objectStore(TAKES);
      const take = await requestResult(takes.get(id));
      if (take?.status !== "pending") throw new Error("The pending take has already been recovered or removed.");
      const finished = settleTake(take, report);
      takes.put(finished);
      return finished;
    }),
    recover: (id) => transact(db, TAKES, "readwrite", async (tx) => {
      const takes = tx.objectStore(TAKES);
      const take = await requestResult(takes.get(id));
      if (take?.status !== "pending") return take;
      const recovered = settleTake(take);
      takes.put(recovered);
      return recovered;
    }),
    load: (id) => transact(db, [TAKES, CHUNKS], "readonly", async (tx) => {
      const take = await requestResult(tx.objectStore(TAKES).get(id));
      if (!take || take.status === "pending") throw new Error("Finish or recover this take before opening its audio.");
      const chunks = await requestResult(tx.objectStore(CHUNKS).getAll(chunkRange(id)));
      return { take, samples: joinTakeChunks(take, chunks) };
    }),
    remove: (id) => transact(db, [TAKES, CHUNKS], "readwrite", async (tx) => {
      const takes = tx.objectStore(TAKES);
      const existing = await requestResult(takes.getAll());
      const take = existing.find((entry) => entry.id === id);
      if (!take || take.status === "pending") throw new Error("Recover the pending recording before discarding it.");
      if (take.slot === "base" && existing.some((entry) => entry.slot === "overdub")) {
        throw new Error("Remove the second take before removing the base.");
      }
      tx.objectStore(CHUNKS).delete(chunkRange(id));
      takes.delete(id);
    }),
  };
}
