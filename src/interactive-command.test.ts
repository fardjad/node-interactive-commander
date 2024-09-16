import assert from "node:assert";
import { test } from "node:test";
import { Command, Option } from "commander";
import type { RegisterFunction } from "./command-plugin.ts";
import { InteractiveCommand } from "./interactive-command.ts";
import { InteractiveOption } from "./interactive-option.ts";

await test("interactive", async (t) => {
  await t.test("unset flags", async () => {
    const interactiveCommand = new InteractiveCommand();

    assert.deepStrictEqual(interactiveCommand.options, []);
  });

  await t.test("default flags", async () => {
    const interactiveCommand = new InteractiveCommand().interactive();

    assert.deepStrictEqual(interactiveCommand.options, [
      new Option("-i, --interactive", "interactive mode"),
    ]);
  });

  await t.test("custom flags", async () => {
    const interactiveCommand = new InteractiveCommand().interactive(
      "-c, --custom",
      "custom option",
    );

    assert.deepStrictEqual(interactiveCommand.options, [
      new Option("-c, --custom", "custom option"),
    ]);
  });

  await t.test("nested commands", async () => {
    const rootCommand = new InteractiveCommand();

    const subCommand = rootCommand.command("sub");

    rootCommand.interactive("-c, --custom", "custom option");

    for (const command of [rootCommand, subCommand]) {
      assert.deepStrictEqual(command.options, [
        new Option("-c, --custom", "custom option"),
      ]);
    }
  });

  await t.test("multiple invokations", async (t) => {
    const readFunction = t.mock.fn(async () => "value");

    const rootCommand = new InteractiveCommand();

    const subCommand = rootCommand
      .command("sub")
      .addOption(
        new InteractiveOption("-c, --custom <value>", "custom option").prompt(
          readFunction,
        ),
      );

    rootCommand.interactive();
    rootCommand.interactive();

    await rootCommand.parseAsync(["node", "test", "sub", "-i"]);

    assert.strictEqual(readFunction.mock.calls.length, 1);
    assert.strictEqual(rootCommand.options.length, 1);
    assert.strictEqual(subCommand.options.length, 2);
  });
});

await test("parse", async (t) => {
  const interactiveCommand = new InteractiveCommand();

  assert.throws(() => {
    interactiveCommand.parse();
  });
});

await test("parseAsync", async (t) => {
  let rootCommand: InteractiveCommand;
  let subCommand: InteractiveCommand;

  t.beforeEach(() => {
    rootCommand = new InteractiveCommand().configureOutput({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      outputError() {},
    });

    rootCommand.exitOverride();
    subCommand = rootCommand.command("sub");

    rootCommand.interactive();
  });

  await t.test("interactive sub-command - non-interactive mode", async (t) => {
    subCommand.requiredOption("-s, --str <string>", "string option");

    await assert.rejects(
      async () => {
        await rootCommand.parseAsync(["node", "test", "sub"]);
      },
      { code: "commander.missingMandatoryOptionValue" },
    );
  });

  await t.test("non-interactive sub-command - interactive mode", async (t) => {
    const nonInteractiveCommand = new Command("non-interactive");
    rootCommand.addCommand(nonInteractiveCommand);

    rootCommand.interactive();

    assert.doesNotThrow(async () => {
      await rootCommand.parseAsync(["node", "test", "non-interactive", "-i"]);
    });
  });

  await t.test(
    "missing non-interactive option - interactive mode",
    async (t) => {
      const parser = t.mock.fn((x: unknown) => x);
      subCommand.addOption(
        new Option("-s, --str <string>", "string option").argParser(parser),
      );

      await rootCommand.parseAsync(["node", "test", "sub", "-i"]);
      assert.strictEqual(parser.mock.calls.length, 0);
    },
  );

  await t.test("missing interactive option - interactive mode", async (t) => {
    const parser = t.mock.fn((x: unknown) => x);
    const promptFunction = t.mock.fn(async () => "value");

    subCommand.addOption(
      new InteractiveOption("-s, --str <string>", "string option")
        // Parser should not be called with a custom prompt function
        .argParser(parser)
        .prompt(promptFunction),
    );

    await rootCommand.parseAsync(["node", "test", "sub", "-i"]);
    assert.strictEqual(promptFunction.mock.calls.length, 1);
    assert.strictEqual(parser.mock.calls.length, 0);
  });

  await t.test("provided interactive option - interactive mode", async (t) => {
    const parser = t.mock.fn((x: unknown) => x);
    const promptFunction = t.mock.fn(async () => "value");

    subCommand.addOption(
      new InteractiveOption("-s, --str <string>", "string option")
        .argParser(parser)
        .prompt(promptFunction),
    );

    await rootCommand.parseAsync(["node", "test", "sub", "-i", "-s", "value"]);
    assert.strictEqual(promptFunction.mock.calls.length, 0);
    // Once with partialParse and once with parseAsync
    assert.strictEqual(parser.mock.calls.length, 2);
  });

  await t.test("prompt function validation", async (t) => {
    const badPromptFunction = t.mock.fn(async () => undefined as unknown);

    subCommand.addOption(
      new InteractiveOption("-s, --str <string>", "string option").prompt(
        badPromptFunction,
      ),
    );

    await assert.rejects(
      async () => {
        await rootCommand.parseAsync(["node", "test", "sub", "-i"]);
      },
      { code: "commander.missingMandatoryOptionValue" },
    );
  });

  await t.test("version option", async (t) => {
    const readFunctionMock = t.mock.fn(async () => true);

    rootCommand.version("1.0.0", "-V, --version");
    const versionOption = rootCommand.options.find(
      (option) => option.short === "-V",
    ) as InteractiveOption;
    versionOption.prompt(readFunctionMock);

    await rootCommand.parseAsync(["node", "test", "sub", "-i"]);

    assert.strictEqual(readFunctionMock.mock.calls.length, 0);
  });
});

await test("plugins", async (t) => {
  const rootCommand = new InteractiveCommand();

  await t.test("register function - sync", async (t) => {
    const mockPlugin = t.mock.fn<RegisterFunction>();
    rootCommand.use(mockPlugin);

    await rootCommand.parseAsync(["node", "test"]);

    assert.strictEqual(mockPlugin.mock.calls.length, 1);
  });

  await t.test("register function - async", async (t) => {
    const mockFunction = t.mock.fn();

    rootCommand.use(
      async (command) =>
        new Promise((resolve) => {
          setImmediate(() => {
            mockFunction(command);
            resolve();
          });
        }),
    );

    await rootCommand.parseAsync(["node", "test"]);

    assert.strictEqual(mockFunction.mock.calls.length, 1);
    assert.strictEqual(mockFunction.mock.calls[0].arguments[0], rootCommand);
  });

  await t.test("dynamic import", async (t) => {
    rootCommand.use(
      new URL("test-support/test-plugin.ts", import.meta.url).toString(),
    );

    await assert.doesNotReject(async () => {
      await rootCommand.parseAsync(["node", "test", "test-plugin"]);
    });
  });
});
