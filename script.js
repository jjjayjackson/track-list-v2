// ==================== SUPABASE CONNECTION ====================
// 🔧 FILL IN THESE TWO VALUES when your Supabase project is ready.
//    You'll find both under: Project Settings → API in the Supabase dashboard.

const SUPABASE_URL = "https://pkgfphwuluascoidlaji.supabase.co";   
const SUPABASE_ANON_KEY = "sb_publishable_-ZI6iFmuvTraFsv00MQSQA_VrpvJvlO";

// This loads the Supabase library and creates your connection object.
// Think of `supabase` below as the phone you'll use to call your database.
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================================

const trackInput = document.getElementById("Input");
const queue = document.getElementById("queue");
const monthTimeline = document.getElementById("monthTimeline");

let tracks = [];

// ==================== CORE DATA MANAGEMENT ====================

// Fetches all rows from the `tracks` table, ordered so the newest is first.
// `.data` is the array of rows Supabase hands back to us.
async function loadTracks() {
  const { data, error } = await db
    .from("track_list")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load tracks:", error.message);
    return;
  }

  // Supabase returns `created_at` (snake_case), but the rest of the code
  // uses `createdAt` (camelCase). We normalize here so nothing else has to change.
  tracks = data.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at
  }));

  renderTracks();
}

// Sends a new row to Supabase, then re-fetches the full list so the UI
// always reflects exactly what's in the database.
async function addTrack() {
  const name = trackInput.value.trim();
  if (!name) return;

  const { error } = await db
    .from("track_list")
    .insert({ name }); // We only send `name`; Supabase auto-fills `id` and `created_at`

  if (error) {
    console.error("Failed to add track:", error.message);
    return;
  }

  trackInput.value = "";
  await loadTracks(); // Re-fetch so the new row appears with the real server timestamp
}

// Deletes the row whose `id` column equals the id we pass in.
// `.eq("id", id)` is the filter — without it, every row would be deleted.
async function deleteTrack(id) {
  const { error } = await db
    .from("track_list")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete track:", error.message);
    return;
  }

  await loadTracks(); // Re-fetch to keep UI in sync
}

// ==================== DATE HELPERS ====================
// Nothing changed here — these just format dates for display.

function getDayKey(track) {
  const date = new Date(track.createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(track) {
  const date = new Date(track.createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDay(track) {
  const date = new Date(track.createdAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month}.${day}.${year}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${Number(month)}.${String(year).slice(-2)}`;
}

// ==================== GROUPING & RENDERING ====================
// Nothing changed here — this is pure UI logic, no database involvement.

function groupTracksByDay() {
  const groups = {};

  tracks.forEach((track) => {
    const key = getDayKey(track);
    if (!groups[key]) groups[key] = [];
    groups[key].push(track);
  });

  return groups;
}

function renderTracks() {
  queue.innerHTML = "";
  monthTimeline.innerHTML = "";

  if (tracks.length === 0) return;

  const tracksFromEachDayBigGroup = groupTracksByDay();
  const sortedDayKeys = Object.keys(tracksFromEachDayBigGroup).sort((a, b) => new Date(b) - new Date(a));

  for (const dayKey of sortedDayKeys) {
    const tracksFromThatDay = tracksFromEachDayBigGroup[dayKey];

    const dayGroup = document.createElement("div");
    dayGroup.className = "day-group";
    dayGroup.id = `day-${dayKey}`;

    const dayLabel = document.createElement("div");
    dayLabel.className = "labelfortheday";
    dayLabel.textContent = formatDay(tracksFromThatDay[0]);
    dayGroup.appendChild(dayLabel);

    for (const track of tracksFromThatDay) {
      const row = createRow(track);
      dayGroup.appendChild(row);
    }

    queue.appendChild(dayGroup);
  }

  renderMonthTimeline(sortedDayKeys, tracksFromEachDayBigGroup);
}

function renderMonthTimeline(sortedDayKeys, tracksFromEachDayBigGroup) {
  const seenMonths = new Set();

  sortedDayKeys.forEach((dayKey) => {
    const firstTrack = tracksFromEachDayBigGroup[dayKey][0];
    const monthKey = getMonthKey(firstTrack);

    if (seenMonths.has(monthKey)) return;
    seenMonths.add(monthKey);

    const monthItem = document.createElement("button");
    monthItem.className = "linkofmonth";
    monthItem.textContent = formatMonthLabel(monthKey);

    monthItem.addEventListener("click", () => {
      const firstDayInMonth = sortedDayKeys.find((key) => key.startsWith(monthKey));
      const target = document.getElementById(`day-${firstDayInMonth}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    monthTimeline.appendChild(monthItem);
  });
}

function createRow(track) {
  const row = document.createElement("div");
  row.className = "track-row";
  row.dataset.id = track.id;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTrack(track.id);
  });

  const nameSpan = document.createElement("span");
  nameSpan.className = "track-name";
  nameSpan.textContent = track.name;
  nameSpan.addEventListener("click", () => {
    const q = encodeURIComponent(track.name);
    window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank");
  });

  row.appendChild(deleteBtn);
  row.appendChild(nameSpan);

  return row;
}

// ==================== EVENT LISTENERS ====================

trackInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTrack();
  }
});

document.addEventListener("DOMContentLoaded", loadTracks);
