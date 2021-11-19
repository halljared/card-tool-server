module.exports = {
	root: true,
	env: {
		node: true,
	},
	extends: [
    "eslint:recommended",
    "prettier"
	],
	parserOptions: {
		ecmaVersion: 2020,
	},
	rules: {
    semi: "error"
	},
};
