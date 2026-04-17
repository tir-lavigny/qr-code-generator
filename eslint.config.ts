// @ts-nocheck — ESLint's defineConfig generics don't align perfectly with
// plugin types; the config is correct at runtime.
import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
    // TypeScript files
    ...tseslint.configs.recommended,

    // Vue files — delegate <script lang="ts"> to @typescript-eslint/parser
    {
        files: ['**/*.vue'],
        plugins: { vue },
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.vue'],
                sourceType: 'module',
            },
        },
        rules: {
            ...vue.configs['flat/recommended'].reduce(
                (acc, c) => ({ ...acc, ...c.rules }),
                {}
            ),
            // vue/comment-directive fires false positives in ESLint v10
            'vue/comment-directive': 'off',
        },
    },

    // Relax rules for shadcn-vue generated UI components (third-party code)
    {
        files: ['src/components/ui/**/*.vue', 'src/components/ui/**/*.ts'],
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    // Prettier must be last to disable conflicting formatting rules
    prettierConfig,
])
