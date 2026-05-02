# nixos-digitalocean

A generic, reusable NixOS base image for DigitalOcean droplets.

## What this repo provides

- `nixosModules.digitalocean-base` — a NixOS module with sensible DigitalOcean defaults
- `nixosConfigurations.digitalocean-base` — a ready-to-build NixOS system
- `packages.x86_64-linux.digitalocean-image` — a DigitalOcean-compatible `.qcow2.gz` image

## Building the image locally

```bash
nix build .#packages.x86_64-linux.digitalocean-image
```

Or on NixOS:

```bash
nixos-rebuild build-image --image-variant digital-ocean --flake .#digitalocean-base
```

The resulting image will be symlinked at `./result/`.

## Using the public module in your own flake

```nix
{
  inputs.nixos-do-base.url = "github:adampoit/nixos-digitalocean/vYYYYMMDD";

  outputs = { self, nixpkgs, nixos-do-base, ... }: {
    nixosConfigurations.my-droplet = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        nixos-do-base.nixosModules.digitalocean-base
        ./my-host-configuration.nix
      ];
    };
  };
}
```

## Importing the image into DigitalOcean

1. Download the release artifact (`.qcow2.gz`) and checksum from [Releases](../../releases).
2. Upload it to a public HTTPS URL (e.g. GitHub Releases, S3, etc.).
3. Import it with `doctl`:

```bash
doctl compute image create "nixos-do-base-YYYYMMDD" \
  --region sfo3 \
  --image-distribution Unknown \
  --image-url "https://example.com/nixos-do-base-YYYYMMDD.qcow2.gz" \
  --tag-names nixos,digitalocean-base
```

4. Wait until the image status is `available`. Image imports can take 10+ minutes:

```bash
doctl compute image list-user --output json | \
  jq '.[] | select(.name == "nixos-do-base-YYYYMMDD") | {id, name, status, regions}'
```

5. Create a droplet from the custom image. You **must** use an SSH key — custom images do not support password reset via the control panel:

```bash
doctl compute droplet create my-nixos-droplet \
  --region sfo3 \
  --size s-1vcpu-1gb \
  --image "$IMAGE_ID" \
  --ssh-keys "$SSH_KEY_ID" \
  --wait
```

> **Note:** `--enable-monitoring` is not supported for custom images.

## What's in the base module

- Imports Nixpkgs' official `digital-ocean-config.nix`
- Enables `nix-command` and `flakes` experimental features
- Sets a 10-second GRUB timeout
- Enables OpenSSH with password and keyboard-interactive auth disabled
- Enables DigitalOcean SSH key and entropy seeding
- Enables the DigitalOcean monitoring agent (`do-agent`)
