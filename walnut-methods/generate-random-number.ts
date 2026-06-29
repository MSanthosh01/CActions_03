import type { WalnutContext } from './walnut';
import * as crypto from 'crypto';

/** @walnut_method
 * name: Generate Random Number
 * description: Generate random number of length ${length} and store in $[randomNumber]
 * actionType: custom_generate_random_number
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function generateRandomNumber(ctx: WalnutContext) {
  const length = parseInt(ctx.args[0], 10);
  const bytes = crypto.randomBytes(length);
  let result = '';
  // Ensure the first digit is never 0 (so the number has the exact requested length)
  result += (bytes[0] % 9) + 1;
  for (let i = 1; i < length; i++) {
    result += bytes[i] % 10;
  }
  ctx.setVariable(ctx.args[1], result);
  ctx.log('Generated random number of length ' + length + ': ' + result);
}
