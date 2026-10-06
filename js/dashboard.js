import { startAnonymousAuth } from "./auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { db } from "./firebase.js";


const uidElement =
    document.getElementById("user-uid");

const statusElement =
    document.getElementById("auth-status");


startAnonymousAuth(async (user) => {

    console.log("LIFE DASHBOARD 起動");

    console.log("User UID:", user.uid);


    // UID表示
    uidElement.textContent =
        user.uid;


    // ONLINE表示
    statusElement.textContent =
        "ONLINE";


    try {

        // ユーザー情報をFirestoreに保存

        await setDoc(
            doc(
                db,
                "users",
                user.uid
            ),
            {
                createdAt: serverTimestamp(),

                lastLoginAt: serverTimestamp(),

                accountType: "anonymous"
            },
            {
                merge: true
            }
        );


        console.log(
            "Firestore接続成功"
        );


    } catch (error) {

        console.error(
            "Firestore接続失敗:",
            error
        );

    }

});
