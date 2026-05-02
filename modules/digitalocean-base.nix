{
  lib,
  modulesPath,
  pkgs,
  ...
}: {
  imports = [
    (modulesPath + "/virtualisation/digital-ocean-config.nix")
  ];

  nix.settings.experimental-features = ["nix-command" "flakes"];

  boot.loader.timeout = lib.mkDefault 10;

  services.openssh.enable = lib.mkDefault true;
  services.openssh.settings.PasswordAuthentication = lib.mkDefault false;
  services.openssh.settings.KbdInteractiveAuthentication = lib.mkDefault false;

  virtualisation.digitalOcean.setSshKeys = lib.mkDefault true;
  virtualisation.digitalOcean.seedEntropy = lib.mkDefault true;

  services.do-agent.enable = lib.mkDefault true;

  system.stateVersion = lib.mkDefault "25.11";
}
