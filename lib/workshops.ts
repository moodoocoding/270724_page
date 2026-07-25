export const workshopRegions = [
  {
    id: "cheongju",
    label: "청주",
    sessions: [
      { code: "CJ-2026-07-25", dateLabel: "7.25.(토)" },
      { code: "CJ-2026-08-04", dateLabel: "8.4.(화)" },
      { code: "CJ-2026-09-10", dateLabel: "9.10.(목)" },
      { code: "CJ-2026-10-17", dateLabel: "10.17.(토)" },
      { code: "CJ-2026-11-14", dateLabel: "11.14.(토)" },
      { code: "CJ-2026-12-12", dateLabel: "12.12.(토)" },
    ],
  },
  {
    id: "jincheon",
    label: "진천",
    sessions: [
      { code: "JC-2026-09-12", dateLabel: "9.12.(토)" },
      { code: "JC-2026-10-06", dateLabel: "10.6.(화)" },
      { code: "JC-2026-11-17", dateLabel: "11.17.(화)" },
    ],
  },
  {
    id: "south",
    label: "남부(보은·옥천·영동)",
    sessions: [
      { code: "SB-2026-08-13", dateLabel: "8.13.(목)" },
      { code: "SB-2026-08-26", dateLabel: "8.26.(수)" },
      { code: "SB-2026-10-20", dateLabel: "10.20.(화)" },
    ],
  },
  {
    id: "central",
    label: "중부(괴산·증평·음성)",
    sessions: [
      { code: "CB-2026-09-03", dateLabel: "9.3.(목)" },
      { code: "CB-2026-10-07", dateLabel: "10.7.(수)" },
      { code: "CB-2026-10-29", dateLabel: "10.29.(목)" },
    ],
  },
  {
    id: "north",
    label: "북부(충주·제천·단양)",
    sessions: [
      { code: "NB-2026-08-25", dateLabel: "8.25.(화)" },
      { code: "NB-2026-10-01", dateLabel: "10.1.(목)" },
      { code: "NB-2026-10-02", dateLabel: "10.2.(금)" },
    ],
  },
] as const;

export const workshopSessions = workshopRegions.flatMap((region) =>
  region.sessions.map((session) => ({
    ...session,
    regionId: region.id,
    regionLabel: region.label,
    className: `${region.label} · ${session.dateLabel}`,
  })),
);

export function findWorkshopSession(code: string) {
  return workshopSessions.find((session) => session.code === code);
}
