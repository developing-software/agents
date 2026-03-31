{
  description = "Template";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    # flake-utils.url = "github:numtide/flake-utils";
    systems.url = "github:nix-systems/default";
    llm-agents.url = "github:numtide/llm-agents.nix";

    # bun2nix.url = "github:nix-community/bun2nix?tag=2.0.6";
    # bun2nix.inputs.nixpkgs.follows = "nixpkgs";
    # bun2nix.inputs.systems.follows = "systems";
  };

  # Use the cached version of bun2nix from the nix-community cli
  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
      "https://cache.numtide.com"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
      "niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g="
    ];
  };

  outputs =
    inputs:
    let
      eachSystem = inputs.nixpkgs.lib.genAttrs (import inputs.systems);

      pkgsFor = eachSystem (
        system:
        import inputs.nixpkgs {
          inherit system;
          overlays = [ inputs.llm-agents.overlays.default ];
          config.allowUnfree = true;
        }
      );
    in
    {
      devShells = eachSystem (system: {
        default = pkgsFor.${system}.mkShell {
          packages =
            let
              pkgs = pkgsFor.${system};
            in
            with pkgs;
            [
              bun
              nodejs

              postgresql
              pkgs.llm-agents.claude-code
              pkgs.llm-agents.codex
              pkgs.llm-agents.opencode
              # pkgs.llm-agents.gemini-cli

            ];

          shellHook = ''
            bun install --frozen-lockfile
          '';
        };
      });
    };
}
