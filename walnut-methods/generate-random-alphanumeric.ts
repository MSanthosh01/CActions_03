import type { WalnutBaseContext } from './walnut';
import * as crypto from 'crypto';

/** @walnut_method
 * name: Generate Random Alphanumeric
 * description: Generate random alphanumeric string of length ${length} and store in $[randomValue]
 * actionType: custom_generate_random_alphanumeric
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function generateRandomAlphanumeric(ctx: WalnutBaseContext) {
  const length = parseInt(ctx.args[0], 10);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  ctx.setVariable(ctx.args[1], result);
  ctx.log('Generated random alphanumeric of length ' + length + ': ' + result);
}
