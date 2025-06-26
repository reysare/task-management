// functions/index.js
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin");

// Inisialisasi Firebase Admin SDK
// Penting: Pastikan ini diinisialisasi hanya sekali
if (admin.apps.length === 0) {
  admin.initializeApp();
}

sgMail.setApiKey(functions.config().sendgrid.apikey);

/**
 * Fungsi callable HTTP untuk mengirim email menggunakan SendGrid.
 * Fungsi ini dapat dipanggil dari sisi klien.
 *
 * @param {object} data - Data permintaan: { to, subject, text, html?, from? }
 * @param {object} context - Konteks fungsi, berisi informasi autentikasi.
 * @returns {Promise<object>} - Hasil pengiriman email.
 */
exports.sendEmail = functions.https.onCall(async (data, context) => {
  // Hanya pengguna yang terautentikasi yang bisa memanggil fungsi ini
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Fungsi ini harus dipanggil dalam kondisi terautentikasi.",
    );
  }

  const {to, subject, text, html} = data;
  // Gunakan email pengirim default jika tidak ditentukan
  const fromEmail = data.from || functions.config().sendgrid.senderemail;

  if (!to || !subject || !text) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Parameter email yang diperlukan (to, subject, atau text) tidak ada.",
    );
  }

  const msg = {
    to: to,
    from: fromEmail,
    subject: subject,
    text: text,
    html: html || `<p>${text.replace(/\n/g, "<br/>")}</p>`, // Fallback HTML
  };

  try {
    await sgMail.send(msg);
    functions.logger.info(
        `Email berhasil dikirim ke ${to} dengan subjek: ${subject}`,
    );
    return {success: true, message: "Email berhasil dikirim!"};
  } catch (error) {
    functions.logger.error(
        "Error saat mengirim email:",
        error.response ? error.response.body : error,
    );
    throw new functions.https.HttpsError(
        "internal",
        "Gagal mengirim email.",
        error.response ? error.response.body : error.message,
    );
  }
});

/**
 * Fungsi callable HTTP untuk mengirim notifikasi push FCM.
 * Fungsi ini dapat dipanggil dari sisi klien.
 *
 * @param {object} data - Data permintaan: { userId, title, body, customData? }
 * @param {object} context - Konteks fungsi, berisi informasi autentikasi.
 * @returns {Promise<object>} - Hasil pengiriman notifikasi.
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  // Hanya pengguna yang terautentikasi yang bisa memanggil fungsi ini
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Fungsi ini harus dipanggil dalam kondisi terautentikasi.",
    );
  }

  const {userId, title, body, customData} = data;
  const db = admin.firestore(); // Dapatkan instance Firestore dari Admin SDK

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Parameter yang diperlukan (userId, title, atau body) tidak ada.",
    );
  }

  try {
    // Ambil semua token FCM untuk pengguna ini dari Firestore
    // Struktur koleksi disesuaikan dengan aturan keamanan baru Anda
    const userTokensSnapshot = await db
        .collection(
            `artifacts/${
              functions.config().firebase.project_id
            }/users/${userId}/fcmTokens`,
        )
        .get();

    const tokens = userTokensSnapshot.docs.map((doc) => doc.data().token);

    if (tokens.length === 0) {
      functions.logger.warn(`No FCM tokens for ${userId}. Notif skipped.`);
      return {
        success: false,
        message: "Tidak ada token ditemukan untuk pengguna.",
      };
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: customData || {}, // Payload data kustom opsional
    };

    const multicastMessage = {
      ...message,
      tokens: tokens,
    };

    // Kirim pesan ke semua token yang ditemukan
    const response = await admin.messaging().sendEachForMulticast(multicastMessage);

    functions.logger.info(`Sent ${response.successCount} notifs to ${userId}.`);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          functions.logger.error(
              `Failed to send to token ${tokens[idx]}: ${resp.error}`,
          );
          // Opsional: Hapus token yang tidak valid dari Firestore untuk membersihkan
          // Contoh: await userTokensSnapshot.docs[idx].ref.delete();
        }
      });
      functions.logger.warn(`Failed tokens: ${failedTokens}`);
    }

    return {
      success: true,
      message: "Notifikasi push berhasil dikirim!",
      successCount: response.successCount,
    };
  } catch (error) {
    functions.logger.error("Error sending notif:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Gagal mengirim notifikasi push.",
        error.message,
    );
  }
});