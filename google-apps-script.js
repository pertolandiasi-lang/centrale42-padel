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

function doGet(e) {
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
    sheet.appendRow(["Chiave", "Data Scelta", "Orario Scelto", "Nome e Cognome", "Telefono", "Data e Ora di prenotazione"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 140);
    sheet.setColumnWidth(6, 200);
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
  const key   = params.key;
  const date  = params.date  || "";
  const time  = params.time  || "";
  const name  = params.name;
  const phone = params.phone;

  if (!key || !name || !phone) {
    return jsonResponse({ error: "Parametri mancanti" });
  }

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
  sheet.appendRow([key, date, time, name, phone, dateStr]);
  return jsonResponse({ ok: true });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
