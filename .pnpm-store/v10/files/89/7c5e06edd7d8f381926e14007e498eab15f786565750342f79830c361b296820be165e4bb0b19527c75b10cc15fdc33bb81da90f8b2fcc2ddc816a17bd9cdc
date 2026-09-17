import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    rules:{
      "semi": 2,
      "no-multiple-empty-lines": 2,
      "no-multi-spaces": 2,
      "comma-spacing": 2,
      "prefer-const": 2,
      "no-trailing-spaces": 2,
      "no-var": 2,
      "indent": [
        "error",
        2,
        {
          "MemberExpression": 1,
          "SwitchCase": 1,
          "ignoredNodes": ["TemplateLiteral > *"]
        }
      ],
    }
  },
  {files: ["**/*.js"], languageOptions: {sourceType: "script"}},
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
];
