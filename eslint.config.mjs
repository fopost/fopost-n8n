import { config } from '@n8n/node-cli/eslint';
import { globalIgnores } from 'eslint/config';

// The jest harness opens real sockets so nock can intercept them; it never ships
// (`files: ["dist"]`), so it is outside the node rules that guard the package.
export default [globalIgnores(['test/**', 'jest.config.js']), ...config];
