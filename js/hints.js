// hints.js — clue + lead definitions.
//
// Each clue is also a "lead" — an investigation question the player solves
// by writing a query whose result matches `triggerPattern`. Once triggered,
// the lead is marked answered and the case-note is revealed.
//
// Fields:
//   id             — unique string key
//   label          — short display name
//   question       — investigation prompt shown in the LEADS tab
//   dependsOn      — array of clue IDs that must be answered before this
//                    lead is visible. Empty → opening lead, visible from start.
//   triggerPattern — RegExp that fires when a cell value in a query result matches
//   notebookEntry  — the case-note revealed once the lead is answered
//   hints          — array of 3 progressive hints

export const CLUES = [
  {
    id: 'missing_estring',
    label: 'The Missing String',
    question: "The victim was a guitarist at The Copperbelt Room. Have his bandmates reported anything missing from the band's equipment?",
    dependsOn: [],
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
    question: "What was recovered during the search of Victor Kasonde's flat on 15 November?",
    dependsOn: [],
    triggerPattern: /speak to Arthur|Agreed amount monthly/i,
    notebookEntry: "A handwritten note found at the victim's flat reads: 'Agreed amount monthly, first of each month, until I say otherwise. If you stop I speak to Arthur.' Unsigned. The reference to Arthur implies the writer feared exposure to a specific person of that name.",
    hints: [
      "Something was recovered during the search of the victim's flat.",
      'Check the evidence logged from the flat search on 15 November.',
      'SELECT description FROM evidence WHERE id = 4',
    ],
  },
  {
    id: 'musonda_alibi',
    label: 'Musonda in Livingstone',
    question: "Solomon Musonda is named as a suspect. His alibi places him outside Lusaka on the day of the murder — can you verify it?",
    dependsOn: [],
    triggerPattern: /places him in Livingstone on the day|Call places him in Livingstone/i,
    notebookEntry: 'Call records show Solomon Musonda phoned his Lusaka office from the Livingstone exchange at 09:00 on 14 November. He was not in Lusaka when Victor Kasonde was murdered.',
    hints: [
      'One suspect may have an alibi you can verify through phone records.',
      'Check the call records for Solomon Musonda on 14 November.',
      "SELECT * FROM phone_calls WHERE caller_id = 'solomon_musonda'",
    ],
  },
  {
    id: 'bouncer_paid',
    label: "The Bouncer's Story",
    question: "Who was watching the front door of The Copperbelt Room on the night of the murder, and were they at their post during the critical window?",
    dependsOn: ['missing_estring'],
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
    question: "Did any staff at the club see anyone unusual moving toward the rear corridor that night?",
    dependsOn: ['bouncer_paid'],
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
    question: "Where was the club's manager Grace Mwape during the critical window between 21:30 and 23:00?",
    dependsOn: ['woman_corridor'],
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
    question: "What does Grace Mwape herself say about her movements that evening? Does it match what the bar staff observed?",
    dependsOn: ['grace_movement'],
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
    question: "The note found in the flat hints at a monthly arrangement. Are there recurring payments between Grace Mwape and Victor Kasonde in the bank records?",
    dependsOn: ['blackmail_note'],
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
    question: "Do the club's reported finances reconcile with its bank statements, or is money unaccounted for?",
    dependsOn: ['bank_blackmail'],
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
    question: "Grace Mwape's story is breaking. Who else has been in regular contact with her in the weeks before the murder?",
    dependsOn: ['grace_lies'],
    triggerPattern: /NCCM-Central/i,
    notebookEntry: 'Bernard Chanda, NCCM Finance Director and UNIP councillor, called Grace Mwape four times from his office between October and November 1974 — including on the afternoon of the murder. Regular, unexplained personal contact.',
    hints: [
      'Check the telephone records for people connected to the club.',
      'Look at who was calling Grace Mwape in the weeks before the murder.',
      "SELECT * FROM phone_calls WHERE receiver_id = 'grace_mwape' ORDER BY date",
    ],
  },
  {
    id: 'chanda_vehicle',
    label: 'The Grey Mercedes',
    question: "Was Bernard Chanda — or his vehicle — seen anywhere near The Copperbelt Room on the evening of the murder?",
    dependsOn: ['chanda_calls'],
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
    question: "Are there any older, unresolved precinct cases connected to this music scene or to the people now involved?",
    dependsOn: ['chanda_calls'],
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
 * Returns the clues currently visible to the player: opening leads (no
 * dependencies) plus any whose prerequisites have all been answered.
 *
 * @param {Set<string>} foundClueIds  — ids of clues already triggered
 * @returns {object[]} clues in definition order
 */
export function getVisibleClues(foundClueIds) {
  return CLUES.filter(c =>
    c.dependsOn.every(dep => foundClueIds.has(dep))
  );
}

/**
 * Checks a query result against all undiscovered clue trigger patterns.
 * Only checks clues that are currently *visible* — leads that haven't
 * unlocked yet can't be triggered out of order.
 *
 * @param {{ columns: string[], rows: any[][] }} result
 * @param {Set<string>} foundIds  - clue IDs already triggered
 * @returns {object[]} newly triggered clues
 */
export function checkTriggers(result, foundIds) {
  if (!result || !result.rows || result.rows.length === 0) return [];

  const cellText = result.rows
    .flat()
    .filter(v => v !== null && v !== undefined)
    .map(v => String(v))
    .join('\n');

  const visible = getVisibleClues(foundIds);
  const triggered = [];
  for (const clue of visible) {
    if (foundIds.has(clue.id)) continue;
    if (clue.triggerPattern.test(cellText)) {
      triggered.push(clue);
    }
  }
  return triggered;
}
