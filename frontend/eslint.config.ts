import * as js from "@eslint/js";
import * as globals from "globals";
import * as tseslint from "typescript-eslint";
import * as pluginReact from "eslint-plugin-react";
import {defineConfig} from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: {js},
        extends: ["js/recommended"],
        languageOptions: {globals: globals.browser}
    },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types":"off",
            "@typescript-eslint/no-unused-vars": ["off", {
                "varsIgnorePattern": "_"
            }],
            "react/no-children-prop": "warn"
        }
    }
]);
