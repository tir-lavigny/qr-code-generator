import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
    ...vue.configs['flat/recommended'],
    prettierConfig,
])
