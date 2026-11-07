/* PASSO — dummy data (simulation). Replace with Supabase / n8n queries later; keep the same shape and the UI keeps working.
   Consistency rules: completed = reservations - cancelled - noShow; new + returning customers = completed. */
window.PASSO_DATA = {
  note: "Simulated data (dummy data) for illustration only.",
  months: [
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
  ] /* last 12 months, oldest first */,
  reservations: [118, 102, 96, 124, 131, 128, 140, 146, 152, 149, 158, 171],
  cancelled: [11, 9, 8, 10, 12, 11, 12, 13, 12, 12, 13, 14],
  noShow: [3, 3, 2, 4, 3, 3, 4, 4, 4, 3, 4, 4],
  returningPct: [
    34, 35, 33, 37, 38, 40, 41, 42, 43, 44, 45, 47,
  ] /* % of completed visits from returning guests */,
  popularMenu: [
    /* orders over the last 12 months; names match the menu */
    { name: "Wagyu Short Rib", orders: 412 },
    { name: "Dry-Aged Ribeye", orders: 358 },
    { name: "Chocolate Soufflé", orders: 331 },
    { name: "Beef Tartare", orders: 287 },
    { name: "Miso Black Cod", orders: 241 },
    { name: "Foie Gras Torchon", orders: 214 },
  ],
  baseRatings: {
    5: 162,
    4: 61,
    3: 17,
    2: 5,
    1: 3,
  } /* historical rating counts (248 reviews, average 4.5) */,
  reviews: [
    {
      n: "Amara Wijaya",
      r: 5,
      d: "12 Oct 2026",
      t: "The dry-aged ribeye was the finest I have had in Jakarta. Service anticipated every need without ever hovering.",
    },
    {
      n: "Daniel Prasetyo",
      r: 5,
      d: "28 Sep 2026",
      t: "We celebrated our anniversary here. Candlelight, the quietest room in the city, and a soufflé worth the wait.",
    },
    {
      n: "Clara Hendrawan",
      r: 4,
      d: "03 Oct 2026",
      t: "A beautifully paced evening. The scallop and velouté were highlights; I only wish the wine list were longer.",
    },
    {
      n: "Michael Tan",
      r: 5,
      d: "19 Aug 2026",
      t: "Impeccable. The sommelier paired a Barolo with the short rib so well that we ordered a second glass.",
    },
    {
      n: "Sofia Lestari",
      r: 5,
      d: "07 Sep 2026",
      t: "Understated elegance. Every plate arrived as if painted, and tasted even better than it looked.",
    },
    {
      n: "Rendra Kusuma",
      r: 4,
      d: "22 Jul 2026",
      t: "A calm, confident room and food to match. We booked our next visit before we had left.",
    },
  ],
};
