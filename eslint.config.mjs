import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prevent raw HTML primitives in app code - use component library instead
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            {
              element: 'button',
              message: 'Use <Button> from @/components/ui/Button instead of raw <button>',
            },
            {
              element: 'input',
              message: 'Use <Input> from @/components/form/Input instead of raw <input>',
            },
            {
              element: 'textarea',
              message: 'Use <Textarea> from @/components/form/Textarea instead of raw <textarea>',
            },
            {
              element: 'select',
              message: 'Use <Select> from @/components/form/Select instead of raw <select>',
            },
          ],
        },
      ],
    },
    // Apply rule only to pages and app directories, not to component library itself
    files: ['pages/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ignores: ['pages/system/**', 'pages/api/**'],
  },
];

export default eslintConfig;
