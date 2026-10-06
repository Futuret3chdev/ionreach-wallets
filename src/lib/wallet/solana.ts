import type { WalletSession } from "./session";

type SolProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
};

export type SolanaWallet = { id: string; name: string; provider: SolProvider };

function named(provider: SolProvider, fallback: string): string {
  if (provider.isPhantom) return "Phantom";
  if (provider.isSolflare) return "Solflare";
  if (provider.isBackpack) return "Backpack";
  return fallback;
}

export function listSolanaWallets(): SolanaWallet[] {
  const w = window as Window & {
    solana?: SolProvider;
    phantom?: { solana?: SolProvider };
    solflare?: SolProvider;
    backpack?: SolProvider;
  };
  const found: SolanaWallet[] = [];
  const push = (id: string, provider: SolProvider | undefined, fallback: string) => {
    if (!provider?.connect) return;
    const name = named(provider, fallback);
    if (found.some((row) => row.name === name)) return;
    found.push({ id, name, provider });
  };
  push("solana", w.solana, "Solana wallet");
  push("phantom", w.phantom?.solana, "Phantom");
  push("solflare", w.solflare, "Solflare");
  push("backpack", w.backpack, "Backpack");
  return found;
}

export async function connectSolana(id: string): Promise<WalletSession> {
  const wallet = listSolanaWallets().find((row) => row.id === id);
  if (!wallet) throw new Error("That Solana wallet is not available.");
  const res = await wallet.provider.connect();
  return { family: "solana", address: res.publicKey.toString(), walletName: wallet.name };
}
