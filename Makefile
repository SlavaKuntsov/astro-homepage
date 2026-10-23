# Makefile — a thin wrapper around the pnpm scripts in package.json.
# Run `make` (or `make help`) to list the available targets.

.DEFAULT_GOAL := help
.PHONY: help install dev build preview astro check test test-e2e clean

help: ## Show this help
	@echo "Usage: make <target>"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm install)
	pnpm install

dev: ## Start the dev server at http://localhost:4321
	pnpm dev

build: ## Build the production site to ./dist/
	pnpm build

preview: ## Preview the production build
	pnpm preview

astro: ## Run the Astro CLI, e.g. make astro ARGS="add mdx"
	pnpm astro $(ARGS)

check: ## Typecheck the project (astro check)
	pnpm check

test: ## Run the Vitest unit suite
	pnpm test

test-e2e: ## Build, then run Playwright against the preview
	pnpm test:e2e

clean: ## Remove build output and caches (dist/, .astro/, node_modules/)
	rm -rf dist .astro node_modules
