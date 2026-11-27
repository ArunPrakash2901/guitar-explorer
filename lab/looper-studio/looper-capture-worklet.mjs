import { PcmWriter } from "./looper-pcm.mjs";

class LooperCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.channels = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === "connect") this.connectWorker(data.port);
      if (data.type === "arm") {
        this.workerPort.postMessage({ type: "armed", window: data.window });
        this.writer.arm(data.window);
      }
      if (data.type === "stop") this.writer?.finish(data.reason);
    };
  }

  connectWorker(port) {
    this.workerPort = port;
    port.onmessage = ({ data }) => {
      if (data.type === "pool") {
        this.writer = new PcmWriter(this.channels, data.buffers, (message, transfer = []) => {
          if (message.type === "onset" || message.type === "finished") this.port.postMessage(message);
          port.postMessage(message, transfer);
        });
        this.port.postMessage({ type: "ready" });
      }
      if (data.type === "recycle") this.writer.recycle(data.buffer);
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!this.channels && input.length) {
      this.channels = input.length;
      this.port.postMessage({ type: "input", channels: this.channels });
    }
    this.writer?.process(input, currentFrame, outputs[0][0].length);
    return !this.writer?.finished;
  }
}

registerProcessor("looper-capture", LooperCapture);
