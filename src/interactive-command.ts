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
  /**
   * The command that its parseAsync method is called
   */
  private _isRootCommand = false;
  private _hasHook = false;

  // The following will only be set on the root command
  private _providedOptions: Map<Command, OptionValues> | undefined;
  private _missingOptions: Map<Command, Set<string>> | undefined;
  private _providedOptionsSources:
    | Map<Command, Map<string, OptionValueSource | undefined>>
    | undefined;

  createCommand(name?: string): InteractiveCommand {
    return new InteractiveCommand(name);
  }

  createOption(flags: string, description?: string): InteractiveOption {
    return new InteractiveOption(flags, description);
  }

  /**
   * Enable interactive mode
   *
   * This method recursively auto-registers the "-i, --interactive" flag which
   * prompts the user for missing (interactive) options.
   *
   * You can optionally supply the flags and description to override the
   * defaults.
   *
   * This method should almost always be called on the root command, after all
   * subcommands are hooks are added/configured.
   */
  interactive(flags?: string, description?: string): this {
    const newOption = new Option(
      flags ?? `-i, --interactive`,
      description ?? "interactive mode",
    );

    const existingOption = this.options.find(
      (option) => option.attributeName() === newOption.attributeName(),
    );

    if (!existingOption) {
      this.addOption(newOption);
      this._interactiveOptionName = newOption.attributeName();
    }

    this.addHookIfAbsent();

    for (const command of this.commands as Array<
      InteractiveCommand | Command
    >) {
      if (!(command instanceof InteractiveCommand)) {
        continue;
      }

      command.interactive(flags, description);
    }

    return this;
  }

  parse(argv?: readonly string[], options?: ParseOptions): this {
    throw new Error("parse is not supported! Use parseAsync instead!");
  }

  async parseAsync(
    argv?: readonly string[],
    options?: ParseOptions,
  ): Promise<this> {
    this._isRootCommand = true;
    try {
      const { providedOptions, missingOptions, providedOptionsSources } =
        partialParse(this, argv ?? process.argv, options);

      this._providedOptions = providedOptions;
      this._missingOptions = missingOptions;
      this._providedOptionsSources = providedOptionsSources;
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

  private findRootCommand(): InteractiveCommand {
    // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
    let currentCommand: InteractiveCommand | undefined = this;

    while (currentCommand) {
      if (currentCommand._isRootCommand) {
        return currentCommand;
      }

      currentCommand = currentCommand.parent as InteractiveCommand | undefined;
    }

    throw new Error("Root command not found!");
  }

  private addHookIfAbsent() {
    if (this._hasHook) {
      return;
    }

    this._hasHook = true;

    this.hook(
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

        const rootCommand = this.findRootCommand();
        const providedOptions = rootCommand._providedOptions;
        const missingOptions = rootCommand._missingOptions;
        const providedOptionsSources = rootCommand._providedOptionsSources;

        for (const command of [thisCommand, actionCommand]) {
          const cliOptions = new Set(
            [...(providedOptionsSources?.get(command)?.entries() ?? [])]
              .filter(([_, value]) => value === "cli")
              .map(([key]) => key),
          );
          const optionKeys = [
            ...Object.keys(providedOptions?.get(command) ?? {}),
            ...(missingOptions?.get(command)?.keys() ?? new Set()),
          ] as string[];
          const nonCliOptions = optionKeys
            .filter((key) => !cliOptions.has(key))
            .map((key) =>
              command.options.find((option) => option.attributeName() === key),
            )
            .filter(Boolean) as Option[];

          await command.readMissingOptions(
            nonCliOptions,
            providedOptions?.get(command) ?? {},
          );
        }
      },
    );
  }
}
