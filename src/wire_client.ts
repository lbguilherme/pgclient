import { Socket } from "net";
import { BufferStreamReader } from "./buffer_stream";
import { BindMessage, ClientMessage, DescribeMessage, ExecuteMessage, ParseMessage, StartupMessage, SyncMessage } from "./client_messages";
import { AuthenticationMessage, BackendKeyDataMessage, BindCompleteMessage, CommandCompleteMessage, DataRowMessage, ErrorResponseMessage, FieldDescription, NoDataMessage, NoticeResponseMessage, ParameterStatusMessage, ParseCompleteMessage, ReadyForQueryMessage, RowDescriptionMessage, ServerMessage } from "./server_messages";
import { parseRow } from "./types";

export interface ConnectOptions {
    host: string
    port: number
    database: string
    user: string
    password: string
}

type WireClientState = "Disconnected" | "Startup" | "Idle";

export class WireClient {
    private state: WireClientState = "Disconnected";
    private socket = new Socket();
    private buffer = Buffer.alloc(0);
    serverParameters = new Map<string, string>();
    private serverPid = -1;
    private serverSecret = -1;

    async connect(options: ConnectOptions) {
        await new Promise((resolve, reject) => {
            this.socket.once("error", reject);
            this.socket.connect(options.port, options.host, () => {
                this.socket.removeListener("error", reject);
                this.state = "Startup";
                this.socket.on("data", this.handleReceivedRawData.bind(this));
                this.socket.on("error", console.error);
                this.work(() => {
                    this.send(new StartupMessage(options.user, options.database));
                    return {
                        finished: resolve,
                        ErrorResponse: msg => {
                            reject(msg);
                        },
                        Authentication: msg => {
                            switch (msg.type) {
                                case "Ok": {
                                    this.state = "Idle";
                                    break;
                                }
                                default: {
                                    throw new Error(`Can't handle authentication type '${msg.type}'`);
                                }
                            }
                        }
                    }
                })
            });
        })
    }

    private send(msg: ClientMessage) {
        // console.log("SEND:", msg);
        this.socket.write(msg.encode());
    }

    private handleReceivedRawData(buffer: Buffer) {
        // console.log("DATA:", buffer);
        this.buffer = Buffer.concat([this.buffer, buffer]);
        this.tryReadMessage();
    }

    private tryReadMessage() {
        if (this.buffer.length < 5)
            return;

        const type = String.fromCharCode(this.buffer[0]);
        const len = this.buffer.readInt32BE(1);

        if (this.buffer.length < len + 1)
            return;

        const payload = new BufferStreamReader(this.buffer.slice(5, len + 1));

        this.buffer = this.buffer.slice(1 + len);

        let msg: ServerMessage;
        switch (type) {
            case 'R': msg = new AuthenticationMessage(payload); break;
            case 'S': msg = new ParameterStatusMessage(payload); break;
            case 'K': msg = new BackendKeyDataMessage(payload); break;
            case 'Z': msg = new ReadyForQueryMessage(payload); break;
            case '1': msg = new ParseCompleteMessage(payload); break;
            case '2': msg = new BindCompleteMessage(payload); break;
            case 'E': msg = new ErrorResponseMessage(payload); break;
            case 'T': msg = new RowDescriptionMessage(payload); break;
            case 'D': msg = new DataRowMessage(payload); break;
            case 'C': msg = new CommandCompleteMessage(payload); break;
            case 'n': msg = new NoDataMessage(payload); break;
            case 'N': msg = new NoticeResponseMessage(payload); break;
            default: throw new Error(`unexpected message type '${type}'`);
        }

        // console.log("RECV:", msg);

        this.handleMessage(msg);

        this.tryReadMessage();
    }

    private handleMessage(msg: ServerMessage) {
        if (msg instanceof ParameterStatusMessage) {
            this.serverParameters.set(msg.name, msg.value);
            return;
        }

        if (msg instanceof BackendKeyDataMessage) {
            this.serverPid = msg.pid;
            this.serverSecret = msg.secret;
            return;
        }

        if (msg instanceof ReadyForQueryMessage) {
            if (this.currentWork && this.currentWork.finished)
                this.currentWork.finished();
            this.currentWork = null;
            this.tryStartNextWork();
            return;
        }

        if (msg instanceof NoticeResponseMessage) {
            console.warn(msg.info.get("S"), msg.info.get("M"));
            return;
        }

        const msgName = msg.constructor.name.replace(/Message$/, "");
        if (this.currentWork && (this.currentWork as any)[msgName]) {
            (this.currentWork as any)[msgName](msg);
            return;
        }

        console.warn("WARN:", "unhandled/unexpected", msg);
    }

    private currentWork: MessageHandler | null = null;
    private workQueue: (() => MessageHandler)[] = []

    private work(func: () => MessageHandler) {
        this.workQueue.push(func);

        if (this.currentWork === null)
            this.tryStartNextWork();
    }

    private tryStartNextWork() {
        const next = this.workQueue.shift();
        if (next)
            this.currentWork = next();
    }

    query(query: string) {
        return new Promise<any[]>((resolve, reject) => {
            this.work(() => {
                this.send(new ParseMessage("", query, []));
                this.send(new BindMessage("", "", [], [], ["binary"]));
                this.send(new DescribeMessage("portal", ""));
                this.send(new ExecuteMessage("", 0));
                this.send(new SyncMessage());

                let descriptions: FieldDescription[];
                const result: any[] = [];

                return {
                    CommandComplete: () => {
                        resolve(result);
                    },
                    ErrorResponse: msg => {
                        reject(msg);
                    },
                    RowDescription: msg => {
                        descriptions = msg.fields;
                    },
                    DataRow: msg => {
                        result.push(parseRow(descriptions, msg.fields));
                    },
                    ParseComplete: () => {},
                    BindComplete: () => {},
                    NoData: () => {},
                };
            });
        });
    }
}

interface MessageHandler {
    finished?: () => void
    ErrorResponse?: (msg: ErrorResponseMessage) => void
    ParseComplete?: (msg: ParseCompleteMessage) => void
    BindComplete?: (msg: BindCompleteMessage) => void
    Authentication?: (msg: AuthenticationMessage) => void
    RowDescription?: (msg: RowDescriptionMessage) => void
    DataRow?: (msg: DataRowMessage) => void
    CommandComplete?: (msg: CommandCompleteMessage) => void
    NoData?: (msg: NoDataMessage) => void
}
