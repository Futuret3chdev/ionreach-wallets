import { useEffect, useState } from "react";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { buyItem, readProfile, readSaves, STOCK, toggleEquipped, type Profile, type SaveSlot, type ShopId } from "@/lib/meta/profile";
import { WalletDock } from "@/components/WalletDock";

type Tab = "wallet" | "shop" | "saves" | "multi";

export function SettingsPanel({
  open,
  onClose,
  onSave,
  onLoad,
  onSendField,
  onField,
  onRoom,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (index: number) => SaveSlot | null;
  onLoad: (slot: SaveSlot) => void;
  onSendField: (send: (data: unknown) => void) => void;
  onField: (blob: unknown) => void;
  onRoom: (room: P2PRoom | null) => void;
}) {
  const [tab, setTab] = useState<Tab>("wallet");
  const [profile, setProfile] = useState<Profile>({ marks: 0, owned: [], equipped: [] });
  const [saves, setSaves] = useState<(SaveSlot | null)[]>([null, null, null, null]);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("horizon");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [room, setRoom] = useState<P2PRoom | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfile(readProfile());
    setSaves(readSaves());
  }, [open]);

  useEffect(() => () => room?.close(), [room]);

  if (!open) return null;

  function purchase(id: ShopId) {
    const result = buyItem(id);
    setProfile(result.profile);
    setNote(result.ok ? "Fitted." : result.reason ?? "Could not buy.");
  }

  function join() {
    room?.close();
    const next = new P2PRoom({
      room: code.trim().toLowerCase() || "horizon",
      selfId: crypto.randomUUID(),
      name: "T3X",
      onPeersChanged: setPeers,
      onMessage: (_from, data) => {
        const msg = data as { t?: string; blob?: unknown };
        if (msg?.t === "field" && msg.blob) onField(msg.blob);
      },
    });
    setRoom(next);
    onRoom(next);
    void next.join();
    setNote(`Joined ${code.trim().toLowerCase() || "horizon"}.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/75 p-4 md:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="font-display text-xs tracking-[0.22em] text-ion">DIRECTORATE</p>
            <h2 className="font-display text-2xl font-semibold">Settings</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-3 font-display text-muted">
            Close
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2">
          {(
            [
              ["wallet", "Wallet"],
              ["shop", "Shop"],
              ["saves", "Save / load"],
              ["multi", "Multiplayer"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? "min-h-11 bg-ion px-3 font-display text-bg" : "min-h-11 px-3 font-display text-muted"}>
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "wallet" && (
            <div>
              <p className="text-sm text-muted">Link any injected wallet or WalletConnect. The address is your callsign, not a payment method.</p>
              <div className="mt-4">
                <WalletDock />
              </div>
            </div>
          )}
          {tab === "shop" && (
            <div>
              <p className="font-display text-gold">{profile.marks} glass marks</p>
              <p className="mt-1 text-sm text-muted">Wins pay 25. Losses pay 8. Equipped gear applies on the next deploy.</p>
              <ul className="mt-3 space-y-2">
                {STOCK.map((item) => {
                  const owned = profile.owned.includes(item.id);
                  const on = profile.equipped.includes(item.id);
                  return (
                    <li key={item.id} className="border border-line p-3">
                      <p className="font-display">{item.name}</p>
                      <p className="text-sm text-muted">{item.blurb}</p>
                      <div className="mt-2 flex gap-2">
                        {!owned ? (
                          <button type="button" onClick={() => purchase(item.id)} className="min-h-11 bg-ion px-3 font-display text-bg">
                            Buy {item.cost}
                          </button>
                        ) : (
                          <button type="button" onClick={() => setProfile(toggleEquipped(item.id))} className="min-h-11 border border-line px-3 font-display">
                            {on ? "Equipped" : "Equip"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {tab === "saves" && (
            <ul className="space-y-2">
              {saves.map((slot, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border border-line p-3">
                  <div>
                    <p className="font-display">Slot {i + 1}</p>
                    <p className="text-xs text-muted">{slot ? new Date(slot.savedAt).toLocaleString() : "Empty"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = onSave(i);
                        if (next) {
                          setSaves(readSaves());
                          setNote(`Saved slot ${i + 1}.`);
                        } else setNote("Deploy first, then save.");
                      }}
                      className="min-h-11 border border-line px-3 font-display"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={!slot}
                      onClick={() => slot && onLoad(slot)}
                      className="min-h-11 bg-ion px-3 font-display text-bg disabled:opacity-40"
                    >
                      Load
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tab === "multi" && (
            <div>
              <p className="text-sm text-muted">Same room code puts commanders on a direct link. Send the field to share a save with whoever is connected.</p>
              <label className="mt-3 block text-xs text-muted">
                Room
                <input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 min-h-11 w-full border border-line bg-bg px-3 text-fg" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={join} className="min-h-11 bg-ion px-3 font-display text-bg">
                  {room ? "Rejoin" : "Join room"}
                </button>
                <button
                  type="button"
                  disabled={!room}
                  onClick={() => room && onSendField((data) => room.send(data))}
                  className="min-h-11 border border-line px-3 font-display disabled:opacity-40"
                >
                  Send field
                </button>
                <button
                  type="button"
                  onClick={() => {
                    room?.close();
                    setRoom(null);
                    onRoom(null);
                    setPeers([]);
                  }}
                  className="min-h-11 px-3 font-display text-muted"
                >
                  Leave
                </button>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {peers.length === 0 && <li className="text-muted">No peers yet.</li>}
                {peers.map((p) => (
                  <li key={p.id}>
                    {p.name} · {p.connectionState}
                    {p.rttMs != null ? ` · ${p.rttMs}ms` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {note && <p className="mt-3 text-sm text-ion">{note}</p>}
        </div>
      </div>
    </div>
  );
}
