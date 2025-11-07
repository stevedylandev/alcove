# Alcove

![cover](https://dev.alcove.tools/og.png)

A privacy focused RSS reader for the open web

> [!WARNING]
> Project is still under beta
> Try it out at [beta.alcove.tools](https://beta.alcove.tools)

## Reasoning

Alcove is built on two principles: **privacy** and **freedom of speech**.

Those two things are becoming harder to find these days, yet blogs and RSS feeds provide a way out. As long as someone is publishing and someone else is listening, these two fundamentals can help keep free speech alive.

Alcove accomplishes privacy through a "can't be evil" tech stack, which you can read more about [here](). **TLDR:** All of your feeds and posts that you read are encrypted locally and synced via cryptographic keypairs. Even if we wanted to read your stuff, we can't. We believe this is important as many other RSS readers cannot make the same promise and would have to hand over the data if ordered by authorities.

## Tech Stack

Alcove is built with [Evolu](https://evolu.dev) to handle the encrypted syncing of feeds. With Evolu each time the app is opened in a browser it spins up an identity used to encrypt and decrypt files, as well as an SQLite instance. As you add feeds or read posts, changes to the db are made and then encrypted before syncing with a relay. The relays let you access your data on another device by recovering your previous identity using a passphrase (mnemonic). Alcove currently has two relay instances:

- `wss://relay.alcove.tools` - Bare metal server
- `wss://relay2.alcove.tools` - Hosted Railway instance

The app also has to use a CORS proxy when fetching RSS feeds as most feeds do not allow cross origin fetching. Alcove will try a direct attempt first, and if it fails then it falls back to `proxy.alcove.tools`, which is a simple instance of [cors-proxy](https://github.com/stevedylandev/cors-proxy) that I have running on bare metal. If for any reason the main proxy is down it will use a fallback of `proxy2.alcove.tools` which is on a Cloudflare Worker.

> [!NOTE]
> While Alcove does everyhing possible to provide privacy it is still recommended to use a VPN to help mask IP addresses

## Quickstart

To start developing Alcove locally follow these steps:

1. Make sure [Bun](https://bun.sh) is installed

```bash
bun --version
```

2. Clone and install dependencies

```bash
git clone https://github.com/stevedylandev/alcove.git
cd alcove
bun install
```

3. Run the dev server

```bash
bun dev
```

4. Run a local relay (Optional)

```bash
bunx @evolu/relay start
```

Update the relay transport in `src/lib/evolu.ts`

## Roadmap

- [x] Mark posts as read/unread
- [x] Import/Export OPML
- [x] Import/Export account through mnemonic
- [x] Refresh/Update Feeds
- [ ] Tweakcn theme switching

## Acknowledgements

Alcove is heavily inspired by [NetNewsWire](https://netnewswire.com/) and [this post](https://inessential.com/2025/10/04/why-netnewswire-is-not-web-app.html) by Brent Simmons

## Questions

[Send me an email](mailto:contact@stevedylan.dev?subject=Alcove)!
