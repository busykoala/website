/**
 * Auto-discovery and registration of commands
 * Eliminates manual import and registration boilerplate
 */

import { Shell } from '../core/Shell';
import type { CommandContext } from '../core/TerminalCore';
import type { IOStreams } from '../core/streams';

// Import all command modules statically so bundlers include them reliably
import { catAsyncCommand } from '../commands/catAsync';
import { cdAsyncCommand } from '../commands/cdAsync';
import { chmodAsyncCommand } from '../commands/chmodAsync';
import { chownAsyncCommand } from '../commands/chownAsync';
import { clearAsyncCommand } from '../commands/clearAsync';
import { cmatrixAsyncCommand } from '../commands/cmatrixAsync';
import { cowsayAsyncCommand } from '../commands/cowsayAsync';
import { cpAsyncCommand } from '../commands/cpAsync';
import { dateAsyncCommand } from '../commands/dateAsync';
import { dfAsyncCommand } from '../commands/dfAsync';
import { duAsyncCommand } from '../commands/duAsync';
import { echoAsyncCommand } from '../commands/echoAsync';
import { envAsyncCommand } from '../commands/envAsync';
import { exportAsyncCommand } from '../commands/exportAsync';
import { findAsyncCommand } from '../commands/findAsync';
import { fortuneAsyncCommand } from '../commands/fortuneAsync';
import { grepAsyncCommand } from '../commands/grepAsync';
import { headAsyncCommand } from '../commands/headAsync';
import { helpAsyncCommand } from '../commands/helpAsync';
import { historyAsyncCommand } from '../commands/historyAsync';
import { hostnameAsyncCommand } from '../commands/hostnameAsync';
import { idAsyncCommand } from '../commands/idAsync';
import { lsAsyncCommand } from '../commands/lsAsync';
import { mkdirAsyncCommand } from '../commands/mkdirAsync';
import { mvAsyncCommand } from '../commands/mvAsync';
import { pwdAsyncCommand } from '../commands/pwdAsync';
import { rmAsyncCommand } from '../commands/rmAsync';
import { slAsyncCommand } from '../commands/slAsync';
import { tailAsyncCommand } from '../commands/tailAsync';
import { touchAsyncCommand } from '../commands/touchAsync';
import { treeAsyncCommand } from '../commands/treeAsync';
import { unameAsyncCommand } from '../commands/unameAsync';
import { unsetAsyncCommand } from '../commands/unsetAsync';
import { wcAsyncCommand } from '../commands/wcAsync';
import { whoamiAsyncCommand } from '../commands/whoamiAsync';

export interface CommandModule {
  execute: (args: string[], context: CommandContext, io: IOStreams) => Promise<number>;
  description: string; // required for registration
  usage?: string;
  name?: string;
}

/**
 * Register all commands with the shell
 */
export async function registerAllCommands(shell: Shell): Promise<void> {
  const modules: Array<[string, CommandModule]> = [
    ['cat', catAsyncCommand],
    ['cd', cdAsyncCommand],
    ['chmod', chmodAsyncCommand],
    ['chown', chownAsyncCommand],
    ['clear', clearAsyncCommand],
    ['cmatrix', cmatrixAsyncCommand],
    ['cowsay', cowsayAsyncCommand],
    ['cp', cpAsyncCommand],
    ['date', dateAsyncCommand],
    ['df', dfAsyncCommand],
    ['du', duAsyncCommand],
    ['echo', echoAsyncCommand],
    ['env', envAsyncCommand],
    ['export', exportAsyncCommand],
    ['find', findAsyncCommand],
    ['fortune', fortuneAsyncCommand],
    ['grep', grepAsyncCommand],
    ['head', headAsyncCommand],
    ['help', helpAsyncCommand],
    ['history', historyAsyncCommand],
    ['hostname', hostnameAsyncCommand],
    ['id', idAsyncCommand],
    ['ls', lsAsyncCommand],
    ['mkdir', mkdirAsyncCommand],
    ['mv', mvAsyncCommand],
    ['pwd', pwdAsyncCommand],
    ['rm', rmAsyncCommand],
    ['sl', slAsyncCommand],
    ['tail', tailAsyncCommand],
    ['touch', touchAsyncCommand],
    ['tree', treeAsyncCommand],
    ['uname', unameAsyncCommand],
    ['unset', unsetAsyncCommand],
    ['wc', wcAsyncCommand],
    ['whoami', whoamiAsyncCommand],
  ];

  for (const [name, mod] of modules) {
    if (mod && typeof mod.execute === 'function') {
      shell.registerCommand(name, mod.execute, mod.description, mod.usage);
    }
  }
}
