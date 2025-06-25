const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getTasks = functions.https.onRequest(async (req, res) => {
  const snapshot = await db.collection("tasks").get();
  const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.status(200).json(tasks);
});

exports.addTask = functions.https.onRequest(async (req, res) => {
  const task = req.body;
  const newTask = await db.collection("tasks").add(task);
  res.status(201).json({ id: newTask.id, ...task });
});

exports.deleteTask = functions.https.onRequest(async (req, res) => {
  const { id } = req.query;
  await db.collection("tasks").doc(id).delete();
  res.status(200).json({ message: "Task deleted" });
});
