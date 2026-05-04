{
  description = "Generic NixOS base image for DigitalOcean";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/13868c071cc73a5e9f610c47d7bb08e5da64fdd5";
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
      nixosModules.digitalocean-base = import ./modules/digitalocean-base.nix;

      nixosConfigurations.digitalocean-base = lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          self.nixosModules.digitalocean-base
        ];
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
