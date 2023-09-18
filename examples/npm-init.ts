import { InteractiveCommand, InteractiveOption } from "../src/index.ts";
import * as inquirer from "@inquirer/prompts";
import fs from "node:fs";
import path from "node:path";

const program = new InteractiveCommand();

const createPackageJson = <T extends Record<string, unknown>>(record: T): T => {
  const { test, ...otherProperties } = record;

  return Object.fromEntries(
    Object.entries({
      ...otherProperties,
      ...(test
        ? {
            scripts: {
              test: test ?? 'echo "Error: no test specified" && exit 1',
            },
          }
        : {}),
    }).filter(([_, value]) => value !== undefined),
  ) as T;
};

program
  .version("1.0.0", "-V, --display-version", "output the version number")
  .hook("preSubcommand", async (thisCommand, actionCommand) => {
    if (actionCommand.name() !== "init") {
      return;
    }

    // Without package.json, npm init prompts for the following:
    // - name
    // - version
    // - description
    // - entry point
    // - test command
    // - git repository
    // - keywords
    // - author
    // - license
    // When package.json exists, npm init prompts for the following:
    // - name
    // - version
    // - description
    // - git repository
    // - author
    // - license

    let packageJson: Record<string, unknown> = {};

    try {
      packageJson = JSON.parse(
        await fs.promises.readFile("package.json", "utf8"),
      ) as Record<string, unknown>;

      // Disable some prompts when package.json exists
      const promptsToDisable = [
        // Entry point
        "main",
        "test",
        "keywords",
      ];
      for (const promptToDisable of promptsToDisable) {
        (
          actionCommand.options.find(
            (option) => option.attributeName() === promptToDisable,
          ) as InteractiveOption
        )
          // eslint-disable-next-line unicorn/no-useless-undefined
          .prompt(undefined);
      }
    } catch {}

    for (const [key, value] of Object.entries(packageJson)) {
      actionCommand.setOptionValueWithSource(key, value, "config");
    }

    actionCommand.setOptionValueWithSource(
      "name",
      packageJson.name ?? path.basename(process.cwd()),
      "config",
    );
  })
  .command("init")
  .addOption(
    new InteractiveOption("-n, --name <name>", "package name")
      .argParser((value) => {
        if (
          typeof value !== "string" ||
          // From: https://github.com/dword-design/package-name-regex/blob/master/src/index.js
          !/^(@[\da-z~-][\d._a-z~-]*\/)?[\da-z~-][\d._a-z~-]*$/.test(value)
        ) {
          throw new TypeError("Invalid package name");
        }

        return value;
      })
      .makeOptionMandatory(),
  )
  .requiredOption("-v, --version <version>", "version", "1.0.0")
  .option("-d, --description [description]", "description")
  .option("-m, --main [entry]", "entry point", "index.js")
  .option("-t, --test [test]", "test command")
  .option("-g, --git [git]", "git repository")
  .addOption(
    new InteractiveOption("-k, --keywords [keywords...]", "keywords").argParser(
      (value) => value.split(/[ ,]+/g).filter(Boolean),
    ),
  )
  .option("-a, --author [author]", "author")
  .option("-l, --license [license]", "license", "ISC")
  .addOption(
    // This option is defined here for generating the help message
    new InteractiveOption("-y, --yes", "confirm the creation of package.json")
      // eslint-disable-next-line unicorn/no-useless-undefined
      .prompt(undefined),
  )
  .action(
    async (
      {
        confirm,
        // This option is for the subcommand "init". When positional
        // options are not enabled, this value is always set to the default
        // value (true)
        interactive,
        ...otherOptions
      },
      command: InteractiveCommand,
    ) => {
      let newConfirm = confirm === true || confirm === undefined;

      const isInteractive = Boolean(command.optsWithGlobals().interactive);
      if (isInteractive) {
        console.log(
          JSON.stringify(createPackageJson(otherOptions), undefined, 2),
        );

        newConfirm = await inquirer.confirm({
          message: "Is this OK?",
          default: Boolean(newConfirm),
        });
      }

      if (!newConfirm) {
        console.log("Aborted.");
        return;
      }

      console.log("TODO: create package.json with the following contents:");
      console.log(
        JSON.stringify(createPackageJson(otherOptions), undefined, 2),
      );
    },
  );

await program
  .interactive("-I, --no-interactive", "disable interactive mode")
  .parseAsync()
  .catch((error) => {
    if (
      !(
        error instanceof Error &&
        error.message.startsWith("User force closed the prompt with")
      )
    ) {
      throw error;
    }
  });

// Try the following commands, with and without a package.json in the current working directory:
// npm-init init
// npm-init init --name foo
// npm-init init -I --name foo --version "2.0.0"
