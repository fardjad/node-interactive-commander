import { type InteractiveCommand } from "./interactive-command.ts";
import * as inquirer from "@inquirer/prompts";
import { Option } from "commander";

export type ReadFunction = (
  currentValue: unknown,
  option: InteractiveOption,
  command: InteractiveCommand,
) => Promise<unknown>;

export type PromptFunctions = {
  confirm: typeof inquirer.confirm;
  input: typeof inquirer.input;
  select: typeof inquirer.select;
};

export class InteractiveOption extends Option {
  public readFunction: ReadFunction | undefined = this._defaultReadFunction;
  private readonly _promptFunctions: PromptFunctions;

  constructor(
    flags: string,
    description?: string,
    promptFunctions?: Partial<PromptFunctions>,
  ) {
    super(flags, description);

    this._promptFunctions = promptFunctions
      ? {
          confirm: promptFunctions.confirm ?? inquirer.confirm,
          input: promptFunctions.input ?? inquirer.input,
          select: promptFunctions.select ?? inquirer.select,
        }
      : inquirer;
  }

  /**
   * Set a function that will be called to read the option value interactively.
   * When undefined is passed, the prompt will be skipped.
   *
   * @param readFunction
   * @returns
   */
  prompt(readFunction: ReadFunction | undefined): this {
    this.readFunction = readFunction;

    return this;
  }

  private async _defaultReadFunction(
    currentValue: unknown,
    option: InteractiveOption,
    _command: InteractiveCommand,
  ): Promise<unknown> {
    if (option.isBoolean() || option.negate) {
      const answer = await this._promptFunctions.confirm({
        message: option.description,
        default: option.negate ? !currentValue : Boolean(currentValue),
      });

      return option.negate ? !answer : answer;
    }

    if (option.argChoices) {
      const answer = await this._promptFunctions.select({
        message: option.description,
        choices: [...option.argChoices]
          .sort((value) =>
            (currentValue !== undefined && value === currentValue) ||
            (currentValue === undefined && value === option.defaultValue)
              ? -1
              : 0,
          )
          .map((choice) => ({ value: choice })),
      });

      return option.parseArg
        ? option.parseArg(answer, undefined as unknown)
        : answer;
    }

    const answer = await this._promptFunctions.input({
      message: option.description,
      default: currentValue as string,
    });

    if (!answer || answer.length === 0) {
      return;
    }

    return option.parseArg
      ? option.parseArg(answer, undefined as unknown)
      : answer;
  }
}
