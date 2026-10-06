import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { connectSolana, listSolanaWallets, type SolanaWallet } from "@/lib/wallet/solana";
import { readSession, shortAddress, writeSession, type WalletSession } from "@/lib/wallet/session";
import { BUY_URL, T3X_MINT, t3xBalance } from "@/lib/wallet/t3x";

export function WalletDock() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setSession(readSession());
    setWallets(listSolanaWallets());
  }, [open]);

  async function onConnect(id: string) {
    setBusy(id);
    setError("");
    try {
      const next = await connectSolana(id);
      const held = await t3xBalance(next.address);
      setBalance(held);
      if (T3X_MINT && (held ?? 0) <= 0) {
        writeSession(null);
        setSession(null);
        setError("This wallet has no T3X. Buy T3X, then connect again.");
        return;
      }
      writeSession(next);
      setSession(next);
      if (!T3X_MINT) setError("Connected. Holder check turns on when the T3X mint is set.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-line bg-surface/80 px-5 font-display text-lg text-fg">
        <Wallet className="size-4" />
        {session ? shortAddress(session.address) : "Connect Solana wallet"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-bg/70 p-4 md:items-center">
          <div className="w-full max-w-md border border-line bg-surface p-5">
            <p className="font-display text-xs tracking-[0.22em] text-ion">SOLANA ONLY</p>
            <h2 className="font-display text-2xl font-semibold">T3X wallet</h2>
            <p className="mt-1 text-sm text-muted">Phantom, Solflare, and Backpack. A wallet must hold T3X. If it does not, buy some first.</p>
            {session && (
              <div className="mt-3 border border-line px-3 py-2 text-sm">
                <p className="font-display text-ion">{session.walletName}</p>
                <p className="break-all">{session.address}</p>
                <button
                  type="button"
                  onClick={() => {
                    writeSession(null);
                    setSession(null);
                    setBalance(null);
                  }}
                  className="mt-2 min-h-11 text-ember"
                >
                  Disconnect
                </button>
              </div>
            )}
            <ul className="mt-4 space-y-2">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button type="button" disabled={busy !== null} onClick={() => onConnect(w.id)} className="flex min-h-11 w-full items-center border border-line px-3 text-left font-display">
                    {busy === w.id ? "Waiting…" : w.name}
                  </button>
                </li>
              ))}
              {wallets.length === 0 && <li className="text-sm text-muted">No Solana wallet in this browser.</li>}
            </ul>
            {BUY_URL ? (
              <a href={BUY_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center bg-ion px-4 font-display text-bg">
                Buy T3X
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted">Buy opens on Jupiter once the T3X mint is set.</p>
            )}
            {balance != null && <p className="mt-2 text-sm text-muted">Balance {balance} T3X</p>}
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
