# Bantam CLI

Deploy static sites instantly from your terminal.

[![npm version](https://img.shields.io/npm/v/@bantamhq/cli.svg)](https://www.npmjs.com/package/@bantamhq/cli)
[![License](https://img.shields.io/npm/l/@bantamhq/cli.svg)](https://github.com/ryanchmelir/bantam-cli/blob/main/LICENSE)

## What is Bantam?

[Bantam](https://bantam.host) is the fastest way to deploy static sites. No config files, no complex setup - just deploy and share. Perfect for prototypes, documentation, or any static content.

## Installation

```bash
npm install -g @bantamhq/cli
```

Or use without installing:
```bash
npx @bantamhq/cli deploy
```

## Quick Start

Deploy your current directory:
```bash
bantam deploy
```

That's it. Your site is live.

## Features

- **Instant deployments** - Live URLs in seconds
- **Custom domains** - Use your own domain
- **Zero configuration** - Works out of the box
- **Permanent hosting** - Keep projects online forever
- **Directory support** - Auto-zips and deploys folders

## Commands

### `bantam deploy [path]`

Deploy a file or directory.

```bash
# Deploy current directory
bantam deploy

# Deploy specific folder
bantam deploy ./dist

# Deploy with custom subdomain
bantam deploy -s my-project

# Deploy to custom domain
bantam deploy -d example.com
```

**Options:**
- `-s, --subdomain <name>` - Choose subdomain (my-project.bantam.site)
- `-d, --domain <domain>` - Deploy to custom domain
- `-p, --permanent` - Never expires (requires login)
- `-e, --expiry-days <days>` - Set expiration (default: 30 days)
- `-y, --yes` - Skip confirmation

### `bantam login`

Authenticate to unlock features:
- Permanent deployments
- Custom domains
- Project management

```bash
bantam login
```

### `bantam list`

View your deployments.

```bash
# Show all projects
bantam list

# Show with details
bantam list --long
```

### `bantam delete <id>`

Remove a deployment.

```bash
bantam delete 7c3d6f2a-8b9e-4f5d-a1c3-9e8f7d6c5a4b
```

### `bantam domains`

Manage custom domains.

```bash
# List domains
bantam domains

# Show details
bantam domains --verbose
```

## Custom Domains

Deploy to your own domain:

1. Add your domain at [bantam.host/domains](https://bantam.host/domains)
2. Complete DNS verification
3. Deploy:
   ```bash
   bantam deploy -d yourdomain.com
   ```

### Subdomain Support

With wildcard DNS enabled:
```bash
bantam deploy -d app.yourdomain.com
bantam deploy -d staging.yourdomain.com
```

## Examples

### Deploy a React Build

```bash
cd my-react-app
npm run build
bantam deploy ./build -p
```

### Deploy Documentation

```bash
bantam deploy ./docs -s my-docs -p
```

### Quick Share

```bash
# Temporary link for 7 days
bantam deploy -e 7
```

## Authentication

Create a personal access token:

1. Sign up at [bantam.host](https://bantam.host)
2. Generate token in dashboard
3. Run `bantam login`
4. Paste your token

## Pricing

- **Free tier**: 1 Permanent URL (must log in to [bantam.host](https://bantam.host) every 90 days) plus 2 temporary URLs up to 3 days expiry.
- **Paid plans**: Permanent hosting, custom domains, analytics

See [bantam.host/#pricing](https://bantam.host/#pricing) for details.

## Requirements

- Node.js 16 or later
- npm or yarn

## Support

- Documentation: [bantam.host/docs](https://bantam.host/docs)
- Issues: [GitHub Issues](https://github.com/ryanchmelir/bantam-cli/issues)
- Email: support@bantam.host

## License

MIT - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the [Bantam](https://bantam.host) team.
