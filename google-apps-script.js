// ============================================================
// CENTRALE 42 PADEL - Google Apps Script Backend
// ============================================================
// SETUP:
// 1. Go to script.google.com → New project
// 2. Paste ALL this code (replace any existing code)
// 3. Click Deploy → New deployment
// 4. Type: Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Click Deploy → copy the Web app URL
// 8. Paste that URL in index.html where it says SCRIPT_URL
// ============================================================

const SECRET_TOKEN = "0a93337723f95f02924ebae8cb0690425544b832145bcd9d";

function doGet(e) {
  // Reject any request that doesn't include the correct token
  if (e.parameter.token !== SECRET_TOKEN) {
    return jsonResponse({ error: "Non autorizzato" });
  }

  const action = e.parameter.action;
  try {
    if (action === "list")  return listBookings();
    if (action === "book")  return createBooking(e.parameter);
    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Prenotazioni");
  if (!sheet) {
    sheet = ss.insertSheet("Prenotazioni");
    sheet.appendRow(["Chiave", "Data Scelta", "Orario Scelto", "Nome", "Cognome", "Telefono", "Data e Ora di prenotazione"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 140);
    sheet.setColumnWidth(5, 140);
    sheet.setColumnWidth(6, 140);
    sheet.setColumnWidth(7, 200);
  }
  return sheet;
}

function listBookings() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ bookings: [] });
  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(k => k !== "");
  return jsonResponse({ bookings: keys });
}

function createBooking(params) {
  const key       = params.key;
  const date      = params.date      || "";
  const time      = params.time      || "";
  const firstname = params.firstname || "";
  const lastname  = params.lastname  || "";
  const phone     = params.phone;

  if (!key || !firstname || !lastname || !phone) {
    return jsonResponse({ error: "Parametri mancanti" });
  }

  // Validate key format: YYYY-MM-DD_HHMM
  if (!/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(key)) {
    return jsonResponse({ error: "Richiesta non valida" });
  }

  // Reject bookings in the past
  const datePart = key.split("_")[0];
  const timePart = key.split("_")[1];
  const slotDate = new Date(`${datePart}T${timePart.slice(0,2)}:${timePart.slice(2,4)}:00`);
  if (slotDate < new Date()) {
    return jsonResponse({ error: "Non puoi prenotare un orario passato" });
  }

  // Use LockService to prevent race conditions (double bookings)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // wait up to 10 seconds for the lock

    const sheet   = getSheet();
    const lastRow = sheet.getLastRow();

    // Check if slot already taken
    if (lastRow > 1) {
      const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (keys.includes(key)) {
        return jsonResponse({ error: "Slot già prenotato" });
      }
    }

    const dateStr = Utilities.formatDate(new Date(), "Europe/Rome", "dd/MM/yyyy HH:mm");
    sheet.appendRow([key, date, time, firstname, lastname, phone, dateStr]);
    return jsonResponse({ ok: true });

  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
