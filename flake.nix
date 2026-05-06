{
  description = "Generic NixOS base image for DigitalOcean";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    deploy-rs.url = "github:serokell/deploy-rs";
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    flake-utils,
    deploy-rs,
    ...
  }: let
    lib = nixpkgs.lib;
    mkDigitalOceanSystem = {
      system ? "x86_64-linux",
      modules ? [],
      specialArgs ? {},
    }:
      lib.nixosSystem {
        inherit system specialArgs;
        modules =
          [
            self.nixosModules.digitalocean-base
          ]
          ++ modules;
      };
  in
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.alejandra
            deploy-rs.packages.${system}.default
          ];
        };

        formatter = pkgs.alejandra;
      }
    )
    // {
      lib.mkDigitalOceanSystem = mkDigitalOceanSystem;

      nixosModules.digitalocean-base = import ./modules/digitalocean-base.nix;

      nixosConfigurations.digitalocean-base = mkDigitalOceanSystem {
        system = "x86_64-linux";
      };

      packages.x86_64-linux.digitalocean-image =
        self.nixosConfigurations.digitalocean-base.config.system.build.images.digital-ocean;

      deploy.nodes.test-droplet = {
        hostname = "test-droplet";
        sshUser = "root";
        profiles.system = {
          user = "root";
          path = deploy-rs.lib.x86_64-linux.activate.nixos self.nixosConfigurations.digitalocean-base;
        };
      };
    };
}
