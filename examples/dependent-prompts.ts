import { InteractiveCommand } from "../src/interactive-command.ts";
import { InteractiveOption } from "../src/interactive-option.ts";

/**
 * Set the default value of an option to the return value of a callback function.
 * This is useful for creating dependant prompts for options.
 *
 * @param option
 * @param callback - A function that returns the default value for the option
 */
export const setPromptDefault = (
  option: InteractiveOption,
  callback: (command: InteractiveCommand) => string,
) => {
  let { readFunction } = option;
  readFunction = readFunction?.bind(option) as typeof readFunction;

  option.readFunction = async (
    currentValue: unknown,
    option: InteractiveOption,
    command: InteractiveCommand,
  ) =>
    readFunction?.(
      currentValue ?? (await Promise.resolve(callback(command))),
      option,
      command,
    );
};

const program = new InteractiveCommand();

const shippingAddress = new InteractiveOption(
  "-a, --shipping-address <address>",
  "shipping address",
).makeOptionMandatory();

const billingAddress = new InteractiveOption(
  "-b, --billing-address <address>",
  "billing address",
).makeOptionMandatory();

// Set the default value of the billing address to the value of the shipping
// address
setPromptDefault(
  billingAddress,
  (command) => command.opts<{ shippingAddress: string }>().shippingAddress,
);

program
  .command("order")
  .addOption(shippingAddress)
  .addOption(billingAddress)
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
// dependent-prompts order -i
