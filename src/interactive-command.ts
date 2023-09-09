/* eslint-disable no-await-in-loop */
import { InteractiveOption } from "./interactive-option.ts";
import {
  Command,
  type ParseOptions,
  type OptionValueSource,
  type OptionValues,
  Option,
} from "commander";
import { partialParse } from "parse-my-command";

export class InteractiveCommand extends Command {
  private _interactiveOptionName = "interactive";
  private _providedOptions: Map<Command, OptionValues> | undefined;
  private _missingOptions: Map<Command, Set<string>> | undefined;
  private _providedOptionsSources:
    | Map<Command, Map<string, OptionValueSource | undefined>>
    | undefined;

  constructor(...arguments_: ConstructorParameters<typeof Command>) {
    super(...arguments_);

    this.installHook(this);
  }

  createCommand(name?: string): InteractiveCommand {
    const cmd = new InteractiveCommand(name);
    this.installHook(cmd);

    const interactiveOption = this.options.find(
      (option) => option.attributeName() === this._interactiveOptionName,
    );

    if (interactiveOption) {
      cmd.interactive(interactiveOption.flags, interactiveOption.description);
    }

    return cmd;
  }

  /**
   * Enable interactive mode
   *
   * This method auto-registers the "-i, --interactive" flag which prompts the
   * user for missing (interactive) options.
   *
   * You can optionally supply the flags and description to override the defaults.
   */
  interactive(flags?: string, description?: string): this {
    const option = new Option(
      flags ?? `-i, --interactive`,
      description ?? "interactive mode",
    );
    this.addOption(option);
    this._interactiveOptionName = option.attributeName();

    return this;
  }

  parse(argv?: readonly string[], options?: ParseOptions): this {
    throw new Error("parse is not supported! Use parseAsync instead!");
  }

  async parseAsync(
    argv?: readonly string[],
    options?: ParseOptions,
  ): Promise<this> {
    try {
      this.partialParse(argv, options);
    } catch {}

    return super.parseAsync(argv, options);
  }

  private async readMissingOptions(
    options: Option[],
    providedOptions: OptionValues,
  ) {
    for (const option of options) {
      if (!(option instanceof InteractiveOption && option.readFunction)) {
        continue;
      }

      const key = option.attributeName();
      const value = await option.readFunction(
        providedOptions[key],
        option,
        this,
      );

      if (option.required && value === undefined) {
        (
          this as this & {
            missingMandatoryOptionValue: (Option: InteractiveOption) => void;
          }
        ).missingMandatoryOptionValue(option);
      }

      this.setOptionValue(option.attributeName(), value);
    }
  }

  private partialParse(
    argv: readonly string[] = process.argv,
    options?: ParseOptions,
  ) {
    const { providedOptions, missingOptions, providedOptionsSources } =
      partialParse(this, argv, options);

    this._providedOptions = providedOptions;
    this._missingOptions = missingOptions;
    this._providedOptionsSources = providedOptionsSources;
  }

  private installHook(cmd: InteractiveCommand) {
    cmd.hook(
      "preSubcommand",
      async (
        thisCommand: InteractiveCommand,
        actionCommand: InteractiveCommand,
      ) => {
        if (
          !(thisCommand instanceof InteractiveCommand) ||
          !(actionCommand instanceof InteractiveCommand)
        ) {
          return;
        }

        if (!thisCommand.optsWithGlobals()[this._interactiveOptionName]) {
          return;
        }

        for (const command of [thisCommand, actionCommand]) {
          const cliOptions = new Set(
            [...(this._providedOptionsSources?.get(command)?.entries() ?? [])]
              .filter(([_, value]) => value === "cli")
              .map(([key]) => key),
          );
          const optionKeys = [
            ...Object.keys(this._providedOptions?.get(command) ?? {}),
            ...(this._missingOptions?.get(command)?.keys() ?? new Set()),
          ] as string[];
          const nonCliOptions = optionKeys
            .filter((key) => !cliOptions.has(key))
            .map((key) =>
              command.options.find((option) => option.attributeName() === key),
            )
            .filter(Boolean) as Option[];

          await command.readMissingOptions(
            nonCliOptions,
            this._providedOptions?.get(command) ?? {},
          );
        }
      },
    );
  }
}
