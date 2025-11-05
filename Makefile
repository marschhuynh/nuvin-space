# Build commands
build:
	pnpm build

build-core:
	pnpm build:core

build-cli:
	pnpm build:cli

clean:
	pnpm clean

# Run commands
run:
	pnpm run:dev

# Development

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test

install: build
	pnpm install -g ~/Projects/nuvin-space/packages/nuvin-cli

ci:
	act -j release -W /Users/marsch/Projects/nuvin-space/.github/workflows/release.yml --container-architecture linux/amd64