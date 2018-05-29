import { FieldDescription } from "./server_messages";


function parseInt32(buf: Buffer) {
    return buf.readInt32BE(0);
}

function parseText(buf: Buffer) {
    return buf.toString("utf8");
}

const primitiveParsers: {[oid: number]: (buf: Buffer) => any} = {
    23: parseInt32,
    25: parseText,
}

export function parseField(description: FieldDescription, buf: Buffer) {
    if (buf.length === 0)
        return null;

    const primitiveParser = primitiveParsers[description.typeOid];
    if (primitiveParser)
        return primitiveParser(buf);

    console.log(description);
    return buf;
}

export function parseRow(descriptions: FieldDescription[], bufs: Buffer[]) {
    if (descriptions.length === 1 && descriptions[0].name === "?column?") {
        return parseField(descriptions[0], bufs[0]);
    }

    const obj: any = {};
    for (let i = 0; i < descriptions.length; ++i) {
        obj[descriptions[i].name] = parseField(descriptions[i], bufs[i]);
    }
    return obj;
}
