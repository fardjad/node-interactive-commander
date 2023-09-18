/* eslint-disable no-warning-comments, unicorn/no-useless-undefined */
import { InteractiveCommand, InteractiveOption } from "../src/index.ts";

const program = new InteractiveCommand();

program
  .command("pizza")
  // Detached options are interactive by default
  .option("-d, --drink", "drink", true)

  // Missing mandatory options won't throw an error in interactive mode
  .requiredOption("-o, --olive-oil", "olive oil")

  // Boolean InteractiveOptions will show a confirmation prompt by default
  .option("-c, --cheese", "cheese")
  .option("-C, --no-cheese", "no cheese")

  .addOption(
    new InteractiveOption("-n, --count <number>", "number of pizzas")
      // InteractiveOption supports all the methods of Commander.js' Option
      .argParser(Number)
      .default(1),
  )

  .addOption(
    new InteractiveOption(
      "--non-interactive-option <value>",
      "non-interactive option",
    )
      // Passing in undefined to prompt will disable interactive mode for this option
      .prompt(undefined)
      .default("default value"),
  )

  // InteractiveOptions with choices will show a select prompt by default
  .addOption(
    new InteractiveOption("-s, --size <size>", "size")
      .choices(["small", "medium", "large"])
      .default("medium")
      .makeOptionMandatory(),
  )

  .addOption(
    new InteractiveOption("-m, --name <string>", "your name")
      // You can use the prompt method to implement your own prompt logic
      .prompt(async (currentValue, option, command) => {
        // TODO: Implement your own prompt logic here
        const answer = "world";

        // Return the answer
        return answer;
      })
      .makeOptionMandatory(),
  )

  .addOption(
    new InteractiveOption("-r, --voucher-code <string>", "voucher code")
      // The prompt input gets validated by the argParser function
      .argParser((value) => {
        if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
          throw new TypeError("Invalid voucher code");
        }

        return value;
      }),
  )

  .action((_options, cmd: InteractiveCommand) => {
    console.log("Options: %o", cmd.opts());
  });

await program
  // Enables interactive mode (when -i or --interactive is passed in)
  // This should almost always be called on the root command right before
  // calling parseAsync
  .interactive("-i, --interactive", "interactive mode")
  .parseAsync(process.argv);

// Try the following commands:
// order-pizza pizza
// order-pizza pizza -i
// order-pizza pizza -i --count 2
// order-pizza pizza -i --count 2 --no-cheese
// order-pizza pizza -i --name "John Doe"
// order-pizza pizza -i --name "John Doe" --non-interactive-option abc
