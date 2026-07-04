import antfu from "@antfu/eslint-config";

export default antfu({
  formatters: true,
  vue: true,
  stylistic: {
    quotes: "double",
    semi: true,
  },
  rules: {
    "no-console": "warn",
    "antfu/no-top-level-await": "off",
  },
});
