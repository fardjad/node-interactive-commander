import assert from "node:assert";
import { test } from "node:test";
import type * as inquirer from "@inquirer/prompts";
/* eslint-disable @typescript-eslint/promise-function-async */
import { InteractiveCommand } from "./interactive-command.ts";
import { InteractiveOption, parseArgToValidate } from "./interactive-option.ts";

type CancelablePromise<Value> = Promise<Value> & {
  /** @deprecated pass an AbortSignal in the context options instead. See {@link https://github.com/SBoudrias/Inquirer.js#canceling-prompt} */
  cancel: () => void;
};

const createCancelablePromise = <T>(promise: Promise<T>) => {
  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then(
      (value) => {
        resolve(value);
      },
      (error) => {
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error("An error occurred"));
        }
      },
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  (wrappedPromise as CancelablePromise<T>).cancel = () => {};

  return wrappedPromise as CancelablePromise<T>;
};

await test("defaultReadFunction", async (t) => {
  let select = t.mock.fn<typeof inquirer.select>();
  let confirm = t.mock.fn<typeof inquirer.confirm>();
  let input = t.mock.fn<typeof inquirer.input>();
  const dummyCommand = new InteractiveCommand();

  t.beforeEach(() => {
    select = t.mock.fn();
    confirm = t.mock.fn();
    input = t.mock.fn();
  });

  await t.test("boolean", async (t) => {
    const option = new InteractiveOption("-b, --boolean", "boolean option", {
      confirm,
    });

    await option.readFunction!(false, option, dummyCommand);
    assert.strictEqual(confirm.mock.calls.length, 1);
    assert.deepStrictEqual(confirm.mock.calls[0].arguments, [
      { default: false, message: "boolean option" },
    ]);
  });

  await t.test("boolean - negate", async (t) => {
    const option = new InteractiveOption("-B, --no-boolean", "boolean option", {
      confirm,
    });

    await option.readFunction!(false, option, dummyCommand);
    assert.strictEqual(confirm.mock.calls.length, 1);
    assert.deepStrictEqual(confirm.mock.calls[0].arguments, [
      { default: true, message: "boolean option" },
    ]);
  });

  await t.test("choices - default value", async (t) => {
    const option = new InteractiveOption("-c, --choices <choices>", "choices", {
      select,
    })
      .choices(["a", "b", "c"])
      .default("c")
      // This must be called after choices because it resets the parser
      .argParser(undefined as unknown as () => unknown);

    await option.readFunction!(undefined, option, dummyCommand);
    assert.strictEqual(select.mock.calls.length, 1);
    assert.deepStrictEqual(select.mock.calls[0].arguments, [
      {
        choices: [
          // The default option must be the first
          {
            value: "c",
          },
          // The rest must keep the order
          {
            value: "a",
          },
          {
            value: "b",
          },
        ],
        message: "choices",
      },
    ]);
  });

  await t.test("choices - current value", async (t) => {
    const option = new InteractiveOption("-c, --choices <choices>", "choices", {
      select,
    })
      .choices(["a", "b", "c"])
      .default("c")
      // This must be called after choices because it resets the parser
      .argParser(undefined as unknown as () => unknown);

    await option.readFunction!("b", option, dummyCommand);
    assert.strictEqual(select.mock.calls.length, 1);
    assert.deepStrictEqual(select.mock.calls[0].arguments, [
      {
        choices: [
          {
            value: "b",
          },
          // The rest must keep the order
          {
            value: "a",
          },
          {
            value: "c",
          },
        ],
        message: "choices",
      },
    ]);
  });

  await t.test("choices - default argParser", async (t) => {
    const option = new InteractiveOption("-c, --choices <choices>", "choices", {
      select,
    }).choices(["a", "b", "c"]);

    await assert.rejects(
      async () => {
        await option.readFunction!(undefined, option, dummyCommand);
      },
      { code: "commander.invalidArgument" },
    );
  });

  await t.test("input", async (t) => {
    const option = new InteractiveOption("-s, --str <value>", "string", {
      input,
    });

    await option.readFunction!("default", option, dummyCommand);
    assert.strictEqual(input.mock.calls.length, 1);
    assert.deepStrictEqual(input.mock.calls[0].arguments, [
      {
        default: "default",
        message: "string",
        // ignore the validate function
        validate: input.mock.calls[0].arguments[0].validate,
      },
    ]);
    assert.strictEqual(
      typeof input.mock.calls[0].arguments[0].validate,
      "function",
    );
  });

  await t.test("input - custom argParser", async (t) => {
    const parseArgument = t.mock.fn();

    const option = new InteractiveOption("-s, --str <value>", "string", {
      input: () => createCancelablePromise(Promise.resolve("answer")),
    }).argParser(parseArgument);

    await option.readFunction!("default", option, dummyCommand);
    assert.strictEqual(parseArgument.mock.calls.length, 1);
  });

  await t.test("input - no argParser", async (t) => {
    const option = new InteractiveOption("-s, --str <value>", "string", {
      input: () => createCancelablePromise(Promise.resolve("answer")),
    });

    const answer = await option.readFunction!("default", option, dummyCommand);
    assert.strictEqual(answer, "answer");
  });
});

await test("parseArgToValidate", async (t) => {
  await t.test("when parseArg is undefined", async (t) => {
    assert.strictEqual(parseArgToValidate()("value"), true);
  });

  await t.test("when parseArg throws an error", async (t) => {
    const parseArg = t.mock.fn(() => {
      throw new Error("dummy error");
    });

    assert.strictEqual(parseArgToValidate(parseArg)("value"), "dummy error");
    assert.strictEqual(parseArg.mock.calls.length, 1);
  });

  await t.test("when parseArg does not throw", async (t) => {
    const parseArg = t.mock.fn();

    assert.strictEqual(parseArgToValidate(parseArg)("value"), true);
    assert.strictEqual(parseArg.mock.calls.length, 1);
  });
});
