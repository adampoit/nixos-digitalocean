{
  description = "Generic NixOS base image for DigitalOcean";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    flake-utils,
    ...
  }: let
    lib = nixpkgs.lib;
  in
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.alejandra
          ];
        };

        formatter = pkgs.alejandra;
      }
    )
    // {
      nixosModules.digitalocean-base = import ./modules/digitalocean-base.nix;

      nixosConfigurations.digitalocean-base = lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          self.nixosModules.digitalocean-base
        ];
      };

      packages.x86_64-linux.digitalocean-image =
        self.nixosConfigurations.digitalocean-base.config.system.build.images.digital-ocean;
    };
}
