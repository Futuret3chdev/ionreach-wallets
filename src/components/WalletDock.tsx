import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { connectWallet, disconnectWallet, listWallets, startWalletDiscovery, subscribeWallets, type DiscoveredWallet } from "@/lib/wallet/connect";
import { readSession, shortAddress, writeSession, type WalletSession } from "@/lib/wallet/session";

export function WalletDock({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(readSession());
    startWalletDiscovery();
    const refresh = () => setWallets(listWallets());
    refresh();
    const stop = subscribeWallets(refresh);
    const t = window.setTimeout(refresh, 600);
    return () => {
      stop();
      window.clearTimeout(t);
    };
  }, []);

  async function onConnect(id: string) {
    setBusy(id);
    setError("");
    try {
      const next = await connectWallet(id);
      writeSession(next);
      setSession(next);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect() {
    await disconnectWallet();
    writeSession(null);
    setSession(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex min-h-11 items-center gap-2 border border-line bg-surface/90 px-3 font-display text-sm text-fg"
            : "inline-flex min-h-11 items-center gap-2 border border-line bg-surface/80 px-5 font-display text-lg text-fg"
        }
      >
        <Wallet className="size-4" />
        {session ? shortAddress(session.address) : "Connect wallet"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 md:items-center">
          <div className="w-full max-w-md border border-line bg-surface p-5">
            <p className="font-display text-xs tracking-[0.22em] text-ion">ANY WALLET</p>
            <h2 className="font-display text-2xl font-semibold">Link a callsign</h2>
            <p className="mt-1 text-sm text-muted">Browser wallets are detected automatically. WalletConnect covers mobile wallets that are not installed here.</p>
            {session && (
              <div className="mt-3 border border-line px-3 py-2 text-sm">
                <p className="font-display text-ion">{session.walletName}</p>
                <p className="break-all text-fg">{session.address}</p>
                {session.chainId && <p className="text-muted">Chain {session.chainId}</p>}
                <button type="button" onClick={onDisconnect} className="mt-2 min-h-11 text-ember">
                  Disconnect
                </button>
              </div>
            )}
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => onConnect(w.id)}
                    className="flex min-h-11 w-full items-center gap-3 border border-line px-3 text-left"
                  >
                    {w.icon ? <img src={w.icon} alt="" className="size-6" /> : <Wallet className="size-4 text-ion" />}
                    <span className="font-display">{busy === w.id ? "Waiting…" : w.name}</span>
                    <span className="ml-auto text-xs text-muted">{w.family === "solana" ? "SOL" : "EVM"}</span>
                  </button>
                </li>
              ))}
              {wallets.length === 0 && <li className="text-sm text-muted">No injected wallet yet. Install one, or use WalletConnect below.</li>}
            </ul>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => onConnect("walletconnect")}
              className="mt-3 min-h-11 w-full bg-ion px-4 font-display text-bg"
            >
              {busy === "walletconnect" ? "Opening WalletConnect…" : "Any wallet via WalletConnect"}
            </button>
            {error && <p className="mt-2 text-sm text-ember">{error}</p>}
            <button type="button" onClick={() => setOpen(false)} className="mt-4 min-h-11 px-3 font-display text-muted">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
