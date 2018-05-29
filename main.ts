import { WireClient } from "./src/wire_client";

async function main() {

    const client = new WireClient();
    await client.connect({
        host: "172.17.0.2",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: ""
    });

    console.log("connected");

    await client.query("CREATE TABLE IF NOT EXISTS foo (id TEXT PRIMARY KEY NOT NULL, value INTEGER);")
    await client.query("TRUNCATE TABLE foo;")
    await client.query("INSERT INTO foo VALUES ('a', 1);")
    await client.query("INSERT INTO foo VALUES ('b', 2);")
    await client.query("INSERT INTO foo VALUES ('c', 3);")
    await client.query("INSERT INTO foo VALUES ('d', 4);")
    // await Promise.all(["SELECT 1", "SELECT 'foo'", "SELECT 3 as value, 17 as hmm;"].map(async x => {
    //     console.log("query result:", await client.query(x));
    // }));
    // console.log("query result:", await client.query("SELECT 1+1+100;"));
    console.log("query result:", await client.query("SELECT * FROM foo;"));
}

main().catch(console.error);
