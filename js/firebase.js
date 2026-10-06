import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtplLFs8mB_5Oah_XuJn2fTBD1X2nl17A",
    authDomain: "life-dashboard-400ac.firebaseapp.com",
    projectId: "life-dashboard-400ac",
    storageBucket: "life-dashboard-400ac.firebasestorage.app",
    messagingSenderId: "1059261657396",
    appId: "1:1059261657396:web:1bb40cd42a99235d9f7561",
    measurementId: "G-0MWB2WF5PB"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
    app,
    auth,
    db,
    storage
};
