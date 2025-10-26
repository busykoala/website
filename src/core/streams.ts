// Stream-based I/O for POSIX-like shell architecture

export type StreamCallback = (data: string) => void;

export class OutputStream {
  private listeners: StreamCallback[] = [];

  write(data: string): void {
    this.listeners.forEach((listener) => listener(data));
  }

  writeLine(data: string): void {
    this.write(data + '\n');
  }

  on(callback: StreamCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  clear(): void {
    this.listeners = [];
  }
}

export class InputStream {
  private buffer: string = '';

  write(data: string): void {
    this.buffer += data;
  }

  read(): string {
    const data = this.buffer;
    this.buffer = '';
    return data;
  }

  readLine(): string | null {
    const newlineIndex = this.buffer.indexOf('\n');
    if (newlineIndex === -1) return null;

    const line = this.buffer.slice(0, newlineIndex);
    this.buffer = this.buffer.slice(newlineIndex + 1);
    return line;
  }

  clear(): void {
    this.buffer = '';
  }
}

export class CancellationToken {
  private cancelled = false;
  private listeners: Array<() => void> = [];

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    const ls = [...this.listeners];
    this.listeners.length = 0;
    ls.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  onCancel(cb: () => void): () => void {
    if (this.cancelled) {
      try {
        cb();
      } catch {}
      return () => {};
    }
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}

export interface IOStreams {
  stdin: InputStream;
  stdout: OutputStream;
  stderr: OutputStream;
  cancelToken?: CancellationToken;
}

export function createIOStreams(): IOStreams {
  return {
    stdin: new InputStream(),
    stdout: new OutputStream(),
    stderr: new OutputStream(),
  };
}
