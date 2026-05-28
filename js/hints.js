// hints.js — clue definitions with trigger patterns, notebook entries, and progressive hints.
//
// Each clue has:
//   id             — unique string key
//   label          — short display name for the notebook
//   triggerPattern — RegExp that fires when a cell value in a query result matches
//   notebookEntry  — text that auto-populates the NOTES tab when triggered
//   hints          — array of 3 strings, revealed one at a time on request

export const CLUES = [
  {
    id: 'missing_estring',
    label: 'The Missing String',
    triggerPattern: /E-string was missing|missing from the band/i,
    notebookEntry: "Emmanuel Banda reported a guitar E-string missing from the band's supply case. All four strings were present at the 12 November rehearsal. Only three remain.",
    hints: [
      'The murder weapon may have been taken by someone with access to band equipment.',
      "Check what the victim's bandmate reported to CID on 15 November.",
      "SELECT statement FROM interviews WHERE subject_id = 'emmanuel_banda'",
    ],
  },
  {
    id: 'blackmail_note',
    label: 'The Note',
    triggerPattern: /speak to Arthur|Agreed amount monthly/i,
    notebookEntry: "A handwritten note found at the victim's flat reads: 'Agreed amount monthly, first of each month, until I say otherwise. If you stop I speak to Arthur.' Unsigned. The reference to Arthur implies the writer feared exposure to a specific person of that name.",
    hints: [
      "Something was recovered during the search of the victim's flat.",
      'Check the evidence logged from the flat search on 15 November.',
      'SELECT description FROM evidence WHERE id = 4',
    ],
  },
  {
    id: 'bouncer_paid',
    label: "The Bouncer's Story",
    triggerPattern: /fifty ngwee|service gate.*no one|no one.*service gate/i,
    notebookEntry: 'Chilufya Nsofu was paid 50 ngwee by Grace Mwape to vacate his post on a false pretext at approximately 22:10. He was absent until around 22:40 — leaving the front entrance unwatched during the critical window.',
    hints: [
      'Someone at the club may have deliberately arranged to be alone near the rear that night.',
      'Ask the bouncer why he left his post.',
      "SELECT statement FROM interviews WHERE subject_id = 'chilufya_nsofu'",
    ],
  },
  {
    id: 'woman_corridor',
    label: 'Woman in the Corridor',
    triggerPattern: /followed him through the same door|dark dress/i,
    notebookEntry: 'Bar back Temwani Phiri saw a woman in a dark dress follow Victor Kasonde through the internal corridor door toward the rear alley at approximately 22:10. He did not see her face. Medium height, not young. He assumed she was one of the owners.',
    hints: [
      'A club worker saw something unusual in the back corridor around 22:10.',
      'Find out what Temwani Phiri observed on the night of the murder.',
      "SELECT statement FROM interviews WHERE subject_id = 'temwani_phiri'",
    ],
  },
  {
    id: 'grace_movement',
    label: 'Grace in the Corridor',
    triggerPattern: /Mrs Mwape walking toward the back corridor/i,
    notebookEntry: 'Bartender Blessings Mwanza saw Grace Mwape walk toward the back corridor around 22:00–22:10. She did not see her return. The bar was busy.',
    hints: [
      'The bartender was watching the club floor during the critical period.',
      'Ask what Blessings Mwanza observed at around 22:00.',
      "SELECT statement FROM interviews WHERE subject_id = 'blessings_mwanza'",
    ],
  },
  {
    id: 'grace_lies',
    label: "Grace's Account",
    triggerPattern: /did not leave the office.*that time|I was in the office from approximately/i,
    notebookEntry: "Grace Mwape claims she did not leave her office between 21:30 and 23:00. This directly contradicts statements from Chilufya Nsofu, Blessings Mwanza, and Temwani Phiri.",
    hints: [
      "The club owner gave a statement. It may not match other witnesses.",
      "Read Grace Mwape's interview and compare it with bar staff accounts.",
      "SELECT statement FROM interviews WHERE subject_id = 'grace_mwape'",
    ],
  },
  {
    id: 'bank_blackmail',
    label: 'Monthly Payments',
    triggerPattern: /Services rendered|Music consultant/i,
    notebookEntry: "Grace Mwape's account shows three K50 withdrawals labelled 'Music consultant' in August, September, and October 1974. Victor Kasonde's account shows K50 deposits labelled 'Services rendered' on the same dates.",
    hints: [
      'Follow the money between the club and the victim.',
      "Compare bank records for the victim and the club's account manager around Aug–Oct 1974.",
      "SELECT person_id, date, amount, memo FROM bank_records WHERE memo IN ('Services rendered','Music consultant') ORDER BY date",
    ],
  },
  {
    id: 'embezzlement',
    label: 'The Missing Money',
    triggerPattern: /K6,500|unexplained withdrawals|cash box/i,
    notebookEntry: "The club cash box balances on paper, but cross-referencing with bank statements reveals approximately K6,500 in unexplained withdrawals over 18 months — all under maintenance headings, with no contractor receipts on file.",
    hints: [
      "The club's finances may not be as clean as they appear.",
      'Check the physical evidence connected to the club office.',
      'SELECT description FROM evidence WHERE id = 5',
    ],
  },
  {
    id: 'chanda_calls',
    label: 'The NCCM Calls',
    triggerPattern: /NCCM-Central/i,
    notebookEntry: 'Bernard Chanda, NCCM Finance Director and UNIP councillor, called Grace Mwape four times from his office between October and November 1974 — including on the afternoon of the murder. Regular, unexplained personal contact.',
    hints: [
      'Check the telephone records for people connected to the club.',
      'Look at who was calling Grace Mwape in the weeks before the murder.',
      "SELECT * FROM phone_calls WHERE receiver_id = 'grace_mwape' ORDER BY date",
    ],
  },
  {
    id: 'musonda_alibi',
    label: 'Musonda in Livingstone',
    triggerPattern: /places him in Livingstone on the day|Call places him in Livingstone/i,
    notebookEntry: 'Call records show Solomon Musonda phoned his Lusaka office from the Livingstone exchange at 09:00 on 14 November. He was not in Lusaka when Victor Kasonde was murdered.',
    hints: [
      'One suspect may have an alibi you can verify through phone records.',
      'Check the call records for Solomon Musonda on 14 November.',
      "SELECT * FROM phone_calls WHERE caller_id = 'solomon_musonda'",
    ],
  },
  {
    id: 'chanda_vehicle',
    label: 'The Grey Mercedes',
    triggerPattern: /LSK 4412|grey Mercedes/i,
    notebookEntry: "A grey Mercedes-Benz 220 (plate LSK 4412), registered to Bernard Chanda, was observed parked outside The Copperbelt Room at approximately 18:00 on the evening of the murder.",
    hints: [
      'Someone connected to Grace Mwape may have visited the club that evening.',
      'Check the sightings near the club on 14 November.',
      "SELECT * FROM sightings WHERE date = '1974-11-14'",
    ],
  },
  {
    id: 'mwale_cold_case',
    label: 'The Mwale Disappearance',
    triggerPattern: /72\/LKS\/0891|Mwale.*inactive/i,
    notebookEntry: 'Joseph Mwale, a former bassist, disappeared in September 1972. Case 72/LKS/0891, handled by DI Bwalya, was classified inactive in March 1973 with no explanation. No body was ever found.',
    hints: [
      'There may be an older, unresolved mystery connected to this music scene.',
      'Search the precinct logs for cases involving musicians.',
      "SELECT * FROM precinct_logs WHERE notes LIKE '%Mwale%' ORDER BY date",
    ],
  },
];

/**
 * Checks a query result against all undiscovered clue trigger patterns.
 * Returns an array of newly triggered clue objects.
 *
 * @param {{ columns: string[], rows: any[][] }} result
 * @param {Set<string>} foundIds  - clue IDs already in the notebook
 * @returns {object[]} newly triggered clues
 */
export function checkTriggers(result, foundIds) {
  if (!result || !result.rows || result.rows.length === 0) return [];

  // Flatten all non-null cell values into one searchable string
  const cellText = result.rows
    .flat()
    .filter(v => v !== null && v !== undefined)
    .map(v => String(v))
    .join('\n');

  const triggered = [];
  for (const clue of CLUES) {
    if (foundIds.has(clue.id)) continue;
    if (clue.triggerPattern.test(cellText)) {
      triggered.push(clue);
    }
  }
  return triggered;
}
