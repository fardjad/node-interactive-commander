import { type RegisterFunction } from "../command-plugin.ts";

export const register: RegisterFunction = async (command) => {
  command.command("test-plugin");
};
