import { InteractiveCommand } from "../src/index.ts";

const program = new InteractiveCommand();

program
  .command("hello", { isDefault: true })
  .requiredOption("-n, --name <name>", "your name")
  .action((options) => {
    console.log("Hello %s!", options.name);
  });

await program.interactive().parseAsync(process.argv);

// Try the following commands:
// default-subcommand
// default-subcommand -n John
// default-subcommand -i
