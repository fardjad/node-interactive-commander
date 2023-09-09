# Interactive Commander

<div class="paragraph">

<span class="image"><a href="https://www.npmjs.com/package/interactive-commander" class="image"><img src="https://img.shields.io/npm/v/interactive-commander" alt="NPM Version" /></a></span> <span class="image"><a href="https://www.npmjs.com/package/interactive-commander" class="image"><img src="https://img.shields.io/npm/dm/interactive-commander" alt="Monthly Downloads" /></a></span> <span class="image"><a href="https://github.com/fardjad/node-interactive-commander/actions" class="image"><img src="https://img.shields.io/github/actions/workflow/status/fardjad/node-interactive-commander/test-and-release.yml?branch=main" alt="test-and-release Workflow Status" /></a></span>

</div>

Interactive Commander is an extension of the widely-used [Commander.js][1] library.
It seamlessly integrates configurable interactive prompts for missing options
in your CLI application, enhancing user experience with minimal effort.

![Video Demo](/media/demo.gif)

## Features

- Full compatibility with Commander.js (it uses Commander.js under the hood and is
  a drop-in replacement for it)
- Interactive prompts for missing options including the mandatory options
- Configurable flags for enabling interactive mode
- Configurable prompts for each option
- Default prompts for boolean, multiple-choice, and string options

## Installation

```bash
npm install --save interactive-commander
```

## Usage

```typescript
import { InteractiveCommand, InteractiveOption } from "interactive-commander";

const program = new InteractiveCommand()
  // Registers -i, --interactive flags
  .interactive("-i, --interactive", "interactive mode");

program
  .command("pizza")

  // .option adds a regular (non-interactive) option to the command
  .option("-d, --drink", "drink")

  // To create an interactive option, use addOption and pass in a new instance
  // of InteractiveOption
  .addOption(
    new InteractiveOption("-n, --count <number>", "number of pizzas")
      // InteractiveOption supports all the methods of Commander.js' Option
      .argParser(Number)
      .default(1),
  )

  // Boolean InteractiveOptions will show a confirmation prompt by default
  .addOption(new InteractiveOption("-c, --cheese", "cheese"))
  .addOption(new InteractiveOption("-C, --no-cheese", "no cheese"))

  // InteractiveOptions with choices will show a select prompt by default
  .addOption(
    new Option("-s, --size <size>", "size")
      .choices(["small", "medium", "large"])
      // Missing mandatory options won't throw an error in interactive mode
      .makeOptionMandatory(),
  )

  .addOption(
    new Option("-n, --name <string>", "your name")
      // You can use the prompt method to implement your own prompt logic
      .prompt(async (currentValue, option, command) => {
        // TODO: Implement your own prompt logic here
        const answer = "world";

        // Return the answer
        return answer;
      })
      .makeOptionMandatory(),
  )

  .action((_options, cmd: Command) => {
    console.log("Options: %o", cmd.opts());
  });

await program.parseAsync(process.argv);

// Try the following commands:
// command-name pizza
// command-name pizza -i
// command-name pizza -i --count 2
// command-name pizza -i --count 2 --no-cheese
// command-name pizza -i --name "John Doe"
```

More examples can be found in the [examples](/examples/) directory.

[1]: https://github.com/tj/commander.js
[2]: https://github.com/SBoudrias/Inquirer.js
