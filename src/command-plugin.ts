import type { InteractiveCommand } from "./interactive-command.ts";

/**
 * @param command The command instance that the plugin is registered on
 */
export type RegisterFunction = (
  command: InteractiveCommand,
) => Promise<void> | void;
