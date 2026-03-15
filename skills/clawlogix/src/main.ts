import { handleCommand } from "./parseCommand.js";

async function main() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) {
    console.error("Usage: node dist/main.js \"request restart reason=\\\"apply config\\\" urgency=normal\"");
    process.exit(1);
  }

  const actor = process.env.CLAWLOGIX_ACTOR ?? "operator";
  try {
    const result = await handleCommand(raw, actor);
    console.log(JSON.stringify({ ok: true, result }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
    process.exit(1);
  }
}

main();
