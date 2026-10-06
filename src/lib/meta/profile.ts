export type ShopId = "crate" | "rig" | "plate" | "wing";

export type ShopItem = {
  id: ShopId;
  name: string;
  cost: number;
  blurb: string;
};

export const STOCK: ShopItem[] = [
  { id: "crate", name: "Ionite crate", cost: 40, blurb: "Deploy with 600 extra ionite." },
  { id: "rig", name: "Spare rig", cost: 70, blurb: "A second harvester starts beside the spire." },
  { id: "plate", name: "Spire plate", cost: 90, blurb: "Command spire deploys with 500 extra hull." },
  { id: "wing", name: "Reserve wing", cost: 120, blurb: "One extra Kestrel on the opening line." },
];

export type Profile = {
  marks: number;
  owned: ShopId[];
  equipped: ShopId[];
};

export type SaveSlot = {
  name: string;
  savedAt: number;
  time: number;
  blob: unknown;
};

const PROFILE_KEY = "ionreach.profile";
const SAVES_KEY = "ionreach.saves";

const empty = (): Profile => ({ marks: 0, owned: [], equipped: [] });

export function readProfile(): Profile {
  if (typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Profile;
    return {
      marks: Number(parsed.marks) || 0,
      owned: Array.isArray(parsed.owned) ? parsed.owned : [],
      equipped: Array.isArray(parsed.equipped) ? parsed.equipped : [],
    };
  } catch {
    return empty();
  }
}

export function writeProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function grantMarks(amount: number): Profile {
  const profile = readProfile();
  profile.marks += amount;
  writeProfile(profile);
  return profile;
}

export function buyItem(id: ShopId): { ok: boolean; profile: Profile; reason?: string } {
  const profile = readProfile();
  const item = STOCK.find((s) => s.id === id);
  if (!item) return { ok: false, profile, reason: "Unknown item." };
  if (profile.owned.includes(id)) return { ok: false, profile, reason: "Already owned." };
  if (profile.marks < item.cost) return { ok: false, profile, reason: "Not enough glass marks." };
  profile.marks -= item.cost;
  profile.owned.push(id);
  profile.equipped.push(id);
  writeProfile(profile);
  return { ok: true, profile };
}

export function toggleEquipped(id: ShopId): Profile {
  const profile = readProfile();
  if (!profile.owned.includes(id)) return profile;
  profile.equipped = profile.equipped.includes(id) ? profile.equipped.filter((x) => x !== id) : [...profile.equipped, id];
  writeProfile(profile);
  return profile;
}

export function readSaves(): (SaveSlot | null)[] {
  const slots: (SaveSlot | null)[] = [null, null, null, null];
  if (typeof localStorage === "undefined") return slots;
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    const parsed = raw ? (JSON.parse(raw) as (SaveSlot | null)[]) : [];
    for (let i = 0; i < 4; i++) slots[i] = parsed[i] ?? null;
  } catch {
    /* keep empty */
  }
  return slots;
}

export function writeSave(index: number, slot: SaveSlot): (SaveSlot | null)[] {
  const slots = readSaves();
  slots[index] = slot;
  localStorage.setItem(SAVES_KEY, JSON.stringify(slots));
  return slots;
}
