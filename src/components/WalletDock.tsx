import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { connectSolana, listSolanaWallets, type SolanaWallet } from "@/lib/wallet/solana";
import { readSession, shortAddress, writeSession, type WalletSession } from "@/lib/wallet/session";
import { BUY_URL, T3X_MINT, t3xBalance } from "@/lib/wallet/t3x";


function onPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function pairUrl(id: string): string {
  return `https://mt.futuret3ch.com.au/?connect=ionreach&session=${id}`;
}

export function WalletDock() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const [pair, setPair] = useState("");
  const [linked, setLinked] = useState<WalletSession | null>(null);
  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setPhone(onPhone());
    setPair(crypto.randomUUID());
    setLinked(readSession());
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
        setLinked(null);
        setError("This wallet has no T3X. Buy T3X, then connect again.");
        return;
      }
      writeSession(next);
      setLinked(next);
      if (!T3X_MINT) setError("Connected. Holder check turns on when the T3X mint is set.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    } finally {
      setBusy(null);
    }
  }

  function openApp() {
    const url = pairUrl(pair);
    window.location.href = url;
  }

  const qr = pair ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pairUrl(pair))}` : "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-line bg-surface/80 px-5 font-display text-lg text-fg">
        <Wallet className="size-4" />
        {linked ? shortAddress(linked.address) : "Connect wallet"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-bg/70 p-4 md:items-center">
          <div className="w-full max-w-md border border-line bg-surface p-5">
            <p className="font-display text-xs tracking-[0.22em] text-ion">SOLANA ONLY</p>
            <h2 className="font-display text-2xl font-semibold">T3X wallet</h2>
            <p className="mt-1 text-sm text-muted">
              {phone ? "On a phone, this opens the Infinite Wallet app." : "On a computer, scan the code with Infinite Wallet on your phone."}
            </p>
            {linked && (
              <div className="mt-3 border border-line px-3 py-2 text-sm">
                <p className="font-display text-ion">{linked.walletName}</p>
                <p className="break-all">{linked.address}</p>
                <button type="button" onClick={() => { writeSession(null); setLinked(null); setBalance(null); }} className="mt-2 min-h-11 text-ember">
                  Disconnect
                </button>
              </div>
            )}
            {phone ? (
              <button type="button" onClick={openApp} className="mt-4 min-h-11 w-full bg-ion px-4 font-display text-bg">
                Open Infinite Wallet
              </button>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2">
                {qr && <img src={qr} alt="Scan with Infinite Wallet" width={220} height={220} />}
                <p className="text-center text-xs text-muted">Scan with the Infinite Wallet app. Session {pair.slice(0, 8)}.</p>
              </div>
            )}
            <p className="mt-4 font-display text-xs tracking-[0.16em] text-muted">OR A BROWSER WALLET</p>
            <ul className="mt-2 space-y-2">
              {wallets.map((w) => (
                <li key={w.id}>
                  <button type="button" disabled={busy !== null} onClick={() => onConnect(w.id)} className="flex min-h-11 w-full items-center border border-line px-3 text-left font-display">
                    {busy === w.id ? "Waiting…" : w.name}
                  </button>
                </li>
              ))}
              {wallets.length === 0 && <li className="text-sm text-muted">No Solana browser wallet on this device.</li>}
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
