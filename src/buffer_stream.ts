export class BufferStreamReader {
    position = 0;
    constructor(private buffer: Buffer) {}

    readByte() {
        return this.buffer[this.position++];
    }

    readInt16() {
        const value = this.buffer.readInt16BE(this.position);
        this.position += 2;
        return value;
    }

    readInt32() {
        const value = this.buffer.readInt32BE(this.position);
        this.position += 4;
        return value;
    }

    readString() {
        let len = 0;
        while (len < this.buffer.length - this.position && this.buffer[this.position + len] !== 0)
            ++len;

        const value = this.buffer.slice(this.position, this.position + len).toString("utf8");
        this.position += len + 1;
        return value;
    }

    readBuffer(len: number) {
        const value = this.buffer.slice(this.position, this.position + len);
        this.position += len;
        return value;
    }
}

export class BufferStreamWritter {
    private buffers: (Buffer | number)[] = []
    private len = 0;

    get buffer() {
        return Buffer.concat(this.buffers.map(b => {
            if (typeof b === "number") {
                const lenBuf = Buffer.alloc(4);
                lenBuf.writeInt32BE(this.len + b, 0);
                return lenBuf;
            } else {
                return b;
            }
        }));
    }

    writeLen(delta = 0) {
        this.len += 4;
        this.buffers.push(delta);
        return this;
    }

    writeInt16(value: number) {
        this.len += 2;
        const buf = Buffer.alloc(2);
        buf.writeInt16BE(value, 0);
        this.buffers.push(buf);
        return this;
    }

    writeInt32(value: number) {
        this.len += 4;
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(value, 0);
        this.buffers.push(buf);
        return this;
    }

    writeChar(chr: string) {
        return this.writeByte(chr.charCodeAt(0));
    }

    writeByte(value: number) {
        this.len += 1;
        const buf = Buffer.alloc(1);
        buf[0] = value;
        this.buffers.push(buf);
        return this;
    }

    writeBuffer(value: Buffer) {
        this.len += value.length;
        this.buffers.push(value);
        return this;
    }

    writeString(value: string) {
        const utf8 = Buffer.from(value, "utf8");
        this.buffers.push(utf8);
        this.buffers.push(Buffer.alloc(1));
        this.len += utf8.length + 1;
        return this;
    }
}
