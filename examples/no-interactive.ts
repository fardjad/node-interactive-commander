import { InteractiveCommand } from "../src/index.ts";

const program = new InteractiveCommand();

program
  .command("hello")
  .option("-n, --name <name>", "your name")
  .action((options) => {
    console.log("Hello %s!", options.name);
  });

await program
  .interactive("-I, --no-interactive", "disable interactive mode")
  .parseAsync(process.argv);

// Try the following commands:
// no-interactive hello
// no-interactive hello -I
