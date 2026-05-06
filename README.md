# nixos-digitalocean

A generic, reusable NixOS base image for DigitalOcean droplets.

## Releases

Pre-built images are published on the [Releases page](../../releases). Each release includes a `.qcow2.gz` image and SHA256 checksum, validated by CI on a live DigitalOcean droplet before publishing.

## Quick start

### 1. Import the image

```bash
RELEASE="v20260504"
IMAGE_URL="https://github.com/adampoit/nixos-digitalocean/releases/download/${RELEASE}/nixos-digitalocean-base-${RELEASE}.qcow2.gz"

doctl compute image create "nixos-do-base-${RELEASE}" \
  --region sfo3 \
  --image-distribution Unknown \
  --image-url "$IMAGE_URL"
```

Wait for the image to become `available` (typically 5–15 minutes):

```bash
doctl compute image list-user --output json | \
  jq '.[] | select(.name | contains("nixos-do-base")) | {id, name, status, regions}'
```

### 2. Create a droplet

You **must** use an SSH key — custom images do not support password reset via the control panel.

```bash
IMAGE_ID=$(doctl compute image list-user --output json | \
  jq -r ".[] | select(.name == \"nixos-do-base-${RELEASE}\") | .id")

doctl compute droplet create my-nixos-droplet \
  --region sfo3 \
  --size s-1vcpu-1gb \
  --image "$IMAGE_ID" \
  --ssh-keys "$SSH_KEY_ID" \
  --wait
```

> **Note:** `--enable-monitoring` is not supported for custom images, but the base module includes `do-agent`.

### 3. Connect via SSH

```bash
ssh root@<droplet-ip>
```

Password authentication is disabled by default. Use the SSH key you provided to `doctl`.

## Maintaining a droplet with deploy-rs

Add this repo as a flake input and deploy changes directly:

```nix
{
  inputs.nixos-digitalocean.url = "github:adampoit/nixos-digitalocean";

  outputs = { self, nixos-digitalocean, deploy-rs, ... }: {
    nixosConfigurations.my-droplet = nixos-digitalocean.lib.mkDigitalOceanSystem {
      system = "x86_64-linux";
      modules = [
        ./my-host-configuration.nix
      ];
    };

    deploy.nodes.my-droplet = {
      hostname = "<droplet-ip>";
      sshUser = "root";
      profiles.system = {
        user = "root";
        path = deploy-rs.lib.x86_64-linux.activate.nixos self.nixosConfigurations.my-droplet;
      };
    };
  };
}
```

Deploy with:

```bash
nix run github:serokell/deploy-rs -- .#my-droplet
```

For major NixOS upgrades, use `--boot` followed by a reboot:

```bash
nix run github:serokell/deploy-rs -- --boot .#my-droplet
# ...then reboot the droplet
```

## Building the image locally

```bash
nix build .#packages.x86_64-linux.digitalocean-image
```

Or on NixOS:

```bash
nixos-rebuild build-image --image-variant digital-ocean --flake .#digitalocean-base
```

The resulting image will be symlinked at `./result/`.

## What's in the base module

- Imports Nixpkgs' official `digital-ocean-config.nix`
- Enables `nix-command` and `flakes` experimental features
- Sets a 10-second GRUB timeout
- Enables OpenSSH with password and keyboard-interactive auth disabled
- Enables DigitalOcean SSH key and entropy seeding
- Enables the DigitalOcean monitoring agent (`do-agent`)

## License

MIT — see [LICENSE](LICENSE).

## Releasing

Releases are automated via GitHub Actions:

1. `nix flake update` bumps inputs (weekly PR via [update-flake.yml](.github/workflows/update-flake.yml))
2. Merge the PR
3. `git tag -a vYYYYMMDD -m "..." && git push origin vYYYYMMDD`
4. CI builds the image, imports it to DigitalOcean, tests fresh boot and upgrade from the previous release, then publishes the GitHub release.
