import {
  InteractiveCommand as Command,
  InteractiveOption as Option,
} from "../src/index.ts";

const program = new Command().interactive();

program
  .command("order")
  .command("sandwich")
  // NOTE: .option adds a regular (non-interactive) option to the command
  .option("-d, --drink", "drink")
  // To create an interactive option, use addOption and pass in a new instance
  // of InteractiveOption
  .addOption(
    new Option("-n, --count <number>", "number of sandwiches")
      .argParser(Number)
      .default(1),
  )
  .addOption(new Option("-c, --cheese", "cheese"))
  .addOption(new Option("-C, --no-cheese", "no cheese"))
  .addOption(
    new Option("-s, --size <size>", "size")
      .choices(["small", "medium", "large"])
      .default("medium"),
  )
  .action((_options, cmd: Command) => {
    console.log("Options: %o", cmd.opts());
  });

await program.parseAsync(process.argv);

// Try the following:
// npx tsx ./examples/simple.ts order sandwich
// npx tsx ./examples/simple.ts order sandwich -i
// npx tsx ./examples/simple.ts order sandwich -i --count 2
// npx tsx ./examples/simple.ts order sandwich -i --no-cheese
