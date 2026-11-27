import assert from "node:assert/strict";
import { test } from "node:test";
import { captureWindow, loopGrid, loopPosition, moveTransport } from "../lab/looper-studio/looper-grid.mjs";
import { encodeWav, makePcmPool, PCM_BLOCK_FRAMES, PCM_POOL_BLOCKS, PcmCollector, PcmWriter, seamStep } from "../lab/looper-studio/looper-pcm.mjs";
import { decodeMidi, HeldMidiNotes, isAkaiInput } from "../lab/looper-studio/looper-midi.mjs";
import { joinTakeChunks, sameGrid, settleTake } from "../lab/looper-studio/looper-store.mjs";

test("2, 4 and 8 bars use separate beat offsets and frame lengths", () => {
  for (const bars of [2, 4, 8]) {
    const grid = loopGrid(120, bars, 48000);
    assert.equal(grid.beats, 4 * bars);
    assert.equal(grid.regionFrames, bars * 96000);
    assert.equal(grid.beatFrames[1], 24000);
  }
  assert.equal(loopGrid(64, 8, 48000).regionFrames, 1440000);
  assert.throws(() => loopGrid(63, 8, 48000), /exceeds 30 seconds/);
  assert.throws(() => loopGrid(120, 3, 48000), /bars/);
  assert.throws(() => loopGrid(0, 4, 48000), /tempo/);
});

test("a fractional frames-per-beat tempo rounds each absolute offset and wraps exactly", () => {
  const grid = loopGrid(127, 4, 44100);
  assert.equal(grid.regionFrames, Math.round(16 * 60 * 44100 / 127));
  assert.notEqual(grid.regionFrames, 16 * grid.beatFrames[1]);
  assert.deepEqual(loopPosition(grid, grid.beatFrames[4] - 1), { cycle: 0, bar: 1, beat: 4 });
  assert.deepEqual(loopPosition(grid, grid.beatFrames[4]), { cycle: 0, bar: 2, beat: 1 });
  assert.deepEqual(loopPosition(grid, grid.regionFrames * 10000), { cycle: 10000, bar: 1, beat: 1 });
});

test("recording schedules a one-bar count-in on the context frame clock", () => {
  const grid = loopGrid(120, 4, 48000);
  const window = captureWindow(grid, 11003);
  assert.equal(window.countInFrame, 18203);
  assert.equal(window.startFrame - window.countInFrame, 96000);
  assert.equal(window.endFrame - window.startFrame, grid.regionFrames);
});

test("record and playback states reject overlapping transports", () => {
  let state = "idle";
  for (const [event, expected] of [["prepare", "preparing"], ["arm", "count-in"], ["onset", "recording"],
    ["stop", "saving"], ["finish", "idle"], ["play", "playing"], ["stop", "idle"]]) {
    state = moveTransport(state, event);
    assert.equal(state, expected);
  }
  assert.equal(moveTransport("count-in", "stop"), "saving");
  assert.throws(() => moveTransport("recording", "play"), /while transport is recording/);
});

test("capture intersects variable render quanta and transfers exact stereo PCM", () => {
  const collector = new PcmCollector(2, 2203);
  let report;
  let onset;
  const writer = new PcmWriter(2, makePcmPool(2, 2), (message, transfer) => {
    if (message.type === "block") {
      const transferred = structuredClone(message, { transfer });
      assert.equal(message.buffer.byteLength, 0);
      collector.append(transferred);
      writer.recycle(transferred.buffer);
    }
    if (message.type === "onset") onset = message.firstFrame;
    if (message.type === "finished") report = message;
  });
  writer.arm({ startFrame: 17, endFrame: 2220 });
  for (let frame = 0; frame < 2220; frame += 127) {
    const left = Float32Array.from({ length: 127 }, (_, sample) => frame + sample);
    const right = left.map((value) => -value);
    writer.process([left, right], frame, left.length);
  }
  assert.equal(onset, 17);
  assert.deepEqual(report, { type: "finished", reason: "complete", frames: 2203, firstFrame: 17,
    overflowFrames: 0, gapFrames: 0, peakBuffers: 1 });
  assert.deepEqual([...collector.copy(0, 2)], [17, -17, 18, -18]);
  assert.deepEqual([...collector.copy(2202)], [2219, -2219]);
});

test("a stalled worker stops on pool exhaustion without padding or overwriting the take", () => {
  for (const blocks of [1, PCM_POOL_BLOCKS]) {
    const events = [];
    const writer = new PcmWriter(1, makePcmPool(1, blocks), (event) => events.push(event));
    writer.arm({ startFrame: 0, endFrame: (blocks + 2) * PCM_BLOCK_FRAMES });
    const source = new Float32Array(128).fill(.25);
    for (let start = 0; start < (blocks + 1) * PCM_BLOCK_FRAMES; start += source.length) {
      writer.process([source], start, source.length);
    }
    assert.equal(events.filter(({ type }) => type === "block").length, blocks);
    assert.deepEqual(events.at(-1), {
      type: "finished", reason: "buffer-overflow", frames: blocks * PCM_BLOCK_FRAMES,
      firstFrame: 0, overflowFrames: 128, gapFrames: 0, peakBuffers: blocks,
    });
  }
});

test("a late arm or lost input reports a partial capture", () => {
  const events = [];
  const late = new PcmWriter(1, makePcmPool(1, 1), (event) => events.push(event));
  late.arm({ startFrame: 128, endFrame: 1000 });
  late.process([new Float32Array(128)], 256, 128);
  assert.equal(events.at(-1).gapFrames, 128);
  assert.equal(events.at(-1).firstFrame, null);
  const dropped = new PcmWriter(1, makePcmPool(1, 1), (event) => events.push(event));
  dropped.arm({ startFrame: 4, endFrame: 1000 });
  dropped.process([new Float32Array(128)], 0, 128);
  dropped.process([], 128, 128);
  assert.equal(events.at(-1).reason, "input-lost");
  assert.equal(events.at(-1).frames, 124);
  assert.equal(events.at(-2).frames, 124);
});

test("collector rejects repeated and out-of-order blocks", () => {
  const collector = new PcmCollector(1, 2);
  const [buffer] = makePcmPool(1, 1);
  assert.throws(() => collector.append({ offset: 1, frames: 1, buffer }), /frame range/);
  collector.append({ offset: 0, frames: 1, buffer });
  assert.throws(() => collector.append({ offset: 0, frames: 1, buffer }), /frame range/);
  assert.throws(() => collector.append({ offset: 1, frames: 2, buffer }), /frame range/);
});

test("pending checkpoints recover as partial and frame mismatches cannot enter the loop", () => {
  const take = { status: "pending", frames: 2, regionFrames: 3, channels: 2, window: { startFrame: 10 }, firstFrame: 10 };
  const report = { reason: "complete", frames: 3, firstFrame: 10, overflowFrames: 0, gapFrames: 0 };
  const recovery = settleTake(take);
  assert.equal(recovery.status, "partial");
  assert.equal(recovery.reason, "interrupted");
  assert.equal(recovery.frames, 2);
  assert.equal(recovery.capturedFrames, null);
  assert.equal(settleTake(take, report).reason, "incomplete");
  assert.equal(settleTake({ ...take, frames: 3 }, report).status, "complete");
  assert.equal(settleTake({ ...take, frames: 3 }, { ...report, firstFrame: 11 }).status, "partial");
  assert.equal(settleTake({ ...take, frames: 3 }, { ...report, overflowFrames: 1 }).status, "partial");
  assert.deepEqual([...joinTakeChunks(recovery, [
    { offset: 0, frames: 1, samples: Float32Array.of(.25, .5) },
    { offset: 1, frames: 1, samples: Float32Array.of(.75, 1) },
  ])], [.25, .5, .75, 1]);
  assert.throws(() => joinTakeChunks(recovery, [{ offset: 1, frames: 1, samples: Float32Array.of(0, 0) }]), /checkpoint/);
  assert.throws(() => joinTakeChunks(recovery, []), /missing/);
});

test("overdub compatibility compares musical grid and context rate, independent of channels", () => {
  const grid = loopGrid(115, 4, 44100);
  assert.equal(sameGrid({ ...grid, channels: 1 }, { ...grid, channels: 2 }), true);
  assert.equal(sameGrid(grid, loopGrid(115, 4, 48000)), false);
  assert.equal(sameGrid(grid, loopGrid(116, 4, 44100)), false);
});

test("loop seam measures the raw per-channel jump and WAV exports correct PCM geometry", () => {
  const pcm = Float32Array.of(-1, .5, .75, 1);
  assert.deepEqual(seamStep(pcm, 2), [1.75, .5]);
  assert.equal(seamStep(pcm.subarray(0, 2), 2), null);
  const wav = Buffer.from(encodeWav(pcm, 48000, 2));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt32LE(40), 8);
  assert.deepEqual([wav.readInt16LE(44), wav.readInt16LE(46), wav.readInt16LE(50)], [-32768, 16384, 32767]);
});

test("MIDI preserves channel, velocity and receipt time and ignores SysEx", () => {
  assert.deepEqual(decodeMidi([0x99, 42, 87], 12.75),
    { type: "note-on", channel: 10, note: 42, velocity: 87, timestamp: 12.75 });
  assert.equal(decodeMidi([0x92, 48, 0], 42).type, "note-off");
  assert.equal(decodeMidi([0x82, 48, 50], 43).velocity, 50);
  assert.equal(decodeMidi([0xb2, 64, 127], 44).name, "Sustain");
  assert.equal(decodeMidi([0xe0, 0, 64], 45).value, 0);
  assert.equal(decodeMidi([0xf0, 42, 0xf7], 46), null);
  assert.equal(decodeMidi([0x90, 128, 0], 46), null);
  assert.equal(isAkaiInput({ name: "MPK Mini III" }), true);
  assert.equal(isAkaiInput({ name: "Other controller" }), false);
});

test("stuck-note recovery scopes controller messages to a channel and clears on disconnect", () => {
  const held = new HeldMidiNotes();
  for (const bytes of [[0x90, 60, 20], [0x99, 60, 80], [0x90, 72, 40], [0x90, 72, 0]]) {
    held.observe(decodeMidi(bytes, 123.4));
  }
  assert.equal(held.notes.size, 2);
  held.observe(decodeMidi([0xb0, 123, 0], 124));
  assert.equal(held.notes.size, 1);
  assert.equal(held.releaseAll(), 1);
  assert.equal(held.notes.size, 0);
});
