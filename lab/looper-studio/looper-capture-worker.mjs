import { CHECKPOINT_FRAMES, makePcmPool, PcmCollector, seamStep } from "./looper-pcm.mjs";
import { openLooperStore } from "./looper-store.mjs";

self.onmessage = async ({ data: { port, take } }) => {
  try {
    const store = await openLooperStore();
    const pcm = new PcmCollector(take.channels, take.regionFrames);
    let window;
    let firstFrame = null;
    let checkpointedFrames = 0;
    let writes = Promise.resolve();
    let storageError;

    function checkpoint() {
      const offset = checkpointedFrames;
      checkpointedFrames = pcm.frames;
      if (offset === checkpointedFrames || storageError) return;
      const samples = pcm.copy(offset, checkpointedFrames);
      writes = writes.then(async () => {
        if (storageError) return;
        try {
          const frames = await store.checkpoint(take.id, offset, samples, window, firstFrame);
          self.postMessage({ type: "progress", frames });
        } catch (error) {
          storageError = error;
        }
      });
    }

    async function finish(stats) {
      if (pcm.frames !== stats.frames) throw new Error("The worker and worklet disagree on the frame count.");
      const samples = pcm.samples.subarray(0, pcm.frames * take.channels);
      const report = { ...stats, window, seam: seamStep(samples, take.channels) };
      checkpoint();
      await writes;
      if (!storageError) {
        try {
          const saved = await store.finish(take.id, report);
          self.postMessage({ type: "take", take: saved });
          return;
        } catch (error) {
          storageError = error;
        }
      }
      const buffer = pcm.copy().buffer;
      self.postMessage({ type: "unsaved", take, report, buffer, error: storageError.message }, [buffer]);
    }

    port.onmessage = async ({ data }) => {
      try {
        if (data.type === "armed") window = data.window;
        if (data.type === "onset") firstFrame = data.firstFrame;
        if (data.type === "block") {
          pcm.append(data);
          port.postMessage({ type: "recycle", buffer: data.buffer }, [data.buffer]);
          if (pcm.frames - checkpointedFrames >= CHECKPOINT_FRAMES) checkpoint();
        }
        if (data.type === "finished") {
          await finish(data);
          port.close();
          store.close();
        }
      } catch (error) {
        self.postMessage({ type: "error", error: error.message });
        port.close();
        store.close();
      }
    };
    const buffers = makePcmPool(take.channels);
    port.postMessage({ type: "pool", buffers }, buffers);
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
