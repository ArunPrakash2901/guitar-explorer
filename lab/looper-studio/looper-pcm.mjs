export const PCM_BLOCK_FRAMES = 1024;
export const PCM_POOL_BLOCKS = 16;
export const CHECKPOINT_FRAMES = 16384;

export function makePcmPool(channels, count = PCM_POOL_BLOCKS) {
  return Array.from({ length: count }, () => new ArrayBuffer(PCM_BLOCK_FRAMES * channels * Float32Array.BYTES_PER_ELEMENT));
}

// The worklet writes into transferred buffers and only sends messages at block boundaries.
export class PcmWriter {
  constructor(channels, pool, send) {
    this.channels = channels;
    this.send = send;
    this.capacity = pool.length;
    this.free = pool.map((buffer) => new Float32Array(buffer));
    this.frames = 0;
    this.used = 0;
    this.peakBuffers = 0;
    this.firstFrame = null;
    this.finished = false;
    this.block = null;
  }

  recycle(buffer) {
    this.free.push(new Float32Array(buffer));
  }

  arm(window) {
    this.window = window;
  }

  process(input, quantumFrame, quantumFrames) {
    if (!this.window || this.finished) return;
    const { startFrame, endFrame } = this.window;
    const start = Math.max(quantumFrame, startFrame);
    const end = Math.min(quantumFrame + quantumFrames, endFrame);
    if (end <= start && quantumFrame < endFrame) return;
    const next = startFrame + this.frames;
    if (start !== next) {
      this.finish("frame-gap", 0, Math.abs(start - next));
      return;
    }
    if (input.length !== this.channels) {
      this.finish("input-lost");
      return;
    }
    for (let channel = 0; channel < this.channels; channel++) {
      if (input[channel].length !== quantumFrames) {
        this.finish("input-lost");
        return;
      }
    }
    for (let frame = start; frame < end; frame++) {
      if (!this.block) {
        this.block = this.free.pop();
        if (!this.block) {
          this.finish("buffer-overflow", end - frame);
          return;
        }
        this.peakBuffers = Math.max(this.peakBuffers, this.capacity - this.free.length);
      }
      if (this.firstFrame === null) {
        this.firstFrame = frame;
        this.send({ type: "onset", firstFrame: frame });
      }
      const sourceIndex = frame - quantumFrame;
      const targetIndex = this.used * this.channels;
      for (let channel = 0; channel < this.channels; channel++) {
        this.block[targetIndex + channel] = input[channel][sourceIndex];
      }
      this.used++;
      this.frames++;
      if (this.used === PCM_BLOCK_FRAMES) this.flush();
    }
    if (end === endFrame) this.finish("complete");
  }

  flush() {
    if (!this.used) return;
    const buffer = this.block.buffer;
    this.send({ type: "block", offset: this.frames - this.used, frames: this.used, buffer }, [buffer]);
    this.block = null;
    this.used = 0;
  }

  finish(reason, overflowFrames = 0, gapFrames = 0) {
    if (!this.window || this.finished) return;
    this.finished = true;
    this.flush();
    this.send({
      type: "finished", reason, frames: this.frames, firstFrame: this.firstFrame,
      overflowFrames, gapFrames, peakBuffers: this.peakBuffers,
    });
  }
}

export class PcmCollector {
  constructor(channels, maxFrames) {
    this.channels = channels;
    this.maxFrames = maxFrames;
    this.samples = new Float32Array(channels * maxFrames);
    this.frames = 0;
  }

  append({ offset, frames, buffer }) {
    if (offset !== this.frames || !Number.isInteger(frames) || frames < 1 ||
        frames > PCM_BLOCK_FRAMES || offset + frames > this.maxFrames ||
        buffer.byteLength !== this.channels * PCM_BLOCK_FRAMES * Float32Array.BYTES_PER_ELEMENT) {
      throw new Error("PCM block does not match the expected frame range.");
    }
    this.samples.set(new Float32Array(buffer, 0, frames * this.channels), offset * this.channels);
    this.frames += frames;
  }

  copy(fromFrame = 0, toFrame = this.frames) {
    return this.samples.slice(fromFrame * this.channels, toFrame * this.channels);
  }
}

export function seamStep(samples, channels) {
  if (samples.length < 2 * channels) return null;
  return Array.from({ length: channels }, (_, channel) =>
    Math.abs(samples[channel] - samples[samples.length - channels + channel]));
}

export function encodeWav(samples, sampleRate, channels) {
  const pcmBytes = samples.length * 2;
  const wav = new DataView(new ArrayBuffer(44 + pcmBytes));
  const tag = (offset, name) => {
    for (let index = 0; index < name.length; index++) wav.setUint8(offset + index, name.charCodeAt(index));
  };
  tag(0, "RIFF");
  wav.setUint32(4, 36 + pcmBytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, channels, true);
  wav.setUint32(24, sampleRate, true);
  wav.setUint32(28, sampleRate * channels * 2, true);
  wav.setUint16(32, channels * 2, true);
  wav.setUint16(34, 16, true);
  tag(36, "data");
  wav.setUint32(40, pcmBytes, true);
  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    wav.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return wav.buffer;
}
