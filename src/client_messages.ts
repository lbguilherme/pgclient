import { BufferStreamWritter } from "./buffer_stream";

export abstract class ClientMessage {
    abstract encode(): Buffer
}

export class StartupMessage extends ClientMessage {
    constructor(public user: string, public database: string) { super(); }

    encode() {
        return new BufferStreamWritter()
            .writeLen()
            .writeInt32(196608)
            .writeString("user")
            .writeString(this.user)
            .writeString("database")
            .writeString(this.database)
            .writeByte(0)
            .buffer;
    }
}

export class FlushMessage extends ClientMessage {
    encode() {
        return new BufferStreamWritter()
            .writeChar('H')
            .writeLen(-1)
            .buffer;
    }
}

export class SyncMessage extends ClientMessage {
    encode() {
        return new BufferStreamWritter()
            .writeChar('S')
            .writeLen(-1)
            .buffer;
    }
}

export class QueryMessage extends ClientMessage {
    constructor(public query: string) { super(); }

    encode() {
        return new BufferStreamWritter()
            .writeChar('Q')
            .writeLen(-1)
            .writeString(this.query)
            .buffer;
    }
}

export class ParseMessage extends ClientMessage {
    constructor(public name: string, public query: string, public parameterOids: number[]) { super(); }

    encode() {
        const stream = new BufferStreamWritter();
        stream.writeChar("P").writeLen(-1);
        stream.writeString(this.name);
        stream.writeString(this.query);
        stream.writeInt16(this.parameterOids.length);
        for (const oid of this.parameterOids) {
            stream.writeInt32(oid);
        }
        return stream.buffer;
    }
}

export class BindMessage extends ClientMessage {
    constructor(public name: string, public stmt: string, public parameterFormats: ("text" | "binary")[], public parameters: Buffer[], public resultFormats: ("text" | "binary")[]) { super(); }

    encode() {
        const stream = new BufferStreamWritter();
        stream.writeChar("B").writeLen(-1);
        stream.writeString(this.name);
        stream.writeString(this.stmt);
        stream.writeInt16(this.parameterFormats.length);
        for (const format of this.parameterFormats) {
            stream.writeInt16(format === "text" ? 0 : 1);
        }
        stream.writeInt16(this.parameters.length);
        for (const parameter of this.parameters) {
            stream.writeInt32(parameter.length);
            stream.writeBuffer(parameter);
        }
        stream.writeInt16(this.resultFormats.length);
        for (const format of this.resultFormats) {
            stream.writeInt16(format === "text" ? 0 : 1);
        }
        return stream.buffer;
    }
}

export class DescribeMessage extends ClientMessage {
    constructor(public type: "statement" | "portal", public name: string) { super(); }

    encode() {
        return new BufferStreamWritter()
            .writeChar('D')
            .writeLen(-1)
            .writeChar(this.type === "statement" ? "S" : "P")
            .writeString(this.name)
            .buffer;
    }
}

export class ExecuteMessage extends ClientMessage {
    constructor(public name: string, public count: number) { super(); }

    encode() {
        return new BufferStreamWritter()
            .writeChar('E')
            .writeLen(-1)
            .writeString(this.name)
            .writeInt32(this.count)
            .buffer;
    }
}
