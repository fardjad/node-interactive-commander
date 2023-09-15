import { InteractiveCommand } from "../src/index.ts";

const program = new InteractiveCommand();

program.use(async (rootCommand: InteractiveCommand) => {
  // Async functions are supported
  await new Promise((resolve) => {
    setImmediate(resolve);
  });

  rootCommand.command("hello", "Say hello").action(() => {
    console.log("Hello World!");
  });
});

await program.parseAsync();
