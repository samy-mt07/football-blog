// Uses TheSportsDB's free tier (key "3" = shared public test key, no signup required).
// Swap SPORTS_DB_KEY for your own free key from thesportsdb.com if you want higher limits.
const SPORTS_DB_KEY = '3';
const LEAGUE_ID = '4429'; // FIFA World Cup on TheSportsDB

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string; // "Not Started" | "Match Finished" | "1H" | "2H" | etc
  date: string;
  time: string;
};

function mapEvent(e: any): Match {
  return {
    id: e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
    status: e.strStatus || e.strProgress || 'Scheduled',
    date: e.dateEvent,
    time: e.strTime?.slice(0, 5) ?? '',
  };
}

export async function getRecentResults(): Promise<Match[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_KEY}/eventspastleague.php?id=${LEAGUE_ID}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? []).slice(0, 8).map(mapEvent);
  } catch {
    return []; // build never fails just because the API hiccuped
  }
}

export async function getUpcomingFixtures(): Promise<Match[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_KEY}/eventsnextleague.php?id=${LEAGUE_ID}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? []).slice(0, 8).map(mapEvent);
  } catch {
    return [];
  }
}
