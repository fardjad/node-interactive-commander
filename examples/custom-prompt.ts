/* eslint-disable no-warning-comments */
import {
  InteractiveCommand as Command,
  InteractiveOption as Option,
} from "../src/index.ts";

const program = new Command().interactive(
  "-p, --prompt",
  "custom flags for the interactive mode",
);

program
  .command("hello")
  .addOption(
    new Option("-n, --name <string>", "your name")
      .prompt(async (currentValue, option, command) => {
        // TODO: Implement your own prompt logic here
        const answer = "world";

        // Return the answer
        return answer;
      })
      .makeOptionMandatory(),
  )
  .action(({ name }) => {
    console.log(`Hello ${name}!`);
  });

await program.parseAsync(process.argv);

// Try the following:
// npx tsx ./examples/custom-prompt.ts hello
// npx tsx ./examples/custom-prompt.ts hello --name "John Doe"
// npx tsx ./examples/custom-prompt.ts hello -p
// npx tsx ./examples/custom-prompt.ts hello -p --name "John Doe"
