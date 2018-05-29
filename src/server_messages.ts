import { BufferStreamReader } from "./buffer_stream";

export abstract class ServerMessage {

}

export class AuthenticationMessage extends ServerMessage {
    type: "Ok"

    constructor(buffer: BufferStreamReader) {
        super();
        const type = buffer.readInt32();
        switch (type) {
            case 0: this.type = "Ok"; break;
            default: throw new Error(`unexpected authentication type '${type}'`);
        }
    }
}

export class ParameterStatusMessage extends ServerMessage {
    name: string
    value: string

    constructor(buffer: BufferStreamReader) {
        super();
        this.name = buffer.readString();
        this.value = buffer.readString();
    }
}

export class BackendKeyDataMessage extends ServerMessage {
    pid: number
    secret: number

    constructor(buffer: BufferStreamReader) {
        super();
        this.pid = buffer.readInt32();
        this.secret = buffer.readInt32();
    }
}

export class ReadyForQueryMessage extends ServerMessage {
    transactionStatus: "Idle" | "Transaction Block" | "Failed Transaction Block"

    constructor(buffer: BufferStreamReader) {
        super();
        const status = buffer.readByte();
        switch (status) {
            case 0x49: this.transactionStatus = "Idle"; break;
            case 0x54: this.transactionStatus = "Transaction Block"; break;
            case 0x45: this.transactionStatus = "Failed Transaction Block"; break;
            default: throw new Error(`unexpected transaction status '${status}'`);
        }
    }
}

export class ParseCompleteMessage extends ServerMessage {
    constructor(buffer: BufferStreamReader) {
        super();
    }
}

export class BindCompleteMessage extends ServerMessage {
    constructor(buffer: BufferStreamReader) {
        super();
    }
}

export class NoDataMessage extends ServerMessage {
    constructor(buffer: BufferStreamReader) {
        super();
    }
}

export class ErrorResponseMessage extends ServerMessage {
    info = new Map<string, string>();

    constructor(buffer: BufferStreamReader) {
        super();
        while (true) {
            const type = buffer.readByte();
            if (type === 0) break;
            const str = buffer.readString();
            this.info.set(String.fromCharCode(type), str);
        }
    }
}

export interface FieldDescription {
    name: string
    classOid: number
    attributeNumber: number
    typeOid: number
    typeLen: number
    typeMod: number
    format: "text" | "binary"
}

export class RowDescriptionMessage extends ServerMessage {
    fields: FieldDescription[] = []

    constructor(buffer: BufferStreamReader) {
        super();
        const fieldCount = buffer.readInt16();
        for (let i = 0; i < fieldCount; ++i) {
            this.fields.push({
                name: buffer.readString(),
                classOid: buffer.readInt32(),
                attributeNumber: buffer.readInt16(),
                typeOid: buffer.readInt32(),
                typeLen: buffer.readInt16(),
                typeMod: buffer.readInt32(),
                format: buffer.readInt16() === 0 ? "text" : "binary"
            });
        }
    }
}

export class DataRowMessage extends ServerMessage {
    fields: Buffer[] = []

    constructor(buffer: BufferStreamReader) {
        super();
        const fieldCount = buffer.readInt16();
        for (let i = 0; i < fieldCount; ++i) {
            const fieldLen = buffer.readInt32();
            this.fields.push(buffer.readBuffer(fieldLen));
        }
    }
}

export class CommandCompleteMessage extends ServerMessage {
    tag: string

    constructor(buffer: BufferStreamReader) {
        super();
        this.tag = buffer.readString();
    }
}

export class NoticeResponseMessage extends ServerMessage {
    info = new Map<string, string>();

    constructor(buffer: BufferStreamReader) {
        super();
        while (true) {
            const type = buffer.readByte();
            if (type === 0) break;
            const str = buffer.readString();
            this.info.set(String.fromCharCode(type), str);
        }
    }
}
